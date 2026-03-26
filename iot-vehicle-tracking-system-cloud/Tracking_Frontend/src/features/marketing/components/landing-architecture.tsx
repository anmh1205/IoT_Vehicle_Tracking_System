import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { flowSteps } from '@/features/marketing/data/landing-content';
import { MarketingSectionHeading } from './marketing-section-heading';

export const LandingArchitecture = () => {
  return (
    <section id="flow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <MarketingSectionHeading
          kicker="System flow"
          title="Từ tín hiệu ngoài hiện trường tới dashboard được nhìn như một chuỗi liên tục."
          description="Landing page nên giữ rõ cảm giác end-to-end: thiết bị, message flow, backend, web/mobile và observability không tách rời nhau."
        />

        <div className="grid gap-4 xl:grid-cols-5">
          {flowSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Card key={step.title} className="border-white/10 bg-white/5 py-0 text-white shadow-none">
                <CardContent className="space-y-4 px-5 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-400/10 text-teal-100">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    {index < flowSteps.length - 1 ? (
                      <ChevronRight className="hidden h-5 w-5 text-slate-500 xl:block" aria-hidden="true" />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    <p className="text-sm leading-7 text-slate-300">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(8,47,73,0.92),rgba(2,6,23,0.96))] py-0 text-white shadow-[0_20px_80px_rgba(2,6,23,0.4)]">
          <CardContent className="grid gap-6 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-teal-200">Ready to ship</p>
              <h3 className="font-[family:var(--font-display)] text-3xl leading-tight text-white sm:text-4xl">
                Landing page có thể đi từ đây tới production mà không phải bịa thêm câu chuyện.
              </h3>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Route public đã sẵn sàng để gắn thêm screenshot thật hoặc AI assets ở vòng sau. Flow đăng nhập vẫn giữ rõ,
                còn dashboard protected route không đổi.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
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
                <Link href="/dashboard">Đi tới dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
