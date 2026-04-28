import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { surfaceGroups } from '@/features/marketing/data/landing-content';
import { MarketingSectionHeading } from './marketing-section-heading';

export const LandingProof = () => {
  return (
    <section id="surfaces" className="border-y border-white/10 bg-white/[0.03]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <MarketingSectionHeading
          kicker="Product surfaces"
          title="Các bề mặt đã có trong hệ thống đủ để kể một câu chuyện sản phẩm đáng tin."
          description="Thay vì phóng đại bằng claim chung chung, landing page nên cho thấy hệ thống này đã có chiều rộng vận hành thật."
        />

        <div className="grid gap-4">
          <Card className="border-white/10 bg-slate-900/75 py-0 text-white shadow-none">
            <CardContent className="grid gap-6 px-5 py-5 md:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {surfaceGroups.map((group) => (
                  <div key={group.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                      <p className="text-sm leading-7 text-slate-300">{group.description}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <Badge
                          key={item}
                          variant="outline"
                          className="border-white/10 bg-white/5 px-3 py-1 text-slate-200"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950">
                <Image
                  src="/landing/operations-surface.svg"
                  alt="Minh họa bề mặt điều hành gồm map, activity, system status và cảnh báo"
                  width={840}
                  height={720}
                  className="h-auto w-full"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/10 bg-white/5 py-0 text-white shadow-none">
              <CardContent className="space-y-4 px-5 py-5">
                <p className="text-xs uppercase tracking-[0.24em] text-teal-200">Web dashboard</p>
                <h3 className="text-2xl font-semibold text-white">Điều phối từ overview tới system status mà không đổi nhịp.</h3>
                <p className="text-sm leading-7 text-slate-300">
                  Đội vận hành có thể đi từ map, alerts, trips sang health metrics của hệ thống trong cùng một route tree.
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/10 bg-slate-900/70 py-0 text-white shadow-none">
              <CardContent className="space-y-4 px-5 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-amber-200">Mobile signal</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Cảnh báo và trạng thái vẫn đi cùng người vận hành khi rời bàn điều độ.</h3>
                </div>
                <Image
                  src="/landing/mobile-alerts.svg"
                  alt="Minh họa màn hình mobile nhận cảnh báo và trạng thái vùng"
                  width={720}
                  height={640}
                  className="h-auto w-full rounded-[1.25rem] border border-white/10"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
