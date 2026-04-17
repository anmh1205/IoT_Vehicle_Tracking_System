import { redirect } from 'next/navigation';

const RedirectPage = () => {
  redirect('/dashboard/fleet/devices');
};

export default RedirectPage;