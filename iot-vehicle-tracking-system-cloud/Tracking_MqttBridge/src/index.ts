import { connectMqtt, disconnectMqtt, getClient } from './mqtt/client';
import { subscribeToDeviceTopics } from './mqtt/subscriptions';
import { handleRawData } from './handlers/rawdata.handler';
import { handleStatus } from './handlers/status.handler';
import { handleEvent } from './handlers/event.handler';
import { handleFirmware } from './handlers/firmware.handler';
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

/**
 * Route incoming MQTT messages to the appropriate handler based on topic suffix.
 */
const routeMessage = (topic: string, message: Buffer): void => {
  const deviceId = extractDeviceId(topic);
  if (!deviceId) {
    logger.warn({ topic }, 'Cannot extract deviceId from topic');
    return;
  }

  const suffix = topic.split('/').slice(2).join('/');

  switch (suffix) {
    case 'rawdata':
      handleRawData(deviceId, message).catch((err) => {
        logger.error({ err, deviceId }, 'Unhandled error in rawdata handler');
      });
      break;
    case 'status':
      handleStatus(deviceId, message).catch((err) => {
        logger.error({ err, deviceId }, 'Unhandled error in status handler');
      });
      break;
    case 'events':
      handleEvent(deviceId, message).catch((err) => {
        logger.error({ err, deviceId }, 'Unhandled error in event handler');
      });
      break;
    case 'firmware':
      handleFirmware(deviceId, message).catch((err) => {
        logger.error({ err, deviceId }, 'Unhandled error in firmware handler');
      });
      break;
    default:
      logger.debug({ suffix, topic }, 'Unhandled topic suffix');
  }
};

/**
 * Bootstrap the MQTT Bridge service.
 */
const main = async (): Promise<void> => {
  logger.info('Starting MQTT Bridge service...');

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

  logger.info('MQTT Bridge service started successfully');
};

/**
 * Graceful shutdown: disconnect MQTT, flush batches, close DB pool.
 */
const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Shutting down gracefully...');
  bridgeHealthState.shuttingDown = true;
  bridgeHealthState.subscriptionsReady = false;

  try {
    await disconnectMqtt();
    logger.info('MQTT disconnected');
  } catch (err) {
    logger.error({ err }, 'Error disconnecting MQTT');
  }

  try {
    await stopBatchWriter();
    logger.info('Batch writer flushed and stopped');
  } catch (err) {
    logger.error({ err }, 'Error stopping batch writer');
  }

  try {
    await closePool();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error({ err }, 'Error closing database pool');
  }

  try {
    await stopBridgeHealthServer();
  } catch (err) {
    logger.error({ err }, 'Error stopping bridge health server');
  }

  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

main().catch((err) => {
  bridgeHealthState.lastError = err instanceof Error ? err.message : 'Failed to start MQTT Bridge';
  logger.error({ err }, 'Failed to start MQTT Bridge');
  process.exit(1);
});
