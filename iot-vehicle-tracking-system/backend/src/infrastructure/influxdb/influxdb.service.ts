import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InfluxDB,
  Point,
  QueryApi,
  WriteApi,
  flux,
} from '@influxdata/influxdb-client';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class InfluxDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(InfluxDBService.name);
  private client: InfluxDB;
  private writeApi: WriteApi;
  private queryApi: QueryApi;
  private org: string;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('influxdb.url');
    const token = this.configService.getOrThrow<string>('influxdb.token');
    this.org = this.configService.getOrThrow<string>('influxdb.org');
    this.bucket = this.configService.getOrThrow<string>('influxdb.bucket');

    this.client = new InfluxDB({ url, token });
    this.queryApi = this.client.getQueryApi(this.org);
    this.writeApi = this.client.getWriteApi(this.org, this.bucket, 'ns');

    // Configure write API
    this.writeApi.useDefaultTags({
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
    });
  }

  onModuleInit() {
    this.logger.log('InfluxDB service initialized');
  }

  onModuleDestroy() {
    this.writeApi.close();
    this.logger.log('InfluxDB service closed');
  }

  /**
   * Write location data to InfluxDB
   */
  async writeLocation(data: {
    deviceId: string;
    vehicleId?: string;
    lat: number;
    lon: number;
    alt?: number;
    speed?: number;
    course?: number;
    satellites?: number;
    timestamp?: Date;
  }): Promise<void> {
    try {
      const point = new Point('location')
        .tag('device_id', data.deviceId)
        .floatField('lat', data.lat)
        .floatField('lon', data.lon);

      if (data.vehicleId) {
        point.tag('vehicle_id', data.vehicleId);
      }
      if (data.alt !== undefined) {
        point.floatField('alt', data.alt);
      }
      if (data.speed !== undefined) {
        point.floatField('speed', data.speed);
      }
      if (data.course !== undefined) {
        point.floatField('course', data.course);
      }
      if (data.satellites !== undefined) {
        point.intField('satellites', data.satellites);
      }
      if (data.timestamp) {
        point.timestamp(data.timestamp);
      }

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
    } catch (error) {
      this.logger.error(
        `Failed to write location data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Write OBD2 data to InfluxDB
   */
  async writeOBD2Data(data: {
    deviceId: string;
    vehicleId?: string;
    ign: boolean;
    rpm?: number;
    speed?: number;
    fuel?: number;
    temp?: number;
    timestamp?: Date;
  }): Promise<void> {
    try {
      const point = new Point('obd2_data')
        .tag('device_id', data.deviceId)
        .booleanField('ign', data.ign);

      if (data.vehicleId) {
        point.tag('vehicle_id', data.vehicleId);
      }
      if (data.rpm !== undefined) {
        point.intField('rpm', data.rpm);
      }
      if (data.speed !== undefined) {
        point.intField('speed', data.speed);
      }
      if (data.fuel !== undefined) {
        point.intField('fuel', data.fuel);
      }
      if (data.temp !== undefined) {
        point.intField('temp', data.temp);
      }
      if (data.timestamp) {
        point.timestamp(data.timestamp);
      }

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
    } catch (error) {
      this.logger.error(
        `Failed to write OBD2 data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Write power data to InfluxDB
   */
  async writePowerData(data: {
    deviceId: string;
    vehicleId?: string;
    batteryVoltage: number;
    backupBattery?: number;
    powerSource: 'battery' | 'backup';
    chargerEnabled: boolean;
    timestamp?: Date;
  }): Promise<void> {
    try {
      const point = new Point('power')
        .tag('device_id', data.deviceId)
        .floatField('battery_voltage', data.batteryVoltage)
        .stringField('power_source', data.powerSource)
        .booleanField('charger_enabled', data.chargerEnabled);

      if (data.vehicleId) {
        point.tag('vehicle_id', data.vehicleId);
      }
      if (data.backupBattery !== undefined) {
        point.floatField('backup_battery', data.backupBattery);
      }
      if (data.timestamp) {
        point.timestamp(data.timestamp);
      }

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
    } catch (error) {
      this.logger.error(
        `Failed to write power data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Write IMU data to InfluxDB
   */
  async writeIMUData(data: {
    deviceId: string;
    vehicleId?: string;
    accelX: number;
    accelY: number;
    accelZ: number;
    motionDetected: boolean;
    timestamp?: Date;
  }): Promise<void> {
    try {
      const point = new Point('imu_data')
        .tag('device_id', data.deviceId)
        .floatField('accel_x', data.accelX)
        .floatField('accel_y', data.accelY)
        .floatField('accel_z', data.accelZ)
        .booleanField('motion_detected', data.motionDetected);

      if (data.vehicleId) {
        point.tag('vehicle_id', data.vehicleId);
      }
      if (data.timestamp) {
        point.timestamp(data.timestamp);
      }

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
    } catch (error) {
      this.logger.error(
        `Failed to write IMU data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Query location data with parameterized query
   */
  async queryLocation(
    deviceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      // Use parameterized query to prevent injection
      const query = flux`
        from(bucket: "${this.bucket}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r["_measurement"] == "location")
          |> filter(fn: (r) => r["device_id"] == "${deviceId.replace(/"/g, '\\"')}")
          |> sort(columns: ["_time"], desc: false)
      `;

      this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row);
          results.push({
            time: record._time,
            lat: record.lat,
            lon: record.lon,
            alt: record.alt,
            speed: record.speed,
            course: record.course,
            satellites: record.satellites,
          });
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });
  }

  /**
   * Check InfluxDB connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = this.configService.getOrThrow<string>('influxdb.url');
      const response = await fetch(`${url}/health`);
      return response.ok;
    } catch (error) {
      this.logger.error('InfluxDB health check failed:', error);
      return false;
    }
  }
}

