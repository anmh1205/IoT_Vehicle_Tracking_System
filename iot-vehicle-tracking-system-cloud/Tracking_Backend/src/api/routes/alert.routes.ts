import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as alertController from '@/api/controllers/alert.controller';

const router = Router();

// All alert routes require authentication
router.use(requireAuth);

router.get('/', alertController.listAlerts);
router.get('/:id', alertController.getAlert);
router.post('/', alertController.createAlert);
router.put('/:id/acknowledge', alertController.acknowledgeAlert);
router.put('/:id/resolve', alertController.resolveAlert);
router.put('/:id/dismiss', alertController.dismissAlert);
router.delete('/:id', alertController.deleteAlert);

export default router;
