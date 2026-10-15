import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth.middleware';
import * as tripController from '@/api/controllers/trip.controller';
import { requireAssignedAssetWrite } from '@/middleware/asset-grant.middleware';

const router = Router();

const requireAssetEditor = requireRole('root', 'admin', 'manager', 'operator');
const requireAssetAdmin = requireRole('root', 'admin');

// All trip routes require authentication
router.use(requireAuth);

router.get('/', tripController.listTrips);
router.get('/:id', tripController.getTrip);
router.get('/:id/telemetry', tripController.getTripTelemetry);
router.post('/', requireAssetEditor, requireAssignedAssetWrite({ requireBodyReference: true }), tripController.createTrip);
router.put('/:id', requireAssetEditor, requireAssignedAssetWrite({ existing: 'tripRow' }), tripController.updateTrip);
router.delete('/:id', requireAssetAdmin, tripController.deleteTrip);
router.put('/:id/start', requireAssetEditor, requireAssignedAssetWrite({ existing: 'tripRow' }), tripController.startTrip);
router.put('/:id/end', requireAssetEditor, requireAssignedAssetWrite({ existing: 'tripRow' }), tripController.endTrip);

export default router;
