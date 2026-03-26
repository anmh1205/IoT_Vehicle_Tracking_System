import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as geofenceController from '@/api/controllers/geofence.controller';

const router = Router();

// All geofence routes require authentication
router.use(requireAuth);

router.get('/', geofenceController.listGeofences);
router.get('/:id', geofenceController.getGeofence);
router.post('/', geofenceController.createGeofence);
router.put('/:id', geofenceController.updateGeofence);
router.delete('/:id', geofenceController.deleteGeofence);
router.post('/:id/vehicles', geofenceController.assignVehicle);
router.delete('/:id/vehicles/:vehicleId', geofenceController.unassignVehicle);

export default router;
