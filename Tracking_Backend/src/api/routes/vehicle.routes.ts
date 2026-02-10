import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as vehicleController from '@/api/controllers/vehicle.controller';

const router = Router();

// All vehicle routes require authentication
router.use(requireAuth);

router.get('/', vehicleController.listVehicles);
router.get('/:id', vehicleController.getVehicle);
router.post('/', vehicleController.createVehicle);
router.put('/:id', vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.put('/:id/assign-device', vehicleController.assignDevice);
router.put('/:id/unassign-device', vehicleController.unassignDevice);

export default router;
