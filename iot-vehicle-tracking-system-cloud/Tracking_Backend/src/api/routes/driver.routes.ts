import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as driverController from '@/api/controllers/driver.controller';

const router = Router();

// Driver/customer records contain fleet-wide PII with no stable per-device grant.
// Block assigned roles until SQL object-grant constraints are available.
const requireAssetAdmin = requireRole('root', 'admin');

// All driver routes require authentication
router.use(requireAuth);

router.get('/', requireAssetAdmin, driverController.listDrivers);
router.get('/:id', requireAssetAdmin, driverController.getDriver);
router.post('/', requireAssetAdmin, requireAssetAdmin, driverController.createDriver);
router.put('/:id', requireAssetAdmin, requireAssetAdmin, driverController.updateDriver);
router.delete('/:id', requireAssetAdmin, driverController.deleteDriver);

export default router;
