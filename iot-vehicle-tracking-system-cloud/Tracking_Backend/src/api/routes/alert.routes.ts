import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as alertController from '@/api/controllers/alert.controller';

const router = Router();

// All alert routes require authentication
router.use(requireAuth);

router.get('/', alertController.listAlerts);
router.get('/:id', alertController.getAlert);
// Mutations still operate on global alert IDs; restrict them to privileged
// roles until row-level authorization can be enforced inside each SQL write.
const requireGlobalAlertEditor = requireRole('root', 'admin');
router.post('/', requireGlobalAlertEditor, alertController.createAlert);
router.put('/:id/acknowledge', requireGlobalAlertEditor, alertController.acknowledgeAlert);
router.put('/:id/resolve', requireGlobalAlertEditor, alertController.resolveAlert);
router.put('/:id/dismiss', requireGlobalAlertEditor, alertController.dismissAlert);
router.delete('/:id', requireGlobalAlertEditor, alertController.deleteAlert);

export default router;
