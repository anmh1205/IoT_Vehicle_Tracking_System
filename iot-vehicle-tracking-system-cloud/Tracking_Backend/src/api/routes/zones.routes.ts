import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as zonesController from '@/api/controllers/zones.controller';

const router = Router();

const requireAssetManager = requireRole('root', 'admin', 'manager');
const requireAssetAdmin = requireRole('root', 'admin');

router.use(requireAuth);

router.get('/vehicles', zonesController.listVehicleZones);
router.get('/vehicles/:vehicleId', zonesController.getVehicleZone);
router.put('/vehicles/:vehicleId', requireAssetManager, zonesController.upsertVehicleZone);
router.delete('/vehicles/:vehicleId', requireAssetAdmin, zonesController.deleteVehicleZone);
router.post(
  '/vehicles/:vehicleId/preview-circle-center',
  zonesController.previewVehicleZoneCircleCenter,
);
router.get('/boundaries', zonesController.listZoneBoundaries);
router.post('/boundaries/resolve', zonesController.resolveZoneBoundaries);

export default router;
