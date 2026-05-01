import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { heroSignals } from '@/features/marketing/data/landing-content';

const operationPillars = [
  {
    title: 'Theo dõi thời gian thực',
    description: 'Giữ vị trí xe, tuyến đường và trạng thái thiết bị trong một nhịp quan sát.',
  },
  {
    title: 'Cảnh báo đồng bộ dữ liệu',
    description: 'Bản đồ, cảnh báo, vùng, chuyến đi và trạng thái hệ thống nằm chung một luồng.',
  },
  {
    title: 'Điều phối từ web tới di động',
    description: 'Bảng điều khiển vận hành và vỏ ứng dụng di động bám cùng một hạ tầng dữ liệu đo từ xa.',
  },
];

export const LandingHero = () => {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.20),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_58%,#020617_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/50 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:py-24">
        <div className="space-y-8">
          <Badge
            variant="outline"
            className="border-white/15 bg-white/5 px-3 py-1 text-[0.72rem] uppercase tracking-[0.28em] text-slate-200"
          >
            Fleet command center
          </Badge>

          <div className="space-y-5">
            <h1 className="max-w-3xl font-[family:var(--font-display)] text-4xl leading-none text-white sm:text-5xl lg:text-6xl">
              Giám sát đội xe theo thời gian thực, từ tín hiệu thiết bị tới quyết định vận hành.
            </h1>
            <p className="max-w-2xl font-[family:var(--font-marketing)] text-base leading-8 text-slate-300 sm:text-lg">
              Hệ thống gom bản đồ realtime, cảnh báo, vùng, trips, nhiên liệu, bảo trì và sức khỏe
              hạ tầng vào cùng một bề mặt rõ ràng, để đội vận hành phản ứng nhanh mà không đổi màn hình.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-teal-400 text-slate-950 hover:bg-teal-300">
              <Link href="/login">
                Đăng nhập hệ thống
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
            >
              <Link href="#features">Xem các bề mặt vận hành</Link>
            </Button>
          </div>

          <ul className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            {heroSignals.map((signal) => (
              <li
                key={signal}
                className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-4 md:grid-cols-3">
            {operationPillars.map((pillar) => (
              <Card key={pillar.title} className="border-white/10 bg-white/5 py-0 text-white shadow-none">
                <CardContent className="space-y-3 px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-teal-200">{pillar.title}</p>
                  <p className="text-sm leading-7 text-slate-300">{pillar.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-10 hidden rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 shadow-2xl backdrop-blur lg:block">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200">Realtime rail</p>
            <p className="mt-1 text-sm text-slate-200">Map, vùng, trips, alerts đi cùng nhau</p>
          </div>
          <div className="absolute -right-2 bottom-10 hidden rounded-2xl border border-teal-300/20 bg-teal-400/10 px-4 py-3 shadow-2xl backdrop-blur lg:block">
            <div className="flex items-center gap-2 text-sm text-white">
              <ShieldCheck className="h-4 w-4 text-teal-200" aria-hidden="true" />
              System status và telemetry luôn ở gần thao tác vận hành
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-3 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur">
            <Image
              src="/landing/hero-command-center.svg"
              alt="Minh họa trung tâm điều hành theo dõi đội xe theo thời gian thực"
              width={960}
              height={760}
              className="h-auto w-full rounded-[1.4rem]"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};
