import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const navigationItems = [
  { href: '#features', label: 'Tính năng' },
  { href: '#surfaces', label: 'Bề mặt vận hành' },
  { href: '#flow', label: 'Luồng hệ thống' },
];

export const LandingHeader = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-300/30 bg-teal-400/10 text-teal-200 shadow-[0_0_30px_rgba(45,212,191,0.16)]">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-[family:var(--font-display)] text-sm uppercase tracking-[0.26em] text-slate-200">
              IoT Vehicle Tracking
            </p>
            <p className="truncate text-xs text-slate-400">Fleet command center cho vận hành realtime</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Badge className="hidden border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-amber-100 md:inline-flex">
            Dashboard + Mobile + Telemetry
          </Badge>
          <Button
            asChild
            variant="outline"
            className="hidden border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10 sm:inline-flex"
          >
            <Link href="/dashboard">
              Mở dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild className="bg-teal-400 text-slate-950 hover:bg-teal-300">
            <Link href="/login">Đăng nhập</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
