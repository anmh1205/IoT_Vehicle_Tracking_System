import { Button } from '@/components/ui/button';
import { DeviceVibrationChart } from '@/features/devices/components/device-vibration-chart';
import { useDeviceDetailModal } from './modal-context';
const PERIODS = [
  { label: '1 giờ', value: '1h' },
  { label: '6 giờ', value: '6h' },
  { label: '24 giờ', value: '24h' },
  { label: '7 ngày', value: '7d' },
] as const;
export const VibrationTab = () => {
  const { vibrationPeriod, onVibrationPeriodChange, vibrationChart, device } =
    useDeviceDetailModal();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={vibrationPeriod === item.value ? 'default' : 'outline'}
            onClick={() => onVibrationPeriodChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <DeviceVibrationChart data={vibrationChart} threshold={device?.vibrationThreshold ?? 0} />
    </div>
  );
};
