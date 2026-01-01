import { Module, Global } from '@nestjs/common';
import { InfluxDBService } from './influxdb.service';

@Global()
@Module({
  providers: [InfluxDBService],
  exports: [InfluxDBService],
})
export class InfluxDBModule {}

