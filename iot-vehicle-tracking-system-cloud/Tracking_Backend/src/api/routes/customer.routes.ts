import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as customerController from '@/api/controllers/customer.controller';

const router = Router();

// Driver/customer records contain fleet-wide PII with no stable per-device grant.
// Block assigned roles until SQL object-grant constraints are available.
const requireAssetAdmin = requireRole('root', 'admin');

// All customer routes require authentication
router.use(requireAuth);

router.get('/', requireAssetAdmin, customerController.listCustomers);
router.get('/:id', requireAssetAdmin, customerController.getCustomer);
router.post('/', requireAssetAdmin, requireAssetAdmin, customerController.createCustomer);
router.put('/:id', requireAssetAdmin, requireAssetAdmin, customerController.updateCustomer);
router.delete('/:id', requireAssetAdmin, customerController.deleteCustomer);

export default router;
