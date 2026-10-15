import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as geofenceController from '@/api/controllers/geofence.controller';

const router = Router();

const requireAssetManager = requireRole('root', 'admin', 'manager');
const requireAssetAdmin = requireRole('root', 'admin');

// All geofence routes require authentication
router.use(requireAuth);

router.get('/', geofenceController.listGeofences);
router.get('/policies', geofenceController.listVehiclePolicies);
router.get('/policies/:policyId', geofenceController.getVehiclePolicy);
router.post('/policies', requireAssetManager, geofenceController.createVehiclePolicy);
router.put('/policies/:policyId', requireAssetManager, geofenceController.updateVehiclePolicy);
router.get('/policy-violations', geofenceController.listVehiclePolicyViolations);
router.get('/vehicles/:vehicleId/allowed-zone', geofenceController.getVehicleAllowedZone);
router.post(
  '/vehicles/:vehicleId/allowed-zone/preview-center',
  geofenceController.previewVehicleAllowedZoneCenter,
);
router.put('/vehicles/:vehicleId/allowed-zone', requireAssetManager, geofenceController.upsertVehicleAllowedZone);
router.delete('/vehicles/:vehicleId/allowed-zone', requireAssetAdmin, geofenceController.deleteVehicleAllowedZone);
router.get('/vehicles/:vehicleId/policy-states', geofenceController.listVehiclePolicyStates);
router.get('/:id', geofenceController.getGeofence);
router.post('/', requireAssetManager, geofenceController.createGeofence);
router.put('/:id', requireAssetManager, geofenceController.updateGeofence);
router.delete('/:id', requireAssetAdmin, geofenceController.deleteGeofence);
router.post('/:id/vehicles', requireAssetManager, geofenceController.assignVehicle);
router.delete('/:id/vehicles/:vehicleId', requireAssetManager, geofenceController.unassignVehicle);

export default router;
