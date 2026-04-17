import { redirect } from 'next/navigation';

const RedirectPage = () => {
  redirect('/dashboard/platform/system-status');
};

export default RedirectPage;