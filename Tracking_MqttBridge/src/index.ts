import { connectMqtt, disconnectMqtt } from './mqtt/client';
import { subscribeToDeviceTopics } from './mqtt/subscriptions';
import { handleRawData } from './handlers/rawdata.handler';
import { handleStatus } from './handlers/status.handler';
import { handleEvent } from './handlers/event.handler';
import { handleFirmware } from './handlers/firmware.handler';
import { startBatchWriter, stopBatchWriter } from './services/batch-writer.service';
import { closePool } from './infrastructure/database';
import { logger } from './infrastructure/logger';

// Ensure env is loaded
import './config/env';

/**
 * Extract deviceId from a topic string like "v1/{deviceId}/rawdata".
 */
function extractDeviceId(topic: string): string | null {
  const parts = topic.split('/');
  if (parts.length < 3 || parts[0] !== 'v1') return null;
  return parts[1] ?? null;
}

/**
 * Route incoming MQTT messages to the appropriate handler based on topic suffix.
 */
function routeMessage(topic: string, message: Buffer): void {
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
}

/**
 * Bootstrap the MQTT Bridge service.
 */
async function main(): Promise<void> {
  logger.info('Starting MQTT Bridge service...');

  startBatchWriter();

  const client = await connectMqtt();

  await subscribeToDeviceTopics(client);

  client.on('message', (topic, message) => {
    routeMessage(topic, message);
  });

  logger.info('MQTT Bridge service started successfully');
}

/**
 * Graceful shutdown: disconnect MQTT, flush batches, close DB pool.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down gracefully...');

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

  logger.info('Shutdown complete');
  process.exit(0);
}

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
  logger.error({ err }, 'Failed to start MQTT Bridge');
  process.exit(1);
});
