import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as violationController from '@/api/controllers/violation.controller';

const router = Router();

// All violation routes require authentication
router.use(requireAuth);

router.get('/', violationController.listViolations);
router.get('/:id', violationController.getViolation);
router.post('/', requireRole('root', 'admin', 'manager', 'operator'), violationController.createViolation);
router.put('/:id/acknowledge', requireRole('root', 'admin', 'manager', 'operator'), violationController.acknowledgeViolation);

export default router;
