import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as geofenceController from '@/api/controllers/geofence.controller';

const router = Router();

// All geofence routes require authentication
router.use(requireAuth);

router.get('/', geofenceController.listGeofences);
router.get('/policies', geofenceController.listVehiclePolicies);
router.get('/policies/:policyId', geofenceController.getVehiclePolicy);
router.post('/policies', geofenceController.createVehiclePolicy);
router.put('/policies/:policyId', geofenceController.updateVehiclePolicy);
router.get('/policy-violations', geofenceController.listVehiclePolicyViolations);
router.get('/vehicles/:vehicleId/allowed-zone', geofenceController.getVehicleAllowedZone);
router.post(
  '/vehicles/:vehicleId/allowed-zone/preview-center',
  geofenceController.previewVehicleAllowedZoneCenter,
);
router.put('/vehicles/:vehicleId/allowed-zone', geofenceController.upsertVehicleAllowedZone);
router.delete('/vehicles/:vehicleId/allowed-zone', geofenceController.deleteVehicleAllowedZone);
router.get('/vehicles/:vehicleId/policy-states', geofenceController.listVehiclePolicyStates);
router.get('/:id', geofenceController.getGeofence);
router.post('/', geofenceController.createGeofence);
router.put('/:id', geofenceController.updateGeofence);
router.delete('/:id', geofenceController.deleteGeofence);
router.post('/:id/vehicles', geofenceController.assignVehicle);
router.delete('/:id/vehicles/:vehicleId', geofenceController.unassignVehicle);

export default router;
