import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { InfluxDBModule } from '@/infrastructure/influxdb/influxdb.module';
import { MqttModule } from '@/infrastructure/mqtt/mqtt.module';

@Module({
  imports: [InfluxDBModule, MqttModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

