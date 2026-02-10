import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as authController from '@/api/controllers/auth.controller';

const router = Router();

router.use(requireAuth);
router.get('/profile', authController.getMe);
router.put('/profile', authController.updateProfile);
router.get('/notification-settings', authController.getNotificationSettings);
router.put('/notification-settings', authController.updateNotifications);

router.get('/', authController.listUsers);
router.get('/:id', authController.getUserById);
router.post('/', authController.createUser);
router.patch('/:id', authController.updateUser);
router.delete('/:id', authController.deleteUser);
router.post('/:id/reset-password', authController.resetUserPassword);

export default router;
