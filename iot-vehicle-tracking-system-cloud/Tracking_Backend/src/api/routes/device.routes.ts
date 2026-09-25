import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireDeviceAccess } from '@/middleware/device-access.middleware';
import * as deviceController from '@/api/controllers/device.controller';

const router = Router();

// All device routes require authentication
router.use(requireAuth);

router.get('/', deviceController.listDevices);
router.get('/positions', deviceController.getDevicePositions);
router.post('/import', deviceController.importDevices);
router.get('/:id', requireDeviceAccess, deviceController.getDevice);
router.post('/', deviceController.createDevice);
router.put('/:id', requireDeviceAccess, deviceController.updateDevice);
router.delete('/:id', requireDeviceAccess, deviceController.deleteDevice);
router.get('/:id/sessions', requireDeviceAccess, deviceController.getDeviceSessions);
router.get('/:id/sessions/:sessionId/telemetry', requireDeviceAccess, deviceController.getSessionTelemetry);
router.get('/:id/runtime', requireDeviceAccess, deviceController.getRuntimeStats);
router.get('/:id/telemetry', requireDeviceAccess, deviceController.getTelemetry);
router.post('/:id/command', requireDeviceAccess, deviceController.sendCommand);
router.post('/:id/ota', requireDeviceAccess, deviceController.triggerOta);
router.post('/:id/ota/rollback', requireDeviceAccess, deviceController.rollbackOta);
router.get('/:id/commands', requireDeviceAccess, deviceController.getCommands);
router.get('/:id/errors', requireDeviceAccess, deviceController.getErrors);
router.post('/:id/regenerate-token', requireDeviceAccess, deviceController.regenerateToken);

export default router;
