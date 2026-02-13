import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as customerController from '@/api/controllers/customer.controller';

const router = Router();

// All customer routes require authentication
router.use(requireAuth);

router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

export default router;
