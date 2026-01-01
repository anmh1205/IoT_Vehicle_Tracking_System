import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceInterceptor } from './common/interceptors/trace.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';

let appInstance: INestApplication;

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  if (appInstance) {
    await appInstance.close();
  }
  process.exit(0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin', '*'),
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
    })
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new TraceInterceptor(),
    new LoggingInterceptor(),
    new TransformInterceptor()
  );

  // Swagger documentation
  if (configService.get<string>('app.nodeEnv') !== 'production') {
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
        'JWT-auth'
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
      .addTag('notifications', 'Notification management')
      .addServer('http://localhost:3000', 'Development server')
      .addServer('https://api.example.com', 'Production server')
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

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  // Store app instance for graceful shutdown
  appInstance = app;

  console.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`
  );
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

// Graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Promise Rejection:', reason);
  const configService = new ConfigService();
  if (configService.get<string>('app.nodeEnv') === 'production') {
    shutdown('unhandledRejection');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  const configService = new ConfigService();
  if (configService.get<string>('app.nodeEnv') === 'production') {
    shutdown('uncaughtException');
  }
});

bootstrap();

