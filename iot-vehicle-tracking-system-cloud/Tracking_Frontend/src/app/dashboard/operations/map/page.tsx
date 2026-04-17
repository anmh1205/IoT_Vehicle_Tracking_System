import { buildDashboardMetadata } from '@/config/dashboard-route-registry';

export const metadata = buildDashboardMetadata('/dashboard/operations/map');

export { default } from '../../map/page';
