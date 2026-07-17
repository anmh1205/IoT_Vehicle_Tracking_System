import { Router } from 'express';
import { requireAuth, requireAdminRole } from '@/middleware/auth.middleware';
import * as auditLogController from '@/api/controllers/audit-log.controller';

const router = Router();

// Audit log routes — require authentication + admin role
router.use(requireAuth);
router.use(requireAdminRole);

router.get('/', auditLogController.listAuditLogs);

export default router;
