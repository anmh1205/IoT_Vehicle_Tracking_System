import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as customerController from '@/api/controllers/customer.controller';

const router = Router();

const requireAssetManager = requireRole('root', 'admin', 'manager');
const requireAssetAdmin = requireRole('root', 'admin');

// All customer routes require authentication
router.use(requireAuth);

router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', requireAssetManager, customerController.createCustomer);
router.put('/:id', requireAssetManager, customerController.updateCustomer);
router.delete('/:id', requireAssetAdmin, customerController.deleteCustomer);

export default router;
