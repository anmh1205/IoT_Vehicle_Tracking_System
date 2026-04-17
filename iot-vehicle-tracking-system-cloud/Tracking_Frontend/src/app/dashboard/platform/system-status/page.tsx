import { buildDashboardMetadata } from '@/config/dashboard-route-registry';

export const metadata = buildDashboardMetadata('/dashboard/platform/system-status');

export { default } from '../../system-status/page';
