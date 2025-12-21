import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard : Profile'
};

export default async function Page() {
  // Redirect to dashboard since profile is now handled via dialog
  redirect('/dashboard');
}
