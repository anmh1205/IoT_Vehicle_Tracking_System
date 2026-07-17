import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as systemAdminController from '@/api/controllers/system-admin.controller';

const router = Router();

router.use(requireAuth);

router.get('/health', systemAdminController.getHealth);
router.get('/metrics', systemAdminController.queryMetrics);
router.get('/logs', systemAdminController.queryLogs);
router.get('/audit', systemAdminController.queryAudit);

router.get('/vm/settings', systemAdminController.listVmSettings);
router.post('/vm/settings', systemAdminController.createVmSetting);
router.put('/vm/settings/:key', systemAdminController.updateVmSetting);
router.delete('/vm/settings/:key', systemAdminController.deleteVmSetting);
router.post('/vm/settings/:key/validate', systemAdminController.validateVmSetting);
router.post('/vm/settings/:key/activate', systemAdminController.activateVmSetting);
router.post('/vm/settings/:key/rollback', systemAdminController.rollbackVmSetting);
router.get('/vm/settings/:key/revisions', systemAdminController.listVmSettingRevisions);

router.get('/tables', systemAdminController.listTables);
router.get('/tables/:table/columns', systemAdminController.listTableColumns);
router.get('/tables/:table', systemAdminController.queryTable);

export default router;
