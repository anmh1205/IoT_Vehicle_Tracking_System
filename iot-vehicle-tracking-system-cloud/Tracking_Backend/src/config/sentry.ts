import * as Sentry from '@sentry/node';
import { appConfig, observabilityConfig } from '@/config/env';

let sentryInitialized = false;

/**
 * Initialize Sentry error tracking.
 * Gracefully skips if no SENTRY_DSN is configured.
 */
export const initSentry = (): void => {
  if (!observabilityConfig.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: observabilityConfig.sentryDsn,
    environment: appConfig.nodeEnv,
    tracesSampleRate: appConfig.isProduction ? 0.1 : 1.0,
    enabled: true,
  });

  sentryInitialized = true;
};

export const isSentryInitialized = (): boolean => sentryInitialized;

export { Sentry };
