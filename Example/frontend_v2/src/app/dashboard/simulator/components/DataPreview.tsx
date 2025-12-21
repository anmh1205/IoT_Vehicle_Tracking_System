'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimestamp } from '@/lib/utils/date/format';

interface DataPreviewProps {
  data: Record<string, unknown>;
}

export function DataPreview({ data }: DataPreviewProps) {
  const deviceId = (data.device_id as string) || 'Chưa chọn';
  const vibration = typeof data.vibration === 'number' ? data.vibration : (typeof data.vibration_value === 'number' ? data.vibration_value : 0);
  // Calculate battery total from battery_top + battery_bot, or fallback to battery
  const batteryTop = typeof data.battery_top === 'number' ? data.battery_top : 0;
  const batteryBot = typeof data.battery_bot === 'number' ? data.battery_bot : 0;
  const battery = batteryTop + batteryBot > 0 ? batteryTop + batteryBot : (typeof data.battery === 'number' ? data.battery : 0);
  const acPower = data.ac_power === true || data.ac_power === 'true' || data.ac_power === 1;
  const errorCode = typeof data.error_code === 'number' ? data.error_code : (typeof data.error_code === 'string' ? parseInt(data.error_code) : 0);
  const timestamp = data.timestamp as string || new Date().toISOString();
  const status = data.status as string;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dữ liệu hiện tại</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
          {/* Device ID */}
          <div className='p-4 bg-blue-50 rounded-lg text-center border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30'>
            <div className='text-blue-600 dark:text-blue-400 text-sm font-medium block mb-2'>Device ID</div>
            <div className='text-sm font-bold text-blue-800 dark:text-blue-300'>
              {deviceId}
            </div>
          </div>

          {/* Vibration Value */}
          {status !== 'stopped' && (
            <div className='p-4 bg-green-50 rounded-lg text-center border border-green-100 dark:bg-green-950/20 dark:border-green-900/30'>
              <div className='text-green-600 dark:text-green-400 text-sm font-medium block mb-2'>Vibration</div>
              <div className='text-sm font-bold text-green-800 dark:text-green-300'>
                {vibration.toFixed(2)} mm/s
              </div>
            </div>
          )}

          {/* Battery Voltage */}
          {status !== 'stopped' && (
            <div className='p-4 bg-yellow-50 rounded-lg text-center border border-yellow-100 dark:bg-yellow-950/20 dark:border-yellow-900/30'>
              <div className='text-yellow-600 dark:text-yellow-400 text-sm font-medium block mb-2'>Battery</div>
              <div className='text-sm font-bold text-yellow-800 dark:text-yellow-300'>
                {battery.toFixed(2)} V
              </div>
              {(batteryTop > 0 || batteryBot > 0) && (
                <div className='text-xs text-yellow-600 dark:text-yellow-400 mt-1'>
                  ({batteryTop.toFixed(2)} + {batteryBot.toFixed(2)})
                </div>
              )}
            </div>
          )}

          {/* AC Power */}
          {status !== 'stopped' && (
            <div className='p-4 bg-purple-50 rounded-lg text-center border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30'>
              <div className='text-purple-600 dark:text-purple-400 text-sm font-medium block mb-2'>AC Power</div>
              <div className='text-sm font-bold text-purple-800 dark:text-purple-300'>
                {acPower ? 'Có' : 'Không'}
              </div>
            </div>
          )}

          {/* Error Code */}
          {status !== 'stopped' && (
            <div className='p-4 bg-red-50 rounded-lg text-center border border-red-100 dark:bg-red-950/20 dark:border-red-900/30'>
              <div className='text-red-600 dark:text-red-400 text-sm font-medium block mb-2'>Error Code</div>
              <div className='text-sm font-bold text-red-800 dark:text-red-300'>
                {errorCode}
              </div>
            </div>
          )}

          {/* Status (if stopped) */}
          {status === 'stopped' && (
            <div className='p-4 bg-orange-50 rounded-lg text-center border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30'>
              <div className='text-orange-600 dark:text-orange-400 text-sm font-medium block mb-2'>Status</div>
              <div className='text-sm font-bold text-orange-800 dark:text-orange-300'>
                Đã dừng
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className='p-4 bg-gray-50 rounded-lg text-center border border-gray-100 dark:bg-gray-950/20 dark:border-gray-900/30'>
            <div className='text-gray-600 dark:text-gray-400 text-sm font-medium block mb-2'>Timestamp</div>
            <div className='text-xs font-bold text-gray-800 dark:text-gray-300'>
              {formatTimestamp(timestamp)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

