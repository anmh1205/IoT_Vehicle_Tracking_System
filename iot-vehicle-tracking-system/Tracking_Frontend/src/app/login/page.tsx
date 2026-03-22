import { LoginForm } from '@/features/auth/components/login-form';

const LoginPage = () => {
  return (
    <main
      id="main-content"
      className="safe-px safe-py flex min-h-[100dvh] items-center justify-center bg-muted/50"
    >
      <LoginForm />
    </main>
  );
};

export default LoginPage;
