import { Router } from 'express';
import authRoutes from '@/api/routes/auth.routes';
import deviceRoutes from '@/api/routes/device.routes';
import dashboardRoutes from '@/api/routes/dashboard.routes';
import firmwareRoutes from '@/api/routes/firmware.routes';
import exportRoutes from '@/api/routes/export.routes';
import systemAdminRoutes from '@/api/routes/system-admin.routes';
import vehicleRoutes from '@/api/routes/vehicle.routes';
import customerRoutes from '@/api/routes/customer.routes';
import tripRoutes from '@/api/routes/trip.routes';
import alertRoutes from '@/api/routes/alert.routes';
import geofenceRoutes from '@/api/routes/geofence.routes';
import maintenanceRoutes from '@/api/routes/maintenance.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/firmware', firmwareRoutes);
router.use('/exports', exportRoutes);
router.use('/system-admin', systemAdminRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/customers', customerRoutes);
router.use('/trips', tripRoutes);
router.use('/alerts', alertRoutes);
router.use('/geofences', geofenceRoutes);
router.use('/maintenance', maintenanceRoutes);

export default router;
