import { redirect } from 'next/navigation';

const LegacyGeofenceDetailPage = () => {
  redirect('/dashboard/zones');
};

export default LegacyGeofenceDetailPage;
