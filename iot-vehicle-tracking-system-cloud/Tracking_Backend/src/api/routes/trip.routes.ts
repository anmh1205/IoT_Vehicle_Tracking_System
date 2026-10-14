import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as tripController from '@/api/controllers/trip.controller';

const router = Router();

const requireAssetEditor = requireRole('root', 'admin', 'manager', 'operator');
const requireAssetAdmin = requireRole('root', 'admin');

// All trip routes require authentication
router.use(requireAuth);

router.get('/', tripController.listTrips);
router.get('/:id', tripController.getTrip);
router.get('/:id/telemetry', tripController.getTripTelemetry);
router.post('/', requireAssetEditor, tripController.createTrip);
router.put('/:id', requireAssetEditor, tripController.updateTrip);
router.delete('/:id', requireAssetAdmin, tripController.deleteTrip);
router.put('/:id/start', requireAssetEditor, tripController.startTrip);
router.put('/:id/end', requireAssetEditor, tripController.endTrip);

export default router;
