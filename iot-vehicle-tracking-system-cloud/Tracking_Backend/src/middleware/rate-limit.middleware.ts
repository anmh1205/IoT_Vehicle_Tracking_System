import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute (test-friendly)
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
      status: 429,
    },
    timestamp: new Date().toISOString(),
  },
});

export const generalRateLimit = rateLimit({
  windowMs: 30 * 1000, // 30 seconds (test-friendly)
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      status: 429,
    },
    timestamp: new Date().toISOString(),
  },
});
