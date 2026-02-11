import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as fuelAnalyticsController from '@/api/controllers/fuel-analytics.controller';

const router = Router();

router.use(requireAuth);
router.get('/summary', fuelAnalyticsController.getSummary);
router.get('/by-vehicle', fuelAnalyticsController.getByVehicle);
router.get('/trends', fuelAnalyticsController.getTrends);

export default router;
