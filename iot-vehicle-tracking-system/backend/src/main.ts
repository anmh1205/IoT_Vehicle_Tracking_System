import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 4000);
    const apiPrefix = 'api/v1';

    // Global prefix
    app.setGlobalPrefix(apiPrefix);

    // CORS
    app.enableCors({
        origin: configService.get<string>('CORS_ORIGIN', '*'),
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Swagger documentation
    if (configService.get<string>('NODE_ENV') !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('IoT Vehicle Tracking API')
            .setDescription('API documentation for IoT Vehicle Tracking System')
            .setVersion('1.0')
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    name: 'JWT',
                    description: 'Enter JWT token',
                    in: 'header',
                },
                'JWT-auth',
            )
            .addTag('auth', 'Authentication endpoints')
            .addTag('vehicles', 'Vehicle management')
            .addTag('devices', 'Device management')
            .addTag('customers', 'Customer management')
            .addTag('trips', 'Trip tracking')
            .addTag('telemetry', 'Telemetry data')
            .addTag('alerts', 'Alert management')
            .addTag('violations', 'Violation tracking')
            .addTag('geofences', 'Geofence management')
            .addTag('maintenance', 'Maintenance records')
            .addTag('commands', 'Device commands')
            .addTag('notifications', 'Notification settings')
            .addTag('dashboard', 'Dashboard statistics')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
            },
        });
    }

    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
