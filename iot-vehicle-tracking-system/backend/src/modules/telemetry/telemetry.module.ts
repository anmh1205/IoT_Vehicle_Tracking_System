import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { DevicesModule } from '@/modules/devices/devices.module';
import { VehiclesModule } from '@/modules/vehicles/vehicles.module';
import { InfluxDBModule } from '@/infrastructure/influxdb/influxdb.module';

@Module({
  imports: [InfluxDBModule, DevicesModule, VehiclesModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}

