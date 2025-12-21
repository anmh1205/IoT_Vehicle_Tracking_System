'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceServices } from '@/lib/api/device';
import { notificationUtils } from '@/lib/notification';

export type DataConfig = {
  vibration: { target: number; lowerBound: number; upperBound: number };
  battery_top: { target: number; lowerBound: number; upperBound: number };
  battery_bot: { target: number; lowerBound: number; upperBound: number };
  acPower: boolean;
  errorCode: number;
  autoInterval: number;
};

export function useSimulator() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [dataConfig, setDataConfig] = useState<DataConfig>({
    vibration: { target: 4, lowerBound: 1, upperBound: 1 },
    battery_top: { target: 1.85, lowerBound: 0.1, upperBound: 0.1 },
    battery_bot: { target: 1.85, lowerBound: 0.1, upperBound: 0.1 },
    acPower: true,
    errorCode: 0,
    autoInterval: 2000
  });
  const [currentData, setCurrentData] = useState<Record<string, unknown>>({});
  const [isSending, setIsSending] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateDevice = (id: string | null) => setSelectedDevice(id);

  const updateDataConfig = (partial: Partial<DataConfig>) => {
    setDataConfig((prev) => ({
      ...prev,
      ...partial,
      vibration: partial.vibration ? { ...prev.vibration, ...partial.vibration } : prev.vibration,
      battery_top: partial.battery_top ? { ...prev.battery_top, ...partial.battery_top } : prev.battery_top,
      battery_bot: partial.battery_bot ? { ...prev.battery_bot, ...partial.battery_bot } : prev.battery_bot
    }));
  };

  const generateRandomData = () => {
    const vib =
      dataConfig.vibration.target +
      (Math.random() * (dataConfig.vibration.upperBound + dataConfig.vibration.lowerBound) - dataConfig.vibration.lowerBound);
    const batteryTop =
      dataConfig.battery_top.target +
      (Math.random() * (dataConfig.battery_top.upperBound + dataConfig.battery_top.lowerBound) - dataConfig.battery_top.lowerBound);
    const batteryBot =
      dataConfig.battery_bot.target +
      (Math.random() * (dataConfig.battery_bot.upperBound + dataConfig.battery_bot.lowerBound) - dataConfig.battery_bot.lowerBound);
    const batteryTotal = Math.max(0, batteryTop) + Math.max(0, batteryBot);
    return {
      device_id: selectedDevice,
      vibration: Number(vib.toFixed(2)),
      battery: Number(batteryTotal.toFixed(2)), // Keep for display compatibility
      battery_top: Number(Math.max(0, batteryTop).toFixed(2)),
      battery_bot: Number(Math.max(0, batteryBot).toFixed(2)),
      ac_power: dataConfig.acPower,
      error_code: dataConfig.errorCode,
      timestamp: new Date().toISOString()
    };
  };

  const sendData = useCallback(async (isManual = false) => {
    if (!selectedDevice) return;
    
    // Turn off auto mode if manually triggered
    if (isManual && isAutoMode) {
      setIsAutoMode(false);
      // Clear interval immediately
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    setIsSending(true);
    try {
      const vib =
        dataConfig.vibration.target +
        (Math.random() * (dataConfig.vibration.upperBound + dataConfig.vibration.lowerBound) - dataConfig.vibration.lowerBound);
      const batteryTop =
        dataConfig.battery_top.target +
        (Math.random() * (dataConfig.battery_top.upperBound + dataConfig.battery_top.lowerBound) - dataConfig.battery_top.lowerBound);
      const batteryBot =
        dataConfig.battery_bot.target +
        (Math.random() * (dataConfig.battery_bot.upperBound + dataConfig.battery_bot.lowerBound) - dataConfig.battery_bot.lowerBound);
      const batteryTotal = Math.max(0, batteryTop) + Math.max(0, batteryBot);
      const payload = {
        device_id: selectedDevice,
        vibration: Number(vib.toFixed(2)),
        battery: Number(batteryTotal.toFixed(2)), // Keep for display compatibility
        battery_top: Number(Math.max(0, batteryTop).toFixed(2)),
        battery_bot: Number(Math.max(0, batteryBot).toFixed(2)),
        ac_power: dataConfig.acPower,
        error_code: dataConfig.errorCode,
        timestamp: new Date().toISOString()
      };
      await deviceServices.sendRawData(payload);
      setCurrentData(payload);
      notificationUtils.success('Gửi dữ liệu thành công');
    } catch (error) {
      console.error('Error sending raw data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể gửi dữ liệu lên server';
      notificationUtils.error('Gửi dữ liệu thất bại', errorMessage);
      
      // If error occurs in auto mode, turn off auto mode
      if (isAutoMode) {
        setIsAutoMode(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } finally {
      setIsSending(false);
    }
  }, [selectedDevice, dataConfig, isAutoMode]);

  const sendStopData = async () => {
    if (!selectedDevice) return;
    
    // Turn off auto mode if it's enabled
    if (isAutoMode) {
      setIsAutoMode(false);
    }
    
    setIsSending(true);
    try {
      const payload = { device_id: selectedDevice, status: 'stopped', timestamp: new Date().toISOString() };
      await deviceServices.sendRawData(payload);
      setCurrentData(payload);
      notificationUtils.success('Gửi tín hiệu dừng thành công');
    } catch (error) {
      console.error('Error sending stop data:', error);
      notificationUtils.error('Gửi tín hiệu dừng thất bại', 'Không thể gửi tín hiệu dừng lên server');
    } finally {
      setIsSending(false);
    }
  };

  const toggleAutoMode = () => {
    setIsAutoMode((prev) => !prev);
  };

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isAutoMode && selectedDevice) {
      intervalRef.current = setInterval(() => {
        void sendData(false); // false = not manual, called from auto mode
      }, dataConfig.autoInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoMode, dataConfig.autoInterval, selectedDevice, sendData]);

  return {
    selectedDevice,
    dataConfig,
    currentData,
    isSending,
    isAutoMode,
    updateDevice,
    updateDataConfig,
    generateRandomData: () => {
      const payload = generateRandomData();
      setCurrentData(payload);
    },
    sendData,
    sendStopData,
    toggleAutoMode
  };
}

