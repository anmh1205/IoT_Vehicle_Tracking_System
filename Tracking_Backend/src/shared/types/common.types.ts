import type { Request } from 'express';

export interface SessionUser {
  id: number;
  username: string;
  role: string;
  deviceAccessMode: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  correlationId?: string;
}
