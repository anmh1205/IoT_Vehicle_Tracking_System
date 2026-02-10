import { Router } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import * as tripController from '@/api/controllers/trip.controller';

const router = Router();

// All trip routes require authentication
router.use(requireAuth);

router.get('/', tripController.listTrips);
router.get('/:id', tripController.getTrip);
router.post('/', tripController.createTrip);
router.put('/:id', tripController.updateTrip);
router.delete('/:id', tripController.deleteTrip);
router.put('/:id/start', tripController.startTrip);
router.put('/:id/end', tripController.endTrip);

export default router;
