import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import { requireDeviceAccess } from '@/middleware/device-access.middleware';
import * as deviceController from '@/api/controllers/device.controller';

const router = Router();

const requireDeviceEditor = requireRole('root', 'admin', 'manager', 'operator');
const requireDeviceAdmin = requireRole('root', 'admin');

// All device routes require authentication
router.use(requireAuth);

router.get('/', deviceController.listDevices);
router.get('/positions', deviceController.getDevicePositions);
router.post('/import', requireDeviceEditor, deviceController.importDevices);
router.get('/:id', requireDeviceAccess, deviceController.getDevice);
router.post('/', requireDeviceEditor, deviceController.createDevice);
router.put('/:id', requireDeviceEditor, requireDeviceAccess, deviceController.updateDevice);
router.delete('/:id', requireDeviceAdmin, requireDeviceAccess, deviceController.deleteDevice);
router.get('/:id/sessions', requireDeviceAccess, deviceController.getDeviceSessions);
router.get('/:id/sessions/:sessionId/telemetry', requireDeviceAccess, deviceController.getSessionTelemetry);
router.get('/:id/runtime', requireDeviceAccess, deviceController.getRuntimeStats);
router.get('/:id/telemetry', requireDeviceAccess, deviceController.getTelemetry);
router.get('/:id/event-logs', requireDeviceAccess, deviceController.getEventLogs);
router.post('/:id/command', requireDeviceEditor, requireDeviceAccess, deviceController.sendCommand);
router.post('/:id/ota', requireDeviceAdmin, requireDeviceAccess, deviceController.triggerOta);
router.post('/:id/ota/rollback', requireDeviceAdmin, requireDeviceAccess, deviceController.rollbackOta);
router.get('/:id/commands', requireDeviceAccess, deviceController.getCommands);
router.get('/:id/errors', requireDeviceAccess, deviceController.getErrors);
router.post('/:id/regenerate-token', requireDeviceAdmin, requireDeviceAccess, deviceController.regenerateToken);

export default router;
