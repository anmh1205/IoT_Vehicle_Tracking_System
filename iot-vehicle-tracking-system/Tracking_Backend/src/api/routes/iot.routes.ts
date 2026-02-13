import { Router } from 'express';
import * as iotController from '@/api/controllers/iot.controller';

const router = Router();

router.post('/data', iotController.ingestData);

export default router;
