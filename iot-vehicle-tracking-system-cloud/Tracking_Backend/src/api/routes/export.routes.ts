import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as exportController from '@/api/controllers/export.controller';

const router = Router();

router.use(requireAuth);
// All export types currently query the full fleet; only privileged
// administrators may request or retrieve those unscoped datasets.
const requireFleetExport = requireRole('root', 'admin');

// Scoped device export routes use fresh SQL grants in the service/worker.
router.post('/device', exportController.createScopedDeviceExport);
router.get('/device/:id', exportController.getScopedDeviceExportStatus);
router.get('/device/:id/download', exportController.downloadScopedDeviceExport);

router.get('/', requireFleetExport, exportController.listExports);
router.post('/', requireFleetExport, exportController.createExport);
router.get('/:id', requireFleetExport, exportController.getExportStatus);
router.get('/:id/download', requireFleetExport, exportController.downloadExport);

export default router;
