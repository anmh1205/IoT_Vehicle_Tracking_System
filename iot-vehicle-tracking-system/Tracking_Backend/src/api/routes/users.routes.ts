import { Router } from 'express';
import { requireAuth, requireAdminRole } from '@/middleware/auth.middleware';
import * as authController from '@/api/controllers/auth.controller';

const router = Router();

router.use(requireAuth);
router.get('/profile', authController.getMe);
router.put('/profile', authController.updateProfile);
router.get('/notification-settings', authController.getNotificationSettings);
router.put('/notification-settings', authController.updateNotifications);

router.get('/', requireAdminRole, authController.listUsers);
router.get('/:id', requireAdminRole, authController.getUserById);
router.post('/', requireAdminRole, authController.createUser);
router.patch('/:id', requireAdminRole, authController.updateUser);
router.delete('/:id', requireAdminRole, authController.deleteUser);
router.post('/:id/reset-password', requireAdminRole, authController.resetUserPassword);

export default router;
