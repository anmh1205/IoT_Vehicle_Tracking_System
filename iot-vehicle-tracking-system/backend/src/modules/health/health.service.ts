import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InfluxDBService } from '@/infrastructure/influxdb/influxdb.service';
import { MqttService } from '@/infrastructure/mqtt/mqtt.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly configService: ConfigService,
    private readonly influxDBService: InfluxDBService,
    private readonly mqttService: MqttService
  ) {}

  async getBasicHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }

  async getDatabaseHealth() {
    try {
      await this.connection.query('SELECT 1');
      return {
        status: 'healthy',
        service: 'postgresql',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        service: 'postgresql',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getInfluxDBHealth() {
    try {
      const isHealthy = await this.influxDBService.healthCheck();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'influxdb',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('InfluxDB health check failed:', error);
      return {
        status: 'unhealthy',
        service: 'influxdb',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getMQTTHealth() {
    try {
      const status = this.mqttService.getConnectionStatus();
      return {
        status: status.connected ? 'healthy' : 'unhealthy',
        service: 'mqtt',
        reconnectAttempts: status.reconnectAttempts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('MQTT health check failed:', error);
      return {
        status: 'unhealthy',
        service: 'mqtt',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

