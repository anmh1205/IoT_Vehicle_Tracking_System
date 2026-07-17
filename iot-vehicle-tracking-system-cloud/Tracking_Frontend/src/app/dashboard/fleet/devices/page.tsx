import { buildDashboardMetadata } from '@/config/dashboard-route-registry';

export const metadata = buildDashboardMetadata('/dashboard/fleet/devices');

export { default } from '../../devices/page';
