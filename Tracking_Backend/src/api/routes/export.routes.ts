import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as exportController from '@/api/controllers/export.controller';

const router = Router();

router.use(requireAuth);

router.get('/', exportController.listExports);
router.post('/', exportController.createExport);
router.get('/:id', exportController.getExportStatus);

export default router;
