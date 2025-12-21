'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { DataConfig } from '../hooks/useSimulator';

export function DataConfigurator({
  config,
  onConfigChange
}: {
  config: DataConfig;
  onConfigChange: (cfg: Partial<DataConfig>) => void;
}) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Cấu hình dữ liệu</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4 text-sm'>
        <div className='space-y-2'>
          <Label>Rung mong muốn (mm/s)</Label>
          <Input
            type='number'
            step='0.1'
            min='0'
            max='10'
            value={config.vibration.target}
            onChange={(e) => onConfigChange({ vibration: { ...config.vibration, target: Number(e.target.value) || 0 } })}
          />
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label>Biên độ dưới</Label>
              <Input
                type='number'
                step='0.1'
                min='0'
                value={config.vibration.lowerBound}
                onChange={(e) =>
                  onConfigChange({ vibration: { ...config.vibration, lowerBound: Number(e.target.value) || 0 } })
                }
              />
            </div>
            <div>
              <Label>Biên độ trên</Label>
              <Input
                type='number'
                step='0.1'
                min='0'
                value={config.vibration.upperBound}
                onChange={(e) =>
                  onConfigChange({ vibration: { ...config.vibration, upperBound: Number(e.target.value) || 0 } })
                }
              />
            </div>
          </div>
          <p className='text-xs text-muted-foreground'>
            Khoảng: {Math.max(0, config.vibration.target - config.vibration.lowerBound).toFixed(1)} -{' '}
            {(config.vibration.target + config.vibration.upperBound).toFixed(1)} mm/s
          </p>
        </div>

        <div className='space-y-2'>
          <Label>Pin trên (Battery Top) (V)</Label>
          <Input
            type='number'
            step='0.1'
            min='0'
            max='5'
            value={config.battery_top.target}
            onChange={(e) => onConfigChange({ battery_top: { ...config.battery_top, target: Number(e.target.value) || 0 } })}
          />
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label>Biên độ dưới</Label>
              <Input
                type='number'
                step='0.1'
                min='0'
                value={config.battery_top.lowerBound}
                onChange={(e) =>
                  onConfigChange({ battery_top: { ...config.battery_top, lowerBound: Number(e.target.value) || 0 } })
                }
              />
            </div>
            <div>
              <Label>Biên độ trên</Label>
              <Input
                type='number'
                step='0.1'
                min='0'
                value={config.battery_top.upperBound}
                onChange={(e) =>
                  onConfigChange({ battery_top: { ...config.battery_top, upperBound: Number(e.target.value) || 0 } })
                }
              />
            </div>
          </div>
          <p className='text-xs text-muted-foreground'>
            Khoảng: {Math.max(0, config.battery_top.target - config.battery_top.lowerBound).toFixed(1)} -{' '}
            {(config.battery_top.target + config.battery_top.upperBound).toFixed(1)} V
          </p>
        </div>

        <div className='space-y-2'>
          <Label>Pin dưới (Battery Bot) (V)</Label>
          <Input
            type='number'
            step='0.1'
            min='0'
            max='5'
            value={config.battery_bot.target}
            onChange={(e) => onConfigChange({ battery_bot: { ...config.battery_bot, target: Number(e.target.value) || 0 } })}
          />
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label>Biên độ dưới</Label>
              <Input
                type='number'
                step='0.1'
                min='0'
                value={config.battery_bot.lowerBound}
                onChange={(e) =>
                  onConfigChange({ battery_bot: { ...config.battery_bot, lowerBound: Number(e.target.value) || 0 } })
                }
              />
            </div>
            <div>
              <Label>Biên độ trên</Label>
              <Input
                type='number'
                step='0.1'
                min='0'
                value={config.battery_bot.upperBound}
                onChange={(e) =>
                  onConfigChange({ battery_bot: { ...config.battery_bot, upperBound: Number(e.target.value) || 0 } })
                }
              />
            </div>
          </div>
          <p className='text-xs text-muted-foreground'>
            Khoảng: {Math.max(0, config.battery_bot.target - config.battery_bot.lowerBound).toFixed(1)} -{' '}
            {(config.battery_bot.target + config.battery_bot.upperBound).toFixed(1)} V
          </p>
        </div>

        <div className='grid grid-cols-2 gap-3 items-center'>
          <div className='space-y-2'>
            <Label>AC Power</Label>
            <Switch checked={config.acPower} onCheckedChange={(v) => onConfigChange({ acPower: v })} />
          </div>
          <div className='space-y-2'>
            <Label>Mã lỗi</Label>
            <Input
              type='number'
              min='0'
              max='4'
              value={config.errorCode}
              onChange={(e) => onConfigChange({ errorCode: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Chu kỳ tự động (ms)</Label>
          <Slider
            min={100}
            max={300000}
            step={100}
            value={[config.autoInterval]}
            onValueChange={(v) => onConfigChange({ autoInterval: v[0] })}
          />
          <div className='text-xs text-muted-foreground'>{config.autoInterval} ms/lần</div>
        </div>
      </CardContent>
    </Card>
  );
}

