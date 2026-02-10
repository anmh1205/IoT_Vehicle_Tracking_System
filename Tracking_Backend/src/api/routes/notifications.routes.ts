import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as notificationController from '@/api/controllers/notification.controller';

const router = Router();

router.use(requireAuth);
router.get('/', notificationController.listNotifications);
router.put('/:id/read', notificationController.markRead);
router.put('/mark-all-read', notificationController.markAllRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
