import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as systemAdminController from '@/api/controllers/system-admin.controller';

const router = Router();

router.use(requireAuth);

router.get('/health', systemAdminController.getHealth);
router.get('/metrics', systemAdminController.queryMetrics);
router.get('/logs', systemAdminController.queryLogs);
router.get('/audit', systemAdminController.queryAudit);
router.get('/settings', systemAdminController.getSettings);
router.put('/settings/:key', systemAdminController.updateSetting);
router.get('/tables', systemAdminController.listTables);
router.get('/tables/:table', systemAdminController.queryTable);

export default router;
