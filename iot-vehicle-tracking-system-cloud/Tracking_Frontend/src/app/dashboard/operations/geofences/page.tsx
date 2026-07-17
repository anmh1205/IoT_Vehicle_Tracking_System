import { redirect } from 'next/navigation';

const LegacyOperationsGeofencesPage = () => {
  redirect('/dashboard/zones');
};

export default LegacyOperationsGeofencesPage;
