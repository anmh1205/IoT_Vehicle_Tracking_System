import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as firmwareController from '@/api/controllers/firmware.controller';

const router = Router();

router.use(requireAuth);

router.get('/', firmwareController.listFirmware);
router.get('/:id', firmwareController.getFirmware);
router.post('/', firmwareController.createFirmware);
router.delete('/:id', firmwareController.deleteFirmware);
router.post('/:id/activate', firmwareController.activateFirmware);
router.post('/:id/deactivate', firmwareController.deactivateFirmware);

export default router;
