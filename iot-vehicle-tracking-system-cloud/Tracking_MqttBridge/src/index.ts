import { connectMqtt, disconnectMqtt, getClient } from './mqtt/client';
import { subscribeToDeviceTopics } from './mqtt/subscriptions';
import { installBridgeIngress } from './mqtt/ingress';
import { handleRawData } from './handlers/rawdata.handler';
import { handleStatus } from './handlers/status.handler';
import { handleEvent } from './handlers/event.handler';
import { handleFirmware } from './handlers/firmware.handler';
import { publishInternalEventDurable } from './publishers/internal-event.publisher';
import { startBatchWriter, stopBatchWriter } from './services/batch-writer.service';
import { startBridgeHealthServer, stopBridgeHealthServer } from './services/bridge-health.service';
import { closePool } from './infrastructure/database';
import { logger } from './infrastructure/logger';
import { appConfig } from './config/env';

// Ensure env is loaded
import './config/env';

const bridgeHealthState = {
  startedAt: new Date().toISOString(),
  subscriptionsReady: false,
  shuttingDown: false,
  lastMessageAt: undefined as string | undefined,
  lastError: undefined as string | undefined,
};

const getBridgeHealthSnapshot = () => {
  const mqttConnected = Boolean(getClient()?.connected);

  return {
    status:
      bridgeHealthState.shuttingDown
        ? 'down'
        : mqttConnected && bridgeHealthState.subscriptionsReady
          ? 'ok'
          : 'degraded',
    startedAt: bridgeHealthState.startedAt,
    shuttingDown: bridgeHealthState.shuttingDown,
    mqttConnected,
    subscriptionsReady: bridgeHealthState.subscriptionsReady,
    lastMessageAt: bridgeHealthState.lastMessageAt,
    lastError: bridgeHealthState.lastError,
  } as const;
};

/**
 * Extract deviceId from a topic string like "v1/{deviceId}/rawdata".
 */
const extractDeviceId = (topic: string): string | null => {
  const parts = topic.split('/');
  if (parts.length < 3 || parts[0] !== 'v1') return null;
  return parts[1] ?? null;
};

const handleCommandAck = async (deviceId: string, message: Buffer): Promise<void> => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(message.toString()) as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err, deviceId, event: 'command_ack_invalid_json' }, 'Invalid command ack payload');
    return;
  }

  const commandId = parsed.command_id ?? parsed.commandId;
  if (!commandId) {
    logger.warn({ deviceId, event: 'command_ack_missing_command_id' }, 'Command ack missing command id');
    return;
  }

  const status = String(parsed.status ?? '').trim().toLowerCase();
  if (!['accepted', 'acknowledged', 'failed'].includes(status)) {
    logger.warn(
      { deviceId, commandId: String(commandId), status, event: 'command_ack_invalid_status' },
      'Command ack has invalid status',
    );
    return;
  }

  await publishInternalEventDurable('command', {
    device_id: deviceId,
    command_id: String(commandId),
    status,
    response: parsed.response ?? parsed.error ?? null,
    boot_id: parsed.boot_id == null ? undefined : String(parsed.boot_id),
  });
};

/**
 * Route incoming MQTT messages to the appropriate handler based on topic suffix.
 */
const routeMessage = async (topic: string, message: Buffer): Promise<void> => {
  const deviceId = extractDeviceId(topic);
  if (!deviceId) {
    logger.warn({ topic, event: 'mqtt_topic_device_unresolved' }, 'MQTT topic device id unresolved');
    return;
  }

  const suffix = topic.split('/').slice(2).join('/');

  switch (suffix) {
    case 'rawdata':
      await handleRawData(deviceId, message);
      return;
    case 'status':
      await handleStatus(deviceId, message);
      return;
    case 'events':
      await handleEvent(deviceId, message);
      return;
    case 'firmware':
      await handleFirmware(deviceId, message);
      return;
    case 'commands/ack':
      await handleCommandAck(deviceId, message);
      return;
    default:
      logger.debug({ suffix, topic, event: 'mqtt_topic_suffix_unhandled' }, 'MQTT topic suffix ignored');
  }
};

/**
 * Bootstrap the MQTT Bridge service.
 */
const main = async (): Promise<void> => {
  logger.info({ event: 'bridge_starting', healthPort: appConfig.healthPort }, 'MQTT bridge starting');

  startBatchWriter();
  await startBridgeHealthServer({
    port: appConfig.healthPort,
    getSnapshot: getBridgeHealthSnapshot,
  });

  // The MQTT connection may deliver queued QoS1 packets as soon as the
  // persistent session is resumed. Register app processing before that point.
  const client = await connectMqtt((createdClient) => {
    installBridgeIngress(createdClient, routeMessage, {
      onReceived: () => {
        bridgeHealthState.lastMessageAt = new Date().toISOString();
      },
      onError: (err, topic, qos, packetId) => {
        bridgeHealthState.lastError = err instanceof Error ? err.message : String(err);
        logger.error(
          { err, topic, qos, packetId, event: 'mqtt_handler_failed' },
          'MQTT device message processing failed',
        );
      },
    });
  });

  await subscribeToDeviceTopics(client);
  bridgeHealthState.subscriptionsReady = true;
  bridgeHealthState.lastError = undefined;

  logger.info({ event: 'bridge_started' }, 'MQTT bridge started');
};

/**
 * Graceful shutdown: disconnect MQTT, flush batches, close DB pool.
 */
const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal, event: 'bridge_shutdown_started' }, 'MQTT bridge shutdown started');
  bridgeHealthState.shuttingDown = true;
  bridgeHealthState.subscriptionsReady = false;

  try {
    await disconnectMqtt();
  } catch (err) {
    logger.error({ err, event: 'bridge_shutdown_mqtt_disconnect_failed' }, 'MQTT disconnect failed during shutdown');
  }

  try {
    await stopBatchWriter();
  } catch (err) {
    logger.error({ err, event: 'bridge_shutdown_batch_writer_failed' }, 'Batch writer stop failed during shutdown');
  }

  try {
    await closePool();
  } catch (err) {
    logger.error({ err, event: 'bridge_shutdown_database_close_failed' }, 'Database pool close failed during shutdown');
  }

  try {
    await stopBridgeHealthServer();
  } catch (err) {
    logger.error({ err, event: 'bridge_shutdown_health_server_failed' }, 'Bridge health server stop failed');
  }

  logger.info({ event: 'bridge_shutdown_completed' }, 'MQTT bridge shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error({ err, event: 'process_uncaught_exception' }, 'Uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason, event: 'process_unhandled_rejection' }, 'Unhandled rejection');
});

main().catch((err) => {
  bridgeHealthState.lastError = err instanceof Error ? err.message : 'Failed to start MQTT Bridge';
  logger.error({ err, event: 'bridge_start_failed' }, 'MQTT bridge start failed');
  process.exit(1);
});
