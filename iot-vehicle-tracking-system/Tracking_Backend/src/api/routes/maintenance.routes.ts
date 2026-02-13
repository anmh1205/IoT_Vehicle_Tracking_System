import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as maintenanceController from '@/api/controllers/maintenance.controller';

const router = Router();

// All maintenance routes require authentication
router.use(requireAuth);

router.get('/', maintenanceController.listMaintenance);
router.get('/:id', maintenanceController.getMaintenance);
router.post('/', maintenanceController.createMaintenance);
router.put('/:id', maintenanceController.updateMaintenance);
router.delete('/:id', maintenanceController.deleteMaintenance);

export default router;
