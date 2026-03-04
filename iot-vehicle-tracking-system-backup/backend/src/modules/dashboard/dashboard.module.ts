import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TripsModule } from '../trips/trips.module';

@Module({
    imports: [VehiclesModule, AlertsModule, TripsModule],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
