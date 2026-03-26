import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createApiError, createNotFoundError, createValidationError } from '@/shared/utils/errors.util';

vi.mock('@/infrastructure/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { errorHandler } from '../error-handler.middleware';

// -- Helpers ------------------------------------------------------------------

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
  return { status, json, _json: json } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    _json: ReturnType<typeof vi.fn>;
  };
};

const makeNext = (): NextFunction => vi.fn();

// -- Tests --------------------------------------------------------------------

describe('error-handler.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- ApiError responses ----------------------------------------------------

  describe('ApiError handling', () => {
    it('should respond with correct status and error fields for ApiError', () => {
      const req = makeReq({ correlationId: 'trace-abc' });
      const res = makeRes();
      const err = createApiError(422, 'Invalid payload', { code: 'INVALID_PAYLOAD', field: 'email' });

      errorHandler(err, req, res as unknown as Response, makeNext());

      expect(res.status).toHaveBeenCalledWith(422);
      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_PAYLOAD');
      expect(body.error.message).toBe('Invalid payload');
      expect(body.error.status).toBe(422);
      expect(body.error.path).toBe('/api/test');
      expect(body.error.traceId).toBe('trace-abc');
    });

    it('should include traceId matching req.correlationId in ApiError response', () => {
      const req = makeReq({ correlationId: 'corr-xyz' });
      const res = makeRes();

      errorHandler(createNotFoundError('Resource not found'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.error.traceId).toBe('corr-xyz');
    });

    it('should use "unknown" as traceId when correlationId is absent', () => {
      const req = makeReq({ correlationId: undefined });
      const res = makeRes();

      errorHandler(createValidationError('Bad input'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.error.traceId).toBe('unknown');
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

    it('should include details in ApiError response body', () => {
      const req = makeReq();
      const res = makeRes();
      const err = createApiError(409, 'Conflict', { code: 'CONFLICT', duplicate: 'email' });

      errorHandler(err, req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.error.details).toMatchObject({ code: 'CONFLICT', duplicate: 'email' });
    });

    it('should fallback code to "ERROR" when details.code is absent', () => {
      const req = makeReq();
      const res = makeRes();
      const err = createApiError(500, 'Oops');

      errorHandler(err, req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.error.code).toBe('ERROR');
    });
  });

  // --- Unhandled error responses --------------------------------------------

  describe('unhandled error handling', () => {
    it('should respond 500 for generic Error', () => {
      const req = makeReq({ correlationId: 'trace-500' });
      const res = makeRes();

      errorHandler(new Error('Something crashed'), req, res as unknown as Response, makeNext());

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should include traceId in unhandled error response', () => {
      const req = makeReq({ correlationId: 'trace-err' });
      const res = makeRes();

      errorHandler(new Error('Boom'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.error.traceId).toBe('trace-err');
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('An unexpected error occurred');
      expect(body.success).toBe(false);
    });

    it('should include path in unhandled error response', () => {
      const req = makeReq({ path: '/api/vehicles' });
      const res = makeRes();

      errorHandler(new Error('Unexpected'), req, res as unknown as Response, makeNext());

      const body = (res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json.mock.calls[0][0];
      expect(body.error.path).toBe('/api/vehicles');
    });
  });
});
