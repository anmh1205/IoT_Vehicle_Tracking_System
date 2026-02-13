import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as firmwareController from '@/api/controllers/firmware.controller';

const router = Router();

router.use(requireAuth);

router.get('/', firmwareController.listFirmware);
router.get('/:id', firmwareController.getFirmware);
router.get('/:id/download', firmwareController.downloadFirmware);
router.get('/:id/devices', firmwareController.getAssignedDevices);
router.post('/', firmwareController.createFirmware);
router.post('/upload', firmwareController.uploadFirmware);
router.delete('/:id', firmwareController.deleteFirmware);
router.post('/:id/activate', firmwareController.activateFirmware);
router.put('/:id/activate', firmwareController.activateFirmware);
router.post('/:id/deactivate', firmwareController.deactivateFirmware);
router.post('/:id/deploy', firmwareController.deployFirmware);
router.post('/:id/assign', firmwareController.assignFirmware);
router.get('/:id/deployments', firmwareController.getDeployments);

export default router;
