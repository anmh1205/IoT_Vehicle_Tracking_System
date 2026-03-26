import { Router } from 'express';
import { requireAuth, requireAdminRole } from '@/middleware/auth.middleware';
import { authRateLimit } from '@/middleware/rate-limit.middleware';
import * as authController from '@/api/controllers/auth.controller';

const router = Router();

// Public routes
router.post('/login', authRateLimit, authController.login);

// Protected routes
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.post('/refresh', requireAuth, authController.refresh);
router.post('/change-password', requireAuth, authController.changePassword);
router.put('/profile', requireAuth, authController.updateProfile);
router.put('/notifications', requireAuth, authController.updateNotifications);

// User management (admin)
router.get('/users', requireAuth, requireAdminRole, authController.listUsers);
router.get('/users/:id', requireAuth, requireAdminRole, authController.getUserById);
router.post('/users', requireAuth, requireAdminRole, authController.createUser);
router.patch('/users/:id', requireAuth, requireAdminRole, authController.updateUser);
router.delete('/users/:id', requireAuth, requireAdminRole, authController.deleteUser);

export default router;
