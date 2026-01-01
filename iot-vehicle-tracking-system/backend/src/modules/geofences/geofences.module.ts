import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeofencesController } from './geofences.controller';
import { GeofencesService } from './geofences.service';
import { Geofence } from './entities/geofence.entity';
import { VehiclesModule } from '@/modules/vehicles/vehicles.module';

@Module({
  imports: [TypeOrmModule.forFeature([Geofence]), VehiclesModule],
  controllers: [GeofencesController],
  providers: [GeofencesService],
  exports: [GeofencesService],
})
export class GeofencesModule {}

