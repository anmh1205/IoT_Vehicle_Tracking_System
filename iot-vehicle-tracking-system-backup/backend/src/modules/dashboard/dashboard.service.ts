import { Injectable } from '@nestjs/common';
import { VehiclesService } from '../vehicles/vehicles.service';
import { AlertsService } from '../alerts/alerts.service';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class DashboardService {
    constructor(
        private readonly vehiclesService: VehiclesService,
        private readonly alertsService: AlertsService,
        private readonly tripsService: TripsService,
    ) { }

    async getStats() {
        const [vehicleStats, alertStats, tripStats] = await Promise.all([
            this.vehiclesService.getStats(),
            this.alertsService.getStats(),
            this.tripsService.getStats(),
        ]);

        return {
            vehicles: vehicleStats,
            alerts: alertStats,
            trips: tripStats,
        };
    }
}
