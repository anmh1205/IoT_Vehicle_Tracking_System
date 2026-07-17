import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as telemetryController from '@/api/controllers/telemetry.controller';

const router = Router();

router.use(requireAuth);
router.get('/history', telemetryController.getHistory);
router.post('/export', telemetryController.createExport);

export default router;
