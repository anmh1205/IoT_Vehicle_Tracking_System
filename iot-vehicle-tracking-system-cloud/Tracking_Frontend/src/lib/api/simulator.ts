import { apiClient, unwrap } from './client';

export interface SimulatorConfig {
  deviceIds: string[];
  intervalSec: number;
  durationMin: number;
  speedMin: number;
  speedMax: number;
  imuAccelDeltaMinMps2: number;
  imuAccelDeltaMaxMps2: number;
  batteryMin: number;
  batteryMax: number;
  lat: number;
  lon: number;
}

export const simulatorServices = {
  start: (payload: SimulatorConfig) =>
    apiClient.post('/simulator/start', payload).then((response) => unwrap<any>(response.data)),
  stop: () => apiClient.post('/simulator/stop').then((response) => unwrap<any>(response.data)),
  pause: () => apiClient.post('/simulator/pause').then((response) => unwrap<any>(response.data)),
  resume: () => apiClient.post('/simulator/resume').then((response) => unwrap<any>(response.data)),
  status: () => apiClient.get('/simulator/status').then((response) => unwrap<any>(response.data)),
};
