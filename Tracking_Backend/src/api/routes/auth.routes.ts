import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import { authRateLimit } from '@/middleware/rate-limit.middleware';
import * as authController from '@/api/controllers/auth.controller';

const router = Router();

// Public routes
router.post('/login', authRateLimit, authController.login);

// Protected routes
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.post('/change-password', requireAuth, authController.changePassword);

// User management (admin)
router.get('/users', requireAuth, authController.listUsers);
router.get('/users/:id', requireAuth, authController.getUserById);
router.post('/users', requireAuth, authController.createUser);
router.patch('/users/:id', requireAuth, authController.updateUser);
router.delete('/users/:id', requireAuth, authController.deleteUser);

export default router;
