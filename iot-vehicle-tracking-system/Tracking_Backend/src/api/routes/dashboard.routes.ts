import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as dashboardController from '@/api/controllers/dashboard.controller';

const router = Router();

router.use(requireAuth);

router.get('/stats', dashboardController.getStats);
router.get('/activity', dashboardController.getActivity);
router.get('/activity-feed', dashboardController.getActivity);
router.get('/device-activity', dashboardController.getDeviceActivity);
router.get('/device-status', dashboardController.getDeviceStatus);
router.get('/fleet-runtime', dashboardController.getFleetRuntime);

export default router;
