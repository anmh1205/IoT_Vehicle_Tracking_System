import * as fs from 'node:fs';
import * as path from 'node:path';

import multer from 'multer';
import { Router } from 'express';
import * as firmwareController from '@/api/controllers/firmware.controller';
import { firmwareConfig } from '@/config/env';
import { requireAuth, attachUserIfAvailable } from '@/middleware/auth.middleware';

const router = Router();

const sanitizeFileStem = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'firmware';

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(firmwareConfig.storagePath, { recursive: true });
    callback(null, firmwareConfig.storagePath);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || '.bin';
    const stem = sanitizeFileStem(path.basename(file.originalname, extension));
    callback(null, `${Date.now()}-${stem}${extension}`);
  },
});

const firmwareUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.get('/:id/download', attachUserIfAvailable, firmwareController.downloadFirmware);

router.use(requireAuth);

router.get('/', firmwareController.listFirmware);
router.get('/:id', firmwareController.getFirmware);
router.get('/:id/devices', firmwareController.getAssignedDevices);
router.post('/', firmwareController.createFirmware);
router.post('/upload', firmwareUpload.single('file'), firmwareController.uploadFirmware);
router.delete('/:id', firmwareController.deleteFirmware);
router.post('/:id/activate', firmwareController.activateFirmware);
router.put('/:id/activate', firmwareController.activateFirmware);
router.post('/:id/deactivate', firmwareController.deactivateFirmware);
router.post('/:id/deploy', firmwareController.deployFirmware);
router.post('/:id/assign', firmwareController.assignFirmware);
router.get('/:id/deployments', firmwareController.getDeployments);

export default router;
