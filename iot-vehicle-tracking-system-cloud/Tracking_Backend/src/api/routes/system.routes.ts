import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as systemController from '@/api/controllers/system.controller';

const router = Router();

router.use(requireAuth);
router.get('/health', systemController.getHealth);
router.get('/metrics', systemController.getMetrics);

export default router;
