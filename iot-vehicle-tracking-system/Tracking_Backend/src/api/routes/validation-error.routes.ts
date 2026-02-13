import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as validationErrorController from '@/api/controllers/validation-error.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validationErrorController.listValidationErrors);

export default router;
