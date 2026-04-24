import { Gauge } from 'lucide-react';
import { LoginForm } from '@/features/auth/components/login-form';
import { loginLandingContent } from '@/features/marketing/data/landing-content';
import { BrandLockup } from '@/components/common/brand-mark';

const LoginPage = () => {
  return (
    <main
      id="main-content"
      className="safe-px safe-py relative min-h-[100dvh] overflow-hidden bg-slate-950 text-slate-100"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.24),transparent_45%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.16),transparent_40%)]" />
      <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-7xl items-center gap-8 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8 lg:p-10">
          <div>
            <BrandLockup
              size={52}
              priority
              supportingText="IoT Vehicle Tracking System"
              className="mb-4 items-start"
              nameClassName="text-base tracking-[0.32em] text-cyan-100"
              supportingTextClassName="text-sm text-slate-300"
            />

            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              {loginLandingContent.badge}
            </span>

            <h1 className="mt-5 text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              {loginLandingContent.title}
            </h1>

            <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-slate-300 sm:text-base">
              {loginLandingContent.description}
            </p>
          </div>

          <div className="mt-8 grid gap-4">
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

          <div className="mt-8 flex flex-wrap gap-2.5">
            {loginLandingContent.proofLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <aside
          className="flex justify-center lg:justify-end"
          aria-labelledby="login-panel-heading"
        >
          <div className="w-full max-w-md">
            <h2 id="login-panel-heading" className="sr-only">
              Khu vực đăng nhập hệ thống
            </h2>
            <LoginForm />
            <p className="mt-4 text-center text-xs text-slate-400">{loginLandingContent.assistText}</p>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default LoginPage;
