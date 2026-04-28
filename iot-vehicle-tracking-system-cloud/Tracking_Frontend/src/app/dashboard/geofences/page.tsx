import { redirect } from 'next/navigation';

const LegacyGeofencesPage = () => {
  redirect('/dashboard/zones');
};

export default LegacyGeofencesPage;
