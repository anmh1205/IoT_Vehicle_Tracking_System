import { StatCard } from '@/components/common/stat-card';

export const DeviceStatCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) => {
  return <StatCard title={title} value={value} subtitle={subtitle} />;
};
