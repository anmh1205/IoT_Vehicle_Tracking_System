import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as driverController from '@/api/controllers/driver.controller';

const router = Router();

// All driver routes require authentication
router.use(requireAuth);

router.get('/', driverController.listDrivers);
router.get('/:id', driverController.getDriver);
router.post('/', driverController.createDriver);
router.put('/:id', driverController.updateDriver);
router.delete('/:id', driverController.deleteDriver);

export default router;
