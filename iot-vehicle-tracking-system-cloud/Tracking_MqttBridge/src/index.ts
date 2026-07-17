import { connectMqtt, disconnectMqtt, getClient } from './mqtt/client';
import { subscribeToDeviceTopics } from './mqtt/subscriptions';
import { handleRawData } from './handlers/rawdata.handler';
import { handleStatus } from './handlers/status.handler';
import { handleEvent } from './handlers/event.handler';
import { handleFirmware } from './handlers/firmware.handler';
import { publishInternalEvent } from './publishers/internal-event.publisher';
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

const handleCommandAck = (deviceId: string, message: Buffer): void => {
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

  publishInternalEvent('command', {
    device_id: deviceId,
    command_id: String(commandId),
    status: String(parsed.status ?? 'acknowledged'),
    response: parsed.response ?? parsed.error ?? null,
  });
};

/**
 * Route incoming MQTT messages to the appropriate handler based on topic suffix.
 */
const routeMessage = (topic: string, message: Buffer): void => {
  const deviceId = extractDeviceId(topic);
  if (!deviceId) {
    logger.warn({ topic, event: 'mqtt_topic_device_unresolved' }, 'MQTT topic device id unresolved');
    return;
  }

  const suffix = topic.split('/').slice(2).join('/');

  switch (suffix) {
    case 'rawdata':
      handleRawData(deviceId, message).catch((err) => {
        logger.error({ err, deviceId, event: 'rawdata_handler_failed' }, 'Rawdata handler failed');
      });
      break;
    case 'status':
      handleStatus(deviceId, message).catch((err) => {
        logger.error({ err, deviceId, event: 'status_handler_failed' }, 'Status handler failed');
      });
      break;
    case 'events':
      handleEvent(deviceId, message).catch((err) => {
        logger.error({ err, deviceId, event: 'event_handler_failed' }, 'Event handler failed');
      });
      break;
    case 'firmware':
      handleFirmware(deviceId, message).catch((err) => {
        logger.error({ err, deviceId, event: 'firmware_handler_failed' }, 'Firmware handler failed');
      });
      break;
    case 'commands/ack':
      handleCommandAck(deviceId, message);
      break;
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

  const client = await connectMqtt();

  await subscribeToDeviceTopics(client);
  bridgeHealthState.subscriptionsReady = true;
  bridgeHealthState.lastError = undefined;

  client.on('message', (topic, message) => {
    bridgeHealthState.lastMessageAt = new Date().toISOString();
    routeMessage(topic, message);
  });

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
