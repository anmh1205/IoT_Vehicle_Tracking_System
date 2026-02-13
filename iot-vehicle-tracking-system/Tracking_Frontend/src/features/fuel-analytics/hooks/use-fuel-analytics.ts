import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api/client';
import type {
  FuelSummary,
  VehicleFuelData,
  FuelTrend,
  FuelAnalyticsParams,
} from '@/features/fuel-analytics/types';

const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const defaultTo = new Date().toISOString().slice(0, 10);

export const useFuelAnalyticsParams = (): FuelAnalyticsParams => {
  return useMemo(
    () => ({
      from: defaultFrom,
      to: defaultTo,
      interval: 'day' as const,
    }),
    [],
  );
};

export const useFuelSummary = (params: FuelAnalyticsParams) => {
  return useQuery<FuelSummary>({
    queryKey: ['fuel-analytics', 'summary', params],
    queryFn: async () => {
      const response = await apiClient.get('/fuel-analytics/summary', {
        params: { from: params.from, to: params.to },
      });
      const data = unwrap<FuelSummary>(response.data);
      return {
        totalFuelUsed: Number(data.totalFuelUsed ?? 0),
        totalDistance: Number(data.totalDistance ?? 0),
        avgConsumption: Number(data.avgConsumption ?? 0),
        totalCost: Number(data.totalCost ?? 0),
        tripCount: Number(data.tripCount ?? 0),
      };
    },
  });
};

export const useFuelByVehicle = (params: FuelAnalyticsParams) => {
  return useQuery<VehicleFuelData[]>({
    queryKey: ['fuel-analytics', 'by-vehicle', params],
    queryFn: async () => {
      const response = await apiClient.get('/fuel-analytics/by-vehicle', {
        params: { from: params.from, to: params.to },
      });
      const data = unwrap<{ vehicles: VehicleFuelData[] }>(response.data);
      return (data.vehicles ?? []).map((v) => ({
        vehicleId: String(v.vehicleId ?? ''),
        plateNumber: String(v.plateNumber ?? ''),
        totalFuel: Number(v.totalFuel ?? 0),
        totalDistance: Number(v.totalDistance ?? 0),
        avgConsumption: Number(v.avgConsumption ?? 0),
        tripCount: Number(v.tripCount ?? 0),
      }));
    },
  });
};

export const useFuelTrends = (params: FuelAnalyticsParams) => {
  return useQuery<FuelTrend[]>({
    queryKey: ['fuel-analytics', 'trends', params],
    queryFn: async () => {
      const response = await apiClient.get('/fuel-analytics/trends', {
        params: { from: params.from, to: params.to, interval: params.interval },
      });
      const data = unwrap<{ trends: FuelTrend[] }>(response.data);
      return (data.trends ?? []).map((t) => ({
        date: String(t.date ?? ''),
        fuelUsed: Number(t.fuelUsed ?? 0),
        distance: Number(t.distance ?? 0),
        consumption: Number(t.consumption ?? 0),
      }));
    },
  });
};
