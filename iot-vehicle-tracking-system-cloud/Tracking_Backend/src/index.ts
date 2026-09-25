import { initSentry } from '@/config/sentry';

// Initialize Sentry BEFORE Express app creation (no-op if no DSN)
initSentry();

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { appConfig, corsConfig } from '@/config/env';
import { requestId } from '@/middleware/request-id.middleware';
import { generalRateLimit } from '@/middleware/rate-limit.middleware';
import { httpMetricsMiddleware } from '@/middleware/metrics.middleware';
import { sentryRequestHandler, sentryErrorHandler } from '@/middleware/sentry.middleware';
import { errorHandler } from '@/middleware/error-handler.middleware';
import swaggerUi from 'swagger-ui-express';
import { spec } from '@/api/openapi/spec';
import routes from '@/api/routes';
import healthRoutes from '@/api/routes/health.routes';
import metricsRoutes from '@/api/routes/metrics.routes';
import { logger } from '@/infrastructure/logger';
import { closePool } from '@/infrastructure/database/pool';
import {
  initDeviceCommandDispatcher,
  closeDeviceCommandDispatcher,
} from '@/domain/device/services/device-command.service';
import {
  registerRealtime,
  closeSocketServer,
  getRealtimeHealthSnapshot,
  initMqttEventListener,
  closeMqttEventListener,
} from '@/infrastructure/realtime';

const app = express();

const shouldSkipCompression = (req: express.Request): boolean => {
  const path = req.path.toLowerCase();
  const isFirmwareDownload = /\/firmware\/\d+\/download$/u.test(path);
  const encoding =
    typeof req.query?.encoding === 'string' ? String(req.query.encoding).trim().toLowerCase() : '';
  return isFirmwareDownload && encoding === 'hex';
};

// 1. Sentry request handler (FIRST middleware — captures request context)
app.use(sentryRequestHandler);

// 2. Trust the first reverse proxy in production (NPM on UAT).
if (appConfig.isProduction) {
  app.set('trust proxy', 1);
}

// 3. Security headers
app.use(helmet());

// 4. Compression
app.use(
  compression({
    filter: (req, res) => {
      if (shouldSkipCompression(req)) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

// 5. CORS
app.use(
  cors({
    origin: corsConfig.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }),
);

// 5. Body parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 6. Request ID
app.use(requestId);

// 7. Prometheus metrics collection
app.use(httpMetricsMiddleware);

// 8. General rate limiting
app.use(generalRateLimit);

// 9. Health check endpoints (no auth required)
app.use('/health', healthRoutes);

// 9b. WebSocket health endpoint
app.get('/ws-health', (_req, res) => {
  res.json(getRealtimeHealthSnapshot());
});

// 10. Metrics endpoint (optional basic auth)
app.use('/metrics', metricsRoutes);

// 11. Swagger API docs (no auth required)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

// 12. API routes (v1 is canonical, /api kept as compatibility alias)
app.use('/api/v1', routes);
app.use('/api', routes);

// 12. Sentry error handler (BEFORE main error handler)
app.use(sentryErrorHandler);

// 13. Error handler (LAST)
app.use(errorHandler);

// Start the durable device-command dispatcher before accepting API traffic.
initDeviceCommandDispatcher();

// Start server
const server = app.listen(appConfig.port, () => {
  logger.info(`Server started on port ${appConfig.port} (${appConfig.nodeEnv})`);
});

// 14. Attach WebSocket server to HTTP server
registerRealtime(server);

// 15. Start MQTT event listener (bridges MqttBridge internal events → Event Bus → Socket.IO)
initMqttEventListener();

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await closeMqttEventListener();
    logger.info('MQTT event listener closed');
    await closeDeviceCommandDispatcher();
    logger.info('MQTT device command dispatcher closed');
    await closeSocketServer();
    logger.info('WebSocket server closed');
    await closePool();
    logger.info('Database pool closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
