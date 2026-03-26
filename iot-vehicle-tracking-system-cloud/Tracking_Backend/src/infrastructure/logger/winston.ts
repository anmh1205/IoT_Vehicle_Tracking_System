import winston from 'winston';
import { appConfig } from '@/config/env';
import { createVictoriaLogsTransport } from './victorialogs-transport';
import { victoriaLogsConfig, observabilityConfig } from '@/config/env';

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const devFormat = combine(
  timestamp({ format: 'HH:mm:ss.SSS' }),
  errors({ stack: true }),
  colorize(),
  simple(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: appConfig.isProduction ? prodFormat : devFormat,
  }),
];

// Add VictoriaLogs transport when URL is configured
if (victoriaLogsConfig.url) {
  transports.push(
    createVictoriaLogsTransport({
      url: victoriaLogsConfig.url,
      batchSize: 100,
      flushIntervalMs: 5000,
      maxBufferSize: 10_000,
    }),
  );
}

const rootLogger = winston.createLogger({
  level: observabilityConfig.logLevel,
  defaultMeta: { service: 'tracking-backend' },
  transports,
});

/** Create a child logger with a context label */
export const createLogger = (context: string): winston.Logger => rootLogger.child({ context });

/** Default logger (backward-compatible with existing `logger` usage) */
export const logger = rootLogger;
