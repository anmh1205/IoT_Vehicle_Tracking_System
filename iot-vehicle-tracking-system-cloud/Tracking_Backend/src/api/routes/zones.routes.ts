import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as zonesController from '@/api/controllers/zones.controller';

const router = Router();

router.use(requireAuth);

router.get('/vehicles', zonesController.listVehicleZones);
router.get('/vehicles/:vehicleId', zonesController.getVehicleZone);
router.put('/vehicles/:vehicleId', zonesController.upsertVehicleZone);
router.delete('/vehicles/:vehicleId', zonesController.deleteVehicleZone);
router.post(
  '/vehicles/:vehicleId/preview-circle-center',
  zonesController.previewVehicleZoneCircleCenter,
);
router.get('/boundaries', zonesController.listZoneBoundaries);
router.post('/boundaries/resolve', zonesController.resolveZoneBoundaries);

export default router;
