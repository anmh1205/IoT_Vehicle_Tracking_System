import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as maintenanceController from '@/api/controllers/maintenance.controller';

const router = Router();

const requireAssetEditor = requireRole('root', 'admin', 'manager', 'operator');
const requireAssetAdmin = requireRole('root', 'admin');

// All maintenance routes require authentication
router.use(requireAuth);

router.get('/', maintenanceController.listMaintenance);
router.get('/:id', maintenanceController.getMaintenance);
router.post('/', requireAssetEditor, maintenanceController.createMaintenance);
router.put('/:id', requireAssetEditor, maintenanceController.updateMaintenance);
router.delete('/:id', requireAssetAdmin, maintenanceController.deleteMaintenance);

export default router;
