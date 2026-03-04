type LogArgs = unknown[];

const isDev = process.env.NODE_ENV !== 'production';

const devLog = (method: 'debug' | 'info' | 'warn' | 'error', ...args: LogArgs) => {
  if (!isDev || typeof console === 'undefined') {
    return;
  }
  console[method]('[tracking-frontend]', ...args);
};

export const logger = {
  debug: (...args: LogArgs) => devLog('debug', ...args),
  info: (...args: LogArgs) => devLog('info', ...args),
  warn: (...args: LogArgs) => devLog('warn', ...args),
  error: (...args: LogArgs) => devLog('error', ...args),
};
