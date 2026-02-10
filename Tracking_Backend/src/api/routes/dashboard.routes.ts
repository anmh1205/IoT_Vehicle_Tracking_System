import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as dashboardController from '@/api/controllers/dashboard.controller';

const router = Router();

router.use(requireAuth);

router.get('/stats', dashboardController.getStats);
router.get('/activity', dashboardController.getActivity);

export default router;
