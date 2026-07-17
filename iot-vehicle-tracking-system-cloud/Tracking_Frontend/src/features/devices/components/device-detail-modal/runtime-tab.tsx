import { Button } from '@/components/ui/button';
import { DeviceRuntimeChart } from '@/features/devices/components/device-runtime-chart';
import { useDeviceDetailModal } from './modal-context';

const RANGES = [
  { label: '7 ngày', value: '7d' },
  { label: '30 ngày', value: '30d' },
  { label: '90 ngày', value: '90d' },
  { label: '1 năm', value: '1y' },
] as const;

export const RuntimeTab = () => {
  const { runtimeRange, onRuntimeRangeChange, runtimeChart } = useDeviceDetailModal();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={runtimeRange === item.value ? 'default' : 'outline'}
            onClick={() => onRuntimeRangeChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <DeviceRuntimeChart data={runtimeChart} />
    </div>
  );
};
