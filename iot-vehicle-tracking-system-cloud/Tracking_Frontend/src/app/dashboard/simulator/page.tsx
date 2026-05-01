'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRoleAccess } from '@/hooks/use-role-access';
import { DeviceSelector } from '@/features/simulator/components/device-selector';
import { DataConfigurator } from '@/features/simulator/components/data-configurator';
import { SimulationControls } from '@/features/simulator/components/simulation-controls';
import { SimulationPreview } from '@/features/simulator/components/simulation-preview';
import { useSimulator } from '@/features/simulator/hooks/use-simulator';

const SimulatorPage = () => {
  const access = useRoleAccess();
  const simulator = useSimulator();

  if (!access.canAccessSystemAdmin) {
    return (
      <PageContainer pageTitle="Trình mô phỏng" pageDescription="Khu vực hạn chế">
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Bạn không có quyền chạy mô phỏng thiết bị.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle="Trình mô phỏng"
      pageDescription="Tạo dữ liệu đo từ xa giả lập để kiểm thử xuyên suốt, kiểm tra bảng điều khiển và mô phỏng hành vi thiết bị"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hướng dẫn nhanh</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <p>1. Chọn thiết bị hoặc một nhóm thiết bị cần phát dữ liệu giả lập.</p>
          <p>2. Cấu hình biên độ cảm biến, vị trí và chu kỳ phát để mô phỏng đúng kịch bản kiểm thử.</p>
          <p>3. Theo dõi bản xem trước, lịch sử đã gửi và trạng thái chạy ở khung bên phải.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chọn thiết bị</CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceSelector
                value={simulator.state.selectedDeviceIds}
                onChange={simulator.setSelectedDeviceIds}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cấu hình dữ liệu</CardTitle>
            </CardHeader>
            <CardContent>
              <DataConfigurator state={simulator.state} onChange={simulator.setConfig} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Điều khiển mô phỏng</CardTitle>
            </CardHeader>
            <CardContent>
              <SimulationControls
                intervalSec={simulator.state.intervalSec}
                durationMin={simulator.state.durationMin}
                running={simulator.running}
                paused={simulator.paused}
                statusLabel={simulator.statusLabel}
                onIntervalChange={(value) => simulator.setConfig('intervalSec', value)}
                onDurationChange={(value) => simulator.setConfig('durationMin', value)}
                onStart={() => void simulator.start()}
                onPause={simulator.pause}
                onResume={simulator.resume}
                onStop={() => void simulator.stop()}
              />
            </CardContent>
          </Card>
        </div>

        <SimulationPreview preview={simulator.preview} history={simulator.history} />
      </div>
    </PageContainer>
  );
};

export default SimulatorPage;
