import type { SessionUser } from '@/shared/types/common.types';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      correlationId?: string;
    }
  }
}
