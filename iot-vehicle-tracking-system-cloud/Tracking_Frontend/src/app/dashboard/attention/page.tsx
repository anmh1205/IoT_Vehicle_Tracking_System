import { redirect } from 'next/navigation';

const RedirectPage = () => {
  redirect('/dashboard/attention/queue');
};

export default RedirectPage;