import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration, {
  databaseConfig,
  influxdbConfig,
  mqttConfig,
  authConfig,
  logConfig,
  notificationsConfig,
} from './config/configuration';
import { validate } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DevicesModule } from './modules/devices/devices.module';
import { TripsModule } from './modules/trips/trips.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ViolationsModule } from './modules/violations/violations.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { CommandsModule } from './modules/commands/commands.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InfluxDBModule } from './infrastructure/influxdb/influxdb.module';
import { MqttModule } from './infrastructure/mqtt/mqtt.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        configuration,
        databaseConfig,
        influxdbConfig,
        mqttConfig,
        authConfig,
        logConfig,
        notificationsConfig,
      ],
      validate,
      // In Docker/production, don't load .env files - use environment variables from docker-compose
      envFilePath: process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true' ? [] : ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('database.host');
        console.log(`[TypeORM] Connecting to database at: ${host}:${configService.get('database.port')}`);
        return {
          type: 'postgres',
          host: host,
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.database'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: configService.get('database.synchronize'),
          logging: configService.get('database.logging'),
        };
      },
      inject: [ConfigService],
    }),

    // Infrastructure modules
    InfluxDBModule,
    MqttModule,

    // Feature modules
    HealthModule,
    AuthModule,
    VehiclesModule,
    CustomersModule,
    DevicesModule,
    TripsModule,
    AlertsModule,
    ViolationsModule,
    TelemetryModule,
    GeofencesModule,
    MaintenanceModule,
    CommandsModule,
    NotificationsModule,
    WebSocketModule,
    // ...
  ],
})
export class AppModule {}

