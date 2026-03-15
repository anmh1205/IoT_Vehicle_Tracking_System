import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { featureCards } from '@/features/marketing/data/landing-content';
import { MarketingSectionHeading } from './marketing-section-heading';

export const LandingFeatureGrid = () => {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <MarketingSectionHeading
          kicker="Feature spread"
          title="Không chỉ là bản đồ. Đây là một bề mặt vận hành đủ rộng cho đội xe."
          description="Landing page bám đúng những module đang có trong hệ thống, để thông điệp marketing không lệch khỏi sản phẩm thật."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="group border-white/10 bg-white/5 py-0 text-white shadow-none transition duration-300 hover:-translate-y-1 hover:border-teal-300/30 hover:bg-white/10"
              >
                <CardContent className="space-y-4 px-5 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-400/10 text-teal-100">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="flex items-center gap-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                      {feature.routeLabel}
                      <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:text-teal-200" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm leading-7 text-slate-300">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
