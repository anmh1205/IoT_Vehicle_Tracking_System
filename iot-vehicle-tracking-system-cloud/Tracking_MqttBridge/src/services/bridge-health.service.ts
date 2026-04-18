import { createServer, type Server } from 'node:http';
import type { ServerResponse } from 'node:http';
import { logger } from '../infrastructure/logger';

export interface BridgeHealthSnapshot {
  status: 'ok' | 'degraded' | 'down';
  startedAt: string;
  shuttingDown: boolean;
  mqttConnected: boolean;
  subscriptionsReady: boolean;
  lastMessageAt?: string;
  lastError?: string;
}

interface StartBridgeHealthServerOptions {
  port: number;
  getSnapshot: () => BridgeHealthSnapshot;
}

let server: Server | null = null;

const writeJson = (
  res: ServerResponse,
  statusCode: number,
  body: BridgeHealthSnapshot & { uptimeSec: number },
) => {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

export const startBridgeHealthServer = async ({
  port,
  getSnapshot,
}: StartBridgeHealthServerOptions): Promise<void> => {
  if (server) {
    return;
  }

  server = createServer((req, res) => {
    const snapshot = getSnapshot();
    const startedAtMs = Date.parse(snapshot.startedAt);
    const uptimeSec = Number.isFinite(startedAtMs)
      ? Math.max(0, Math.round((Date.now() - startedAtMs) / 1000))
      : 0;
    const body = { ...snapshot, uptimeSec };

    if (req.url === '/health') {
      writeJson(res, 200, body);
      return;
    }

    if (req.url === '/ready') {
      writeJson(res, snapshot.status === 'ok' ? 200 : 503, body);
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(port, '0.0.0.0', () => resolve());
  });

  logger.info({ port }, 'Bridge health server listening');
};

export const stopBridgeHealthServer = async (): Promise<void> => {
  if (!server) {
    return;
  }

  const currentServer = server;
  server = null;

  await new Promise<void>((resolve, reject) => {
    currentServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  logger.info('Bridge health server stopped');
};
