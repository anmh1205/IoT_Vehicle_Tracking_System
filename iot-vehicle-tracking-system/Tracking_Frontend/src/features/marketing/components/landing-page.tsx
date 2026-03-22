import Link from 'next/link';
import { LandingArchitecture } from './landing-architecture';
import { LandingFeatureGrid } from './landing-feature-grid';
import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingProof } from './landing-proof';

export const LandingPage = () => {
  return (
    <main id="main-content" className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_22%),radial-gradient(circle_at_20%_30%,rgba(45,212,191,0.12),transparent_20%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,1))]"
          aria-hidden="true"
        />
        <div className="relative">
          <LandingHeader />
          <LandingHero />
          <LandingFeatureGrid />
          <LandingProof />
          <LandingArchitecture />
          <footer className="border-t border-white/10">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <p className="font-[family:var(--font-display)] uppercase tracking-[0.22em] text-slate-200">
                  IoT Vehicle Tracking System
                </p>
                <p className="mt-2 max-w-xl leading-7">
                  Public landing page cho lớp marketing, trong khi login và dashboard vẫn giữ vai trò vận hành nội bộ.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="#features" className="transition hover:text-white">
                  Tính năng
                </Link>
                <Link href="#surfaces" className="transition hover:text-white">
                  Bề mặt vận hành
                </Link>
                <Link href="#flow" className="transition hover:text-white">
                  Luồng hệ thống
                </Link>
                <Link href="/login" className="transition hover:text-white">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
};
