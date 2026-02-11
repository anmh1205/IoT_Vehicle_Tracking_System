import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export const DeviceStatCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
};
