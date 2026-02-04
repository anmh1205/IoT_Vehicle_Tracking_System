import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DevicesModule } from './modules/devices/devices.module';
import { CustomersModule } from './modules/customers/customers.module';
import { TripsModule } from './modules/trips/trips.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ViolationsModule } from './modules/violations/violations.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { CommandsModule } from './modules/commands/commands.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';

// Gateway
import { RealtimeGateway } from './gateway/realtime.gateway';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['../.env', '.env'],
        }),

        // Database
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get('DB_USER', 'postgres'),
                password: configService.get('DB_PASSWORD', ''),
                database: configService.get('DB_NAME', 'vehicle_tracking'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: configService.get('NODE_ENV') !== 'production',
                logging: configService.get('NODE_ENV') === 'development',
            }),
            inject: [ConfigService],
        }),

        // Feature modules
        AuthModule,
        VehiclesModule,
        DevicesModule,
        CustomersModule,
        TripsModule,
        AlertsModule,
        ViolationsModule,
        GeofencesModule,
        MaintenanceModule,
        CommandsModule,
        NotificationsModule,
        TelemetryModule,
        DashboardModule,
        HealthModule,
    ],
    providers: [RealtimeGateway],
})
export class AppModule { }
