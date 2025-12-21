import { Metadata } from 'next';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: 'Authentication | Sign Up',
  description: 'Sign Up page for authentication (legacy backend v1).'
};

export default function Page() {
  // Clerk-based registration has been removed. This route is kept only as a
  // notice that new users should be created via the existing backend v1 flow.
  return <SignUpViewPage />;
}
