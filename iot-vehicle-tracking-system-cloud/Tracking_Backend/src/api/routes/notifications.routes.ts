import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as notificationController from '@/api/controllers/notification.controller';

const router = Router();

router.use(requireAuth);
router.get('/', notificationController.listNotifications);
router.get('/stats', notificationController.getStats);
router.post('/push-token', notificationController.registerPushToken);
router.delete('/push-token', notificationController.unregisterPushToken);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);
router.put('/mark-all-read', notificationController.markAllRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
