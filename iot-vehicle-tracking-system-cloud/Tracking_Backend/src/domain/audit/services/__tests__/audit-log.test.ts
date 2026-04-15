import type { AuditLog, RecordAuditInput, AuditLogListQuery } from '@/domain/audit/types/audit-log.types';

vi.mock('@/domain/audit/repositories/audit-log.repository');
vi.mock('@/infrastructure/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import * as auditLogRepo from '@/domain/audit/repositories/audit-log.repository';
import { record, listLogs } from '../audit-log.service';

// -- Factory ------------------------------------------------------------------

const NOW = new Date('2026-01-15T10:00:00.000Z');

const makeAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 1,
  user_id: 5,
  action: 'UPDATE',
  entity_type: 'vehicle',
  entity_id: 'VH-001',
  changes: { status: { old: 'active', new: 'inactive' } },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  created_at: NOW,
  ...overrides,
});

// -- Tests --------------------------------------------------------------------

describe('audit-log.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- record ----------------------------------------------------------------

  describe('record', () => {
    const input: RecordAuditInput = {
      userId: 5,
      action: 'UPDATE',
      entityType: 'vehicle',
      entityId: 'VH-001',
      changes: { status: { old: 'active', new: 'inactive' } },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should call auditLogRepo.create with correct params', async () => {
      vi.mocked(auditLogRepo.create).mockResolvedValue(makeAuditLog());

      await record(input);

      expect(auditLogRepo.create).toHaveBeenCalledWith(input);
    });

    it('should never throw even when repo.create fails (fire-and-forget)', async () => {
      vi.mocked(auditLogRepo.create).mockRejectedValue(new Error('DB connection failed'));

      // Should resolve without throwing
      await expect(record(input)).resolves.toBeUndefined();
    });

    it('should resolve void even on success', async () => {
      vi.mocked(auditLogRepo.create).mockResolvedValue(makeAuditLog());

      const result = await record(input);

      expect(result).toBeUndefined();
    });
  });

  // --- listLogs --------------------------------------------------------------

  describe('listLogs', () => {
    it('should return paginated results with sanitized output', async () => {
      const logs = [makeAuditLog(), makeAuditLog({ id: 2, entity_id: 'VH-002' })];
      vi.mocked(auditLogRepo.findAll).mockResolvedValue({ logs, total: 2 });

      const query: AuditLogListQuery = { page: 1, limit: 20 };
      const result = await listLogs(query);

      expect(auditLogRepo.findAll).toHaveBeenCalledWith(query);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.logs).toHaveLength(2);
    });

    it('should sanitize log fields to camelCase', async () => {
      vi.mocked(auditLogRepo.findAll).mockResolvedValue({
        logs: [makeAuditLog()],
        total: 1,
      });

      const result = await listLogs({});

      const log = result.logs[0];
      expect(log.id).toBe(1);
      expect(log.userId).toBe(5);
      expect(log.action).toBe('UPDATE');
      expect(log.entityType).toBe('vehicle');
      expect(log.entityId).toBe('VH-001');
      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.userAgent).toBe('Mozilla/5.0');
      expect(log.createdAt).toBe(NOW.toISOString());
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      vi.mocked(auditLogRepo.findAll).mockResolvedValue({ logs: [], total: 0 });

      const result = await listLogs({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should pass filters to repository', async () => {
      vi.mocked(auditLogRepo.findAll).mockResolvedValue({ logs: [], total: 0 });

      const query: AuditLogListQuery = {
        userId: 5,
        action: 'DELETE',
        entityType: 'driver',
        page: 2,
        limit: 10,
      };

      await listLogs(query);

      expect(auditLogRepo.findAll).toHaveBeenCalledWith(query);
    });

    it('should return empty logs array when no records found', async () => {
      vi.mocked(auditLogRepo.findAll).mockResolvedValue({ logs: [], total: 0 });

      const result = await listLogs({});

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle null optional fields gracefully', async () => {
      const logWithNulls = makeAuditLog({
        user_id: null,
        entity_id: null,
        changes: null,
        ip_address: null,
        user_agent: null,
      });
      vi.mocked(auditLogRepo.findAll).mockResolvedValue({ logs: [logWithNulls], total: 1 });

      const result = await listLogs({});

      const log = result.logs[0];
      expect(log.userId).toBeNull();
      expect(log.entityId).toBeNull();
      expect(log.changes).toBeNull();
      expect(log.ipAddress).toBeNull();
      expect(log.userAgent).toBeNull();
    });
  });
});
