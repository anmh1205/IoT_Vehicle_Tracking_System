import mqtt, { type IClientPublishOptions } from 'mqtt';

import { firmwareConfig, mqttConfig } from '@/config/env';
import * as deviceCommandRepo from '@/domain/device/repositories/device-command.repository';
import { createMqttClientId } from '@/infrastructure/mqtt-client-id.util';
import { createLogger } from '@/infrastructure/logger';
import { createConflictError } from '@/shared/utils/errors.util';

const logger = createLogger('device-command-service');

let mqttClient: mqtt.MqttClient | null = null;
let recoveryTimer: NodeJS.Timeout | null = null;
let recoveryCutoff: Date | null = null;
let recoveryPromise: Promise<void> | null = null;

const RECOVERY_INTERVAL_MS = 30_000;
const RECOVERY_BATCH_LIMIT = 100;
const REQUEST_LOCATION_EXPIRY_SECONDS = 120;
const REBOOT_EXPIRY_SECONDS = 300;

const getCommandExpirySeconds = (command: string): number | undefined => {
  switch (command) {
    case 'request_location':
      return REQUEST_LOCATION_EXPIRY_SECONDS;
    case 'reboot':
      return REBOOT_EXPIRY_SECONDS;
    case 'ota_update':
    case 'manual_rollback':
    case 'ota_rollback':
      return Math.max(firmwareConfig.assignedTimeoutSec, 1);
    default:
      // update_config / enable_tracking are desired-state operations; session
      // assignment is identity-bound and independently rejected when stale.
      return undefined;
  }
};

const getRemainingCommandExpirySeconds = (
  command: deviceCommandRepo.PendingDeviceCommandRecord,
  nowMs = Date.now(),
): number | undefined => {
  const expirySeconds = getCommandExpirySeconds(command.command);
  if (expirySeconds === undefined) {
    return undefined;
  }

  const createdAtMs = Date.parse(command.createdAt);
  if (!Number.isFinite(createdAtMs)) {
    return expirySeconds;
  }

  const elapsedMs = Math.max(nowMs - createdAtMs, 0);
  const remainingMs = expirySeconds * 1000 - elapsedMs;
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(remainingMs / 1000));
};

const publishCommandRecord = async (
  client: mqtt.MqttClient,
  command: deviceCommandRepo.DeviceCommandRecord,
  expirySeconds = getCommandExpirySeconds(command.command),
): Promise<void> => {
  const topic = `v1/${command.deviceId}/commands`;
  const message = JSON.stringify({
    command_id: String(command.id),
    command: command.command,
    params: command.params ?? {},
  });

  const publishOptions: IClientPublishOptions = { qos: 1, retain: false };
  if (expirySeconds !== undefined) {
    publishOptions.properties = {
      messageExpiryInterval: expirySeconds,
    };
  }

  await new Promise<void>((resolve, reject) => {
    client.publish(topic, message, publishOptions, (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

const recoverPendingCommandsWithClient = async (client: mqtt.MqttClient): Promise<void> => {
  if (!recoveryCutoff || !client.connected) {
    return;
  }

  const pending = await deviceCommandRepo.listPendingCommandsBefore(
    recoveryCutoff,
    RECOVERY_BATCH_LIMIT,
  );

  for (const command of pending) {
    const remainingExpirySeconds = getRemainingCommandExpirySeconds(command);
    if (remainingExpirySeconds === 0) {
      const expired = await deviceCommandRepo.failPendingCommandBeforeDispatch(
        command.id,
        'command_expired_before_dispatch',
      );
      if (expired) {
        logger.warn('Expired pending device command without replaying stale intent', {
          commandId: command.id,
          deviceId: command.deviceId,
          command: command.command,
        });
      }
      continue;
    }

    try {
      await publishCommandRecord(client, command, remainingExpirySeconds);
      await deviceCommandRepo.updateCommandStatus(command.id, 'sent');
      logger.info('Recovered pending device command after backend restart', {
        commandId: command.id,
        deviceId: command.deviceId,
      });
    } catch (error) {
      logger.warn('Pending device command recovery publish failed; keeping row pending', {
        commandId: command.id,
        deviceId: command.deviceId,
        error: error instanceof Error ? error.message : String(error),
      });
      // A transport-wide failure will usually affect later rows too. Stop this
      // bounded pass and retry on the next connect/interval tick.
      break;
    }
  }
};

const runPendingCommandRecovery = (client: mqtt.MqttClient): Promise<void> => {
  if (recoveryPromise) {
    return recoveryPromise;
  }
  recoveryPromise = recoverPendingCommandsWithClient(client).finally(() => {
    recoveryPromise = null;
  });
  return recoveryPromise;
};

const getMqttClient = (): mqtt.MqttClient => {
  if (mqttClient) {
    return mqttClient;
  }

  const protocol = mqttConfig.useTls ? 'mqtts' : 'mqtt';
  const port = mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port;
  const brokerUrl = `${protocol}://${mqttConfig.host}:${port}`;

  mqttClient = mqtt.connect(brokerUrl, {
    username: mqttConfig.username,
    password: mqttConfig.password,
    clientId: createMqttClientId('backend-device-command'),
    reconnectPeriod: 5000,
    clean: true,
    protocolVersion: 5,
    rejectUnauthorized: mqttConfig.rejectUnauthorized,
  });

  mqttClient.on('connect', () => {
    logger.info(`Connected to MQTT broker for device commands at ${brokerUrl}`);
    void runPendingCommandRecovery(mqttClient!).catch((error) => {
      logger.error('Pending device command recovery failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  mqttClient.on('error', (err) => {
    logger.error(`MQTT device command client error: ${err.message}`);
  });

  mqttClient.on('close', () => {
    logger.warn('MQTT device command client disconnected, reconnecting...');
  });

  return mqttClient;
};

export const sendCommand = async (
  deviceId: string,
  payload: { command: string; params?: Record<string, unknown> },
  options?: { actorUserId?: number; correlationId?: string },
): Promise<deviceCommandRepo.DeviceCommandRecord> => {
  const command = await deviceCommandRepo.createCommand({
    deviceId,
    command: payload.command,
    params: payload.params ?? {},
    actorUserId: options?.actorUserId,
    correlationId: options?.correlationId,
  });

  if (!command) {
    throw createConflictError(
      `Device "${deviceId}" already has ${deviceCommandRepo.MAX_OUTSTANDING_DEVICE_COMMANDS} non-terminal commands; wait for ACKs before sending more`,
    );
  }

  const client = getMqttClient();

  try {
    await publishCommandRecord(client, command);

    return (
      (await deviceCommandRepo.updateCommandStatus(command.id, 'sent')) ?? {
        ...command,
        status: 'sent',
      }
    );
  } catch (error) {
    const response = error instanceof Error ? error.message : 'publish_failed';
    await deviceCommandRepo.updateCommandStatus(command.id, 'failed', response);
    throw error;
  }
};

export const initDeviceCommandDispatcher = (): void => {
  if (recoveryCutoff) {
    return;
  }

  recoveryCutoff = new Date();
  const client = getMqttClient();
  recoveryTimer = setInterval(() => {
    void runPendingCommandRecovery(client).catch((error) => {
      logger.error('Periodic pending device command recovery failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, RECOVERY_INTERVAL_MS);
  recoveryTimer.unref?.();
};

export const closeDeviceCommandDispatcher = async (): Promise<void> => {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
  }

  const inFlight = recoveryPromise;
  if (inFlight) {
    try {
      await inFlight;
    } catch {
      // Shutdown must continue even when the final recovery pass failed.
    }
  }

  const client = mqttClient;
  mqttClient = null;
  recoveryCutoff = null;
  recoveryPromise = null;
  if (!client) {
    return;
  }

  await new Promise<void>((resolve) => {
    client.end(false, {}, () => resolve());
  });
};

export const listCommands = async (deviceId: string, page = 1, limit = 20) => {
  return deviceCommandRepo.listDeviceCommands(deviceId, page, limit);
};
