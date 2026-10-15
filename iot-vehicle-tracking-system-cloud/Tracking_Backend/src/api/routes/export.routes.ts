import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as exportController from '@/api/controllers/export.controller';

const router = Router();

router.use(requireAuth);
// All export types currently query the full fleet; only privileged
// administrators may request or retrieve those unscoped datasets.
const requireFleetExport = requireRole('root', 'admin');

router.get('/', requireFleetExport, exportController.listExports);
router.post('/', requireFleetExport, exportController.createExport);
router.get('/:id', requireFleetExport, exportController.getExportStatus);
router.get('/:id/download', requireFleetExport, exportController.downloadExport);

export default router;
