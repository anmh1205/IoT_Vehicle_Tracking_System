import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  async check() {
    return this.healthService.getBasicHealth();
  }

  @Get('db')
  @ApiOperation({ summary: 'Database health check' })
  async checkDatabase() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('influxdb')
  @ApiOperation({ summary: 'InfluxDB health check' })
  async checkInfluxDB() {
    return this.healthService.getInfluxDBHealth();
  }

  @Get('mqtt')
  @ApiOperation({ summary: 'MQTT broker health check' })
  async checkMQTT() {
    return this.healthService.getMQTTHealth();
  }
}

