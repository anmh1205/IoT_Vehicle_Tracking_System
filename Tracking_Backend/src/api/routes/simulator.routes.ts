import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as simulatorController from '@/api/controllers/simulator.controller';

const router = Router();

router.use(requireAuth);

router.get('/status', simulatorController.getSimulatorStatus);
router.post('/start', simulatorController.startSimulator);
router.post('/stop', simulatorController.stopSimulator);
router.post('/pause', simulatorController.pauseSimulator);
router.post('/resume', simulatorController.resumeSimulator);

export default router;
