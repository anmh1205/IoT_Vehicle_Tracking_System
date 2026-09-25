import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as deviceController from '@/api/controllers/device.controller';

const router = Router();

// All device routes require authentication
router.use(requireAuth);

router.get('/', deviceController.listDevices);
router.get('/positions', deviceController.getDevicePositions);
router.post('/import', deviceController.importDevices);
router.get('/:id', deviceController.getDevice);
router.post('/', deviceController.createDevice);
router.put('/:id', deviceController.updateDevice);
router.delete('/:id', deviceController.deleteDevice);
router.get('/:id/sessions', deviceController.getDeviceSessions);
router.get('/:id/sessions/:sessionId/telemetry', deviceController.getSessionTelemetry);
router.get('/:id/runtime', deviceController.getRuntimeStats);
router.get('/:id/telemetry', deviceController.getTelemetry);
router.post('/:id/command', deviceController.sendCommand);
router.post('/:id/ota', deviceController.triggerOta);
router.post('/:id/ota/rollback', deviceController.rollbackOta);
router.get('/:id/commands', deviceController.getCommands);
router.get('/:id/errors', deviceController.getErrors);
router.post('/:id/regenerate-token', deviceController.regenerateToken);

export default router;
