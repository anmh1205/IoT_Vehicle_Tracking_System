import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as vehicleController from '@/api/controllers/vehicle.controller';
import { requireAssignedAssetWrite } from '@/middleware/asset-grant.middleware';

const router = Router();

const requireAssetEditor = requireRole('root', 'admin', 'manager', 'operator');
const requireAssetAdmin = requireRole('root', 'admin');

// All vehicle routes require authentication
router.use(requireAuth);

router.get('/', vehicleController.listVehicles);
router.post('/import', requireAssetAdmin, vehicleController.importVehicles);
router.get('/:id', vehicleController.getVehicle);
router.get('/:id/status', vehicleController.getVehicleStatus);
router.post('/', requireAssetAdmin, vehicleController.createVehicle);
router.put('/:id', requireAssetEditor, requireAssignedAssetWrite({ existing: 'vehicleRow', forbidDeviceReassignment: true }), vehicleController.updateVehicle);
router.delete('/:id', requireAssetAdmin, vehicleController.deleteVehicle);
router.put('/:id/assign-device', requireAssetAdmin, vehicleController.assignDevice);
router.put('/:id/unassign-device', requireAssetAdmin, vehicleController.unassignDevice);
router.put('/:id/device', requireAssetAdmin, vehicleController.setDeviceAssignment);

export default router;
