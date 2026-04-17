import { buildDashboardMetadata } from '@/config/dashboard-route-registry';

export const metadata = buildDashboardMetadata('/dashboard/attention/maintenance');

export { default } from '../../maintenance/page';
