import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { simulatorServices, type SimulatorConfig } from '@/lib/api/simulator';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
export interface SimulatorPayload {
  deviceId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  vibration: number;
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
  vibrationMin: 1,
  vibrationMax: 10,
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
  vibration: Number(raw?.vibration ?? 0),
  vehicleBattery: Number(raw?.vehicleBattery ?? 0),
  deviceBattery: Number(raw?.deviceBattery ?? 0),
  errorCode:
    raw?.errorCode !== undefined && raw?.errorCode !== null
      ? Number(raw.errorCode)
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
    return 'Vui lòng chọn ít nhất một thiết bị.';
  }
  if (state.speedMin > state.speedMax) {
    return 'Tốc độ tối thiểu phải nhỏ hơn hoặc bằng tốc độ tối đa.';
  }
  if (state.vibrationMin > state.vibrationMax) {
    return 'Rung động tối thiểu phải nhỏ hơn hoặc bằng rung động tối đa.';
  }
  if (state.batteryMin > state.batteryMax) {
    return 'Pin tối thiểu phải nhỏ hơn hoặc bằng pin tối đa.';
  }
  if (!Number.isFinite(state.lat) || !Number.isFinite(state.lon)) {
    return 'Vĩ độ và kinh độ phải là số hợp lệ.';
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
      notificationUtils.success('Đã bắt đầu mô phỏng');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Không thể bắt đầu mô phỏng', getApiErrorMessage(error, 'Lỗi không xác định'));
    },
  });
  const stopMutation = useMutation({
    mutationFn: async () => simulatorServices.stop().then((response) => normalizeStatus(response)),
    onSuccess: (status) => {
      applyStatus(status);
      void queryClient.invalidateQueries({ queryKey: ['simulator', 'status'] });
      notificationUtils.info('Đã dừng mô phỏng');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Không thể dừng mô phỏng', getApiErrorMessage(error, 'Lỗi không xác định'));
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
      notificationUtils.info('Đã tạm dừng mô phỏng');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Không thể tạm dừng mô phỏng',
        getApiErrorMessage(error, 'Lỗi không xác định'),
      );
    },
  });
  const resumeMutation = useMutation({
    mutationFn: async () =>
      simulatorServices.resume().then((response) => normalizeStatus(response)),
    onSuccess: (status) => {
      applyStatus(status);
      void queryClient.invalidateQueries({ queryKey: ['simulator', 'status'] });
      notificationUtils.info('Đã tiếp tục mô phỏng');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Không thể tiếp tục mô phỏng',
        getApiErrorMessage(error, 'Lỗi không xác định'),
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
      return 'Đã dừng';
    }
    return paused ? 'Đã tạm dừng (xem trước)' : 'Đang chạy';
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
