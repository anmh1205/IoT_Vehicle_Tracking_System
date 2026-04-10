import type { Request, Response, NextFunction } from 'express';
import { createApiError, createNotFoundError, createValidationError } from '@/shared/utils/errors.util';

vi.mock('@/infrastructure/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { errorHandler } from '../error-handler.middleware';

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({
    path: '/api/test',
    method: 'GET',
    correlationId: 'trace-123',
    ...overrides,
  }) as unknown as Request;

const makeRes = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const type = vi.fn().mockReturnValue({ status, json });

  return { status, json, type } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    type: ReturnType<typeof vi.fn>;
  };
};

const makeNext = (): NextFunction => vi.fn();

describe('error-handler.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ApiError handling', () => {
    it('should respond with RFC7807 fields for ApiError', () => {
      const req = makeReq({ correlationId: 'trace-abc' });
      const res = makeRes();
      const err = createApiError(422, 'Invalid payload', { code: 'INVALID_PAYLOAD' });

      errorHandler(err, req, res as unknown as Response, makeNext());

      expect(res.type).toHaveBeenCalledWith('application/problem+json');
      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.code).toBe('INVALID_PAYLOAD');
      expect(body.detail).toBe('Invalid payload');
      expect(body.status).toBe(422);
      expect(body.requestId).toBe('trace-abc');
      expect(body.instance).toBe('/api/test#trace-abc');
    });

    it('should include requestId matching req.correlationId', () => {
      const req = makeReq({ correlationId: 'corr-xyz' });
      const res = makeRes();

      errorHandler(createNotFoundError('Resource not found'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.requestId).toBe('corr-xyz');
    });

    it('should use unknown as requestId when correlationId is absent', () => {
      const req = makeReq({ correlationId: undefined });
      const res = makeRes();

      errorHandler(createValidationError('Bad input'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.requestId).toBe('unknown');
    });

    it('should respond 404 for createNotFoundError', () => {
      const req = makeReq();
      const res = makeRes();

      errorHandler(createNotFoundError('Not found'), req, res as unknown as Response, makeNext());

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should respond 400 for createValidationError', () => {
      const req = makeReq();
      const res = makeRes();

      errorHandler(createValidationError('Missing field'), req, res as unknown as Response, makeNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should include validation errors in response body when available', () => {
      const req = makeReq();
      const res = makeRes();
      const err = createApiError(400, 'Validation failed', {
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'email', message: 'Invalid', code: 'VALIDATION_ERROR' }],
      });

      errorHandler(err, req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.errors).toMatchObject([{ field: 'email', message: 'Invalid', code: 'VALIDATION_ERROR' }]);
    });

    it('should fallback code to ERROR when details.code is absent', () => {
      const req = makeReq();
      const res = makeRes();
      const err = createApiError(422, 'Oops');

      errorHandler(err, req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.code).toBe('ERROR');
    });
  });

  describe('unhandled error handling', () => {
    it('should respond 500 for generic Error', () => {
      const req = makeReq({ correlationId: 'trace-500' });
      const res = makeRes();

      errorHandler(new Error('Something crashed'), req, res as unknown as Response, makeNext());

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should include requestId in unhandled error response', () => {
      const req = makeReq({ correlationId: 'trace-err' });
      const res = makeRes();

      errorHandler(new Error('Boom'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.requestId).toBe('trace-err');
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.detail).toBe('An unexpected error occurred');
    });

    it('should include instance with request path for unhandled error', () => {
      const req = makeReq({ path: '/api/vehicles' });
      const res = makeRes();

      errorHandler(new Error('Unexpected'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.instance).toBe('/api/vehicles#trace-123');
    });
  });
});
