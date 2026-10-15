import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as driverController from '@/api/controllers/driver.controller';

const router = Router();

const requireAssetManager = requireRole('root', 'admin', 'manager');
const requireAssetAdmin = requireRole('root', 'admin');

// All driver routes require authentication
router.use(requireAuth);

router.get('/', driverController.listDrivers);
router.get('/:id', driverController.getDriver);
router.post('/', requireAssetManager, driverController.createDriver);
router.put('/:id', requireAssetManager, driverController.updateDriver);
router.delete('/:id', requireAssetAdmin, driverController.deleteDriver);

export default router;
