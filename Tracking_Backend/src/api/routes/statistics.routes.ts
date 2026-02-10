import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as statisticsController from '@/api/controllers/statistics.controller';

const router = Router();

router.use(requireAuth);
router.get('/fleet', statisticsController.getFleetStats);
router.get('/maintenance', statisticsController.getMaintenanceStats);
router.get('/fleet-usage', statisticsController.getFleetUsage);
router.get('/device-uptime', statisticsController.getDeviceUptime);
router.get('/alert-frequency', statisticsController.getAlertFrequency);
router.get('/trip-summary', statisticsController.getTripSummary);

export default router;
