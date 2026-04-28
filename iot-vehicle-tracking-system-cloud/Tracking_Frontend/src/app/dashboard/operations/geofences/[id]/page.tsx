import { redirect } from 'next/navigation';

const LegacyOperationsGeofenceDetailPage = () => {
  redirect('/dashboard/zones');
};

export default LegacyOperationsGeofenceDetailPage;
