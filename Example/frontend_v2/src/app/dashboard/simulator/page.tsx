'use client';

import { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deviceServices } from '@/lib/api/device';
import { DeviceSelector } from './components/DeviceSelector';
import { DataConfigurator } from './components/DataConfigurator';
import { SimulatorControls } from './components/SimulatorControls';
import { DataPreview } from './components/DataPreview';
import { useSimulator } from './hooks/useSimulator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function SimulatorPage() {
  const [devices, setDevices] = useState<Device.DeviceDto[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    selectedDevice,
    dataConfig,
    currentData,
    isSending,
    isAutoMode,
    updateDevice,
    updateDataConfig,
    generateRandomData,
    sendData,
    sendStopData,
    toggleAutoMode
  } = useSimulator();

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoadingDevices(true);
        setLoadError(null);
        const list = await deviceServices.list();
        setDevices(list || []);
      } catch (e) {
        setLoadError('Không thể tải danh sách thiết bị');
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchDevices();
  }, []);

  return (
    <PageContainer pageTitle='Simulator' pageDescription='Giả lập dữ liệu thiết bị IoT'>
      {loadError ? (
        <Alert variant='destructive' className='mb-4'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Lỗi tải thiết bị</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className='grid gap-4 lg:grid-cols-3'>
        <DeviceSelector
          devices={devices}
          selectedDevice={selectedDevice}
          onDeviceSelect={updateDevice}
          loading={loadingDevices}
        />

        <div className='lg:col-span-2 grid gap-4 lg:grid-cols-2'>
          <DataConfigurator config={dataConfig} onConfigChange={updateDataConfig} />
          <SimulatorControls
            isSending={isSending}
            isAutoMode={isAutoMode}
            autoInterval={dataConfig.autoInterval}
            onSendData={sendData}
            onSendStopData={sendStopData}
            onGenerateRandom={generateRandomData}
            onToggleAutoMode={toggleAutoMode}
            disabled={!selectedDevice}
          />
        </div>
      </div>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <DataPreview data={currentData} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

