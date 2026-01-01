import { Injectable, Logger } from '@nestjs/common';
import { InfluxDBService } from '@/infrastructure/influxdb/influxdb.service';
import { DevicesService } from '@/modules/devices/devices.service';
import { VehiclesService } from '@/modules/vehicles/vehicles.service';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class TelemetryService {
  private readonly logger = createLogger(TelemetryService.name);

  constructor(
    private readonly influxDBService: InfluxDBService,
    private readonly devicesService: DevicesService,
    private readonly vehiclesService: VehiclesService
  ) {}

  async getLocation(
    deviceId: string,
    startTime: Date,
    endTime: Date,
    interval?: string
  ) {
    const data = await this.influxDBService.queryLocation(
      deviceId,
      startTime,
      endTime
    );

    // Get device and vehicle info
    const device = await this.devicesService.findByDeviceId(deviceId);

    return {
      device_id: deviceId,
      vehicle_id: device.vehicleId,
      data,
      total_points: data.length,
    };
  }

  async getHistory(
    vehicleId: number,
    startDate: Date,
    endDate: Date,
    includeStops?: boolean
  ) {
    // Get vehicle and device
    const vehicle = await this.vehiclesService.findOne(vehicleId);
    if (!vehicle.deviceId) {
      return {
        vehicle_id: vehicleId,
        period: { start: startDate, end: endDate },
        summary: {
          total_distance_km: 0,
          total_duration_minutes: 0,
          max_speed: 0,
          avg_speed: 0,
          stops_count: 0,
        },
        route: [],
        stops: [],
      };
    }

    const device = await this.devicesService.findOne(vehicle.deviceId);
    const locationData = await this.influxDBService.queryLocation(
      device.deviceId,
      startDate,
      endDate
    );

    // Calculate summary
    const distances: number[] = [];
    const speeds: number[] = [];
    let totalDistance = 0;

    for (let i = 1; i < locationData.length; i++) {
      const prev = locationData[i - 1];
      const curr = locationData[i];
      if (prev.lat && prev.lon && curr.lat && curr.lon) {
        // Simple distance calculation (Haversine would be better)
        const distance = this.calculateDistance(
          prev.lat,
          prev.lon,
          curr.lat,
          curr.lon
        );
        totalDistance += distance;
        distances.push(distance);
      }
      if (curr.speed) {
        speeds.push(curr.speed);
      }
    }

    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const avgSpeed =
      speeds.length > 0
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
        : 0;
    const durationMinutes = locationData.length > 0
      ? Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60)
        )
      : 0;

    return {
      vehicle_id: vehicleId,
      period: { start: startDate, end: endDate },
      summary: {
        total_distance_km: Math.round(totalDistance * 100) / 100,
        total_duration_minutes: durationMinutes,
        max_speed: Math.round(maxSpeed * 100) / 100,
        avg_speed: Math.round(avgSpeed * 100) / 100,
        stops_count: 0, // TODO: Calculate stops
      },
      route: locationData,
      stops: includeStops ? [] : undefined, // TODO: Calculate stops
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

