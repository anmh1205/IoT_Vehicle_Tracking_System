import { buildDashboardMetadata } from '@/config/dashboard-route-registry';

export const metadata = buildDashboardMetadata('/dashboard/attention/queue');

export { default } from '../../alerts/page';
