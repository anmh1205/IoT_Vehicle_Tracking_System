import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { simulatorServices, type SimulatorConfig } from '@/lib/api/simulator';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';

export interface SimulatorPayload {
  deviceId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  imuAccelDeltaMps2: number;
  vehicleBattery: number;
  deviceBattery: number;
  errorCode?: number | null;
}

interface SimulatorStatusPayload {
  running: boolean;
  paused: boolean;
  jobId: string | null;
  lastTickAt: string | null;
  intervalSec: number | null;
  durationMin: number | null;
  preview: unknown[];
}

export interface SimulatorState extends SimulatorConfig {
  selectedDeviceIds: string[];
}

export const DEFAULT_SIMULATOR_STATE: SimulatorState = {
  selectedDeviceIds: [],
  deviceIds: [],
  intervalSec: 5,
  durationMin: 15,
  speedMin: 10,
  speedMax: 80,
  imuAccelDeltaMinMps2: 1,
  imuAccelDeltaMaxMps2: 10,
  batteryMin: 30,
  batteryMax: 100,
  lat: 10.762622,
  lon: 106.660172,
};

const normalizePoint = (raw: any): SimulatorPayload => ({
  deviceId: String(raw?.deviceId ?? ''),
  timestamp: String(raw?.timestamp ?? new Date().toISOString()),
  latitude: Number(raw?.latitude ?? 0),
  longitude: Number(raw?.longitude ?? 0),
  speed: Number(raw?.speed ?? 0),
  heading: raw?.heading !== undefined && raw?.heading !== null ? Number(raw.heading) : undefined,
  imuAccelDeltaMps2: Number(
    raw?.imuAccelDeltaMps2 ?? raw?.imu_accel_delta_mps2 ?? raw?.vibration ?? 0,
  ),
  vehicleBattery: Number(raw?.vehicleBattery ?? 0),
  deviceBattery: Number(raw?.deviceBattery ?? 0),
  errorCode:
    raw?.errorCode !== undefined && raw?.errorCode !== null ? Number(raw.errorCode) : null,
});

const normalizeStatus = (raw: any): SimulatorStatusPayload => ({
  running: Boolean(raw?.running),
  paused: Boolean(raw?.paused),
  jobId: raw?.jobId ?? null,
  lastTickAt: raw?.lastTickAt ?? null,
  intervalSec: raw?.intervalSec ?? null,
  durationMin: raw?.durationMin ?? null,
  preview: Array.isArray(raw?.preview) ? raw.preview : [],
});

const validateBeforeStart = (state: SimulatorState): string | null => {
  if (state.selectedDeviceIds.length === 0) {
    return 'Vui lÃ²ng chá»n Ã­t nháº¥t má»™t thiáº¿t bá»‹.';
  }
  if (state.speedMin > state.speedMax) {
    return 'Tá»‘c Ä‘á»™ tá»‘i thiá»ƒu pháº£i nhá» hÆ¡n hoáº·c báº±ng tá»‘c Ä‘á»™ tá»‘i Ä‘a.';
  }
  if (state.imuAccelDeltaMinMps2 > state.imuAccelDeltaMaxMps2) {
    return 'Gia tá»‘c IMU Î” tá»‘i thiá»ƒu pháº£i nhá» hÆ¡n hoáº·c báº±ng gia tá»‘c IMU Î” tá»‘i Ä‘a.';
  }
  if (state.batteryMin > state.batteryMax) {
    return 'Pin tá»‘i thiá»ƒu pháº£i nhá» hÆ¡n hoáº·c báº±ng pin tá»‘i Ä‘a.';
  }
  if (!Number.isFinite(state.lat) || !Number.isFinite(state.lon)) {
    return 'VÄ© Ä‘á»™ vÃ  kinh Ä‘á»™ pháº£i lÃ  sá»‘ há»£p lá»‡.';
  }
  return null;
};

export const useSimulator = () => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SimulatorState>(DEFAULT_SIMULATOR_STATE);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<SimulatorPayload | null>(null);
  const [history, setHistory] = useState<SimulatorPayload[]>([]);

  const applyStatus = useCallback((payload: SimulatorStatusPayload) => {
    setRunning(payload.running);
    setPaused(payload.running ? payload.paused : false);
    const points = payload.preview.map(normalizePoint);
    setPreview(points[0] ?? null);
    setHistory(points.slice(0, 80));
  }, []);

  const statusQuery = useQuery({
    queryKey: ['simulator', 'status'],
    queryFn: () => simulatorServices.status().then((payload) => normalizeStatus(payload)),
  });

  useEffect(() => {
    if (!statusQuery.data) {
      return;
    }
    applyStatus(statusQuery.data);
  }, [statusQuery.data, applyStatus]);

  useRealtimeSubscription({
    namespace: 'dashboard',
    event: 'simulator:status',
    handler: (payload: unknown) => {
      const status = normalizeStatus(payload);
      applyStatus(status);
      queryClient.setQueryData(['simulator', 'status'], status);
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const payload: SimulatorConfig = {
        ...state,
        deviceIds: state.selectedDeviceIds,
      };
      return simulatorServices.start(payload).then((response) => normalizeStatus(response));
    },
    onSuccess: (status) => {
      applyStatus(status);
      queryClient.setQueryData(['simulator', 'status'], status);
      notificationUtils.success('ÄÃ£ báº¯t Ä‘áº§u mÃ´ phá»ng');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'KhÃ´ng thá»ƒ báº¯t Ä‘áº§u mÃ´ phá»ng',
        getApiErrorMessage(error, 'Lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh'),
      );
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => simulatorServices.stop().then((response) => normalizeStatus(response)),
    onSuccess: (status) => {
      applyStatus(status);
      queryClient.setQueryData(['simulator', 'status'], status);
      notificationUtils.info('ÄÃ£ dá»«ng mÃ´ phá»ng');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'KhÃ´ng thá»ƒ dá»«ng mÃ´ phá»ng',
        getApiErrorMessage(error, 'Lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh'),
      );
    },
  });

  const start = async () => {
    const validationError = validateBeforeStart(state);
    if (validationError) {
      notificationUtils.warning(validationError);
      return;
    }
    await startMutation.mutateAsync();
  };

  const stop = async () => {
    await stopMutation.mutateAsync();
  };

  const pauseMutation = useMutation({
    mutationFn: async () => simulatorServices.pause().then((response) => normalizeStatus(response)),
    onSuccess: (status) => {
      applyStatus(status);
      queryClient.setQueryData(['simulator', 'status'], status);
      notificationUtils.info('ÄÃ£ táº¡m dá»«ng mÃ´ phá»ng');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'KhÃ´ng thá»ƒ táº¡m dá»«ng mÃ´ phá»ng',
        getApiErrorMessage(error, 'Lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh'),
      );
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => simulatorServices.resume().then((response) => normalizeStatus(response)),
    onSuccess: (status) => {
      applyStatus(status);
      queryClient.setQueryData(['simulator', 'status'], status);
      notificationUtils.info('ÄÃ£ tiáº¿p tá»¥c mÃ´ phá»ng');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'KhÃ´ng thá»ƒ tiáº¿p tá»¥c mÃ´ phá»ng',
        getApiErrorMessage(error, 'Lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh'),
      );
    },
  });

  const pause = () => {
    void pauseMutation.mutateAsync();
  };

  const resume = () => {
    void resumeMutation.mutateAsync();
  };

  const setSelectedDeviceIds = (deviceIds: string[]) => {
    setState((prev) => ({ ...prev, selectedDeviceIds: deviceIds, deviceIds }));
  };

  const setConfig = <TKey extends keyof SimulatorState>(key: TKey, value: SimulatorState[TKey]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const statusLabel = useMemo(() => {
    if (!running) {
      return 'ÄÃ£ dá»«ng';
    }
    return paused ? 'ÄÃ£ táº¡m dá»«ng (xem trÆ°á»›c)' : 'Äang cháº¡y';
  }, [paused, running]);

  return {
    state,
    running,
    paused,
    statusLabel,
    preview,
    history,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isStatusLoading: statusQuery.isLoading,
    setSelectedDeviceIds,
    setConfig,
    start,
    stop,
    pause,
    resume,
  };
};
