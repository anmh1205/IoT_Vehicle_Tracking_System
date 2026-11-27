import { LoginForm } from '@/features/auth/components/login-form';
import { loginLandingContent } from '@/features/marketing/data/landing-content';
import { BrandLockup } from '@/components/common/brand-mark';

const LoginPage = () => {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="safe-px safe-py relative min-h-[100dvh] overflow-hidden bg-slate-950 text-slate-100"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.24),transparent_45%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.16),transparent_40%)]" />
      <div className="relative mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-7xl content-start items-center gap-6 py-4 lg:grid-cols-[1.15fr_0.85fr] lg:content-center lg:gap-12 lg:py-8">
        <section className="mx-auto w-full max-w-md lg:max-w-none lg:rounded-3xl lg:border lg:border-white/10 lg:bg-white/[0.04] lg:p-10 lg:backdrop-blur">
          <div>
            <BrandLockup
              size={52}
              priority
              supportingText="IoT Vehicle Tracking System"
              className="items-start lg:mb-4"
              nameClassName="text-base tracking-[0.32em] text-cyan-100"
              supportingTextClassName="text-sm text-slate-300"
            />

            <div className="hidden lg:block">
              <p className="mt-5 text-balance text-5xl font-semibold leading-tight text-white">
                {loginLandingContent.title}
              </p>
              <p className="mt-4 max-w-2xl text-pretty leading-6 text-slate-300">
                {loginLandingContent.description}
              </p>
            </div>
          </div>

          <div className="mt-8 hidden gap-4 lg:grid">
            {loginLandingContent.highlights.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_0_0_1px_rgba(148,163,184,0.08)]"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-white sm:text-base">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-300 sm:text-sm">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

        </section>

        <section className="flex justify-center lg:justify-end" aria-labelledby="login-panel-heading">
          <div className="w-full max-w-md">
            <LoginForm />
            <p className="mt-4 text-center text-xs text-slate-400">{loginLandingContent.assistText}</p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
