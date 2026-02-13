import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { simulatorServices, type SimulatorConfig } from '@/lib/api/simulator';
import { notificationUtils } from '@/lib/notification';
export interface SimulatorPayload {
  deviceId: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed: number;
  heading?: number;
  vibration: number;
  battery: number;
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
  vibrationMin: 1,
  vibrationMax: 10,
  batteryMin: 30,
  batteryMax: 100,
  lat: 10.762622,
  lon: 106.660172,
};
const normalizePoint = (raw: any): SimulatorPayload => ({
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  timestamp: String(raw?.timestamp ?? new Date().toISOString()),
  lat: Number(raw?.lat ?? raw?.latitude ?? 0),
  lon: Number(raw?.lon ?? raw?.longitude ?? 0),
  speed: Number(raw?.speed ?? 0),
  heading: raw?.heading !== undefined && raw?.heading !== null ? Number(raw.heading) : undefined,
  vibration: Number(raw?.vibration ?? raw?.vib ?? 0),
  battery: Number(raw?.battery ?? raw?.batt ?? 0),
  errorCode:
    raw?.errorCode !== undefined && raw?.errorCode !== null
      ? Number(raw.errorCode)
      : raw?.err !== undefined && raw?.err !== null
        ? Number(raw.err)
        : null,
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
    return 'Please select at least one device.';
  }
  if (state.speedMin > state.speedMax) {
    return 'Speed min must be less than or equal to speed max.';
  }
  if (state.vibrationMin > state.vibrationMax) {
    return 'Vibration min must be less than or equal to vibration max.';
  }
  if (state.batteryMin > state.batteryMax) {
    return 'Battery min must be less than or equal to battery max.';
  }
  if (!Number.isFinite(state.lat) || !Number.isFinite(state.lon)) {
    return 'Latitude and longitude must be valid numbers.';
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
    refetchInterval: (query) => {
      const status = query.state.data as SimulatorStatusPayload | undefined;
      if (!status?.running) {
        return 10000;
      }
      const intervalSec = Number(status.intervalSec ?? state.intervalSec ?? 5);
      return Math.max(1000, Math.min(intervalSec * 1000, 5000));
    },
  });
  useEffect(() => {
    if (!statusQuery.data) {
      return;
    }
    applyStatus(statusQuery.data);
  }, [statusQuery.data, applyStatus]);
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
      void queryClient.invalidateQueries({ queryKey: ['simulator', 'status'] });
      notificationUtils.success('Simulation started');
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to start simulation',
        error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          error?.message ??
          'Unknown error',
      );
    },
  });
  const stopMutation = useMutation({
    mutationFn: async () => simulatorServices.stop().then((response) => normalizeStatus(response)),
    onSuccess: (status) => {
      applyStatus(status);
      void queryClient.invalidateQueries({ queryKey: ['simulator', 'status'] });
      notificationUtils.info('Simulation stopped');
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to stop simulation',
        error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          error?.message ??
          'Unknown error',
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
      void queryClient.invalidateQueries({ queryKey: ['simulator', 'status'] });
      notificationUtils.info('Simulation paused');
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to pause simulation',
        error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          error?.message ??
          'Unknown error',
      );
    },
  });
  const resumeMutation = useMutation({
    mutationFn: async () =>
      simulatorServices.resume().then((response) => normalizeStatus(response)),
    onSuccess: (status) => {
      applyStatus(status);
      void queryClient.invalidateQueries({ queryKey: ['simulator', 'status'] });
      notificationUtils.info('Simulation resumed');
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to resume simulation',
        error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          error?.message ??
          'Unknown error',
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
      return 'Stopped';
    }
    return paused ? 'Preview Paused' : 'Running';
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
