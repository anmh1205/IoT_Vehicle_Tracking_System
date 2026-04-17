import { redirect } from 'next/navigation';

const RedirectPage = () => {
  redirect('/dashboard/operations/map');
};

export default RedirectPage;