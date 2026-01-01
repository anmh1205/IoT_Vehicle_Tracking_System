import { Logger } from '@nestjs/common';

/**
 * Create a logger instance for a specific context
 * Usage: private readonly logger = createLogger(YourService.name);
 */
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

