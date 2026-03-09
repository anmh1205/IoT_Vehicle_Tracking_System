import { Router } from 'express';
import { requireAuth, attachUserIfAvailable } from '@/middleware/auth.middleware';
import * as firmwareController from '@/api/controllers/firmware.controller';

const router = Router();

router.get('/:id/download', attachUserIfAvailable, firmwareController.downloadFirmware);

router.use(requireAuth);

router.get('/', firmwareController.listFirmware);
router.get('/:id', firmwareController.getFirmware);
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
