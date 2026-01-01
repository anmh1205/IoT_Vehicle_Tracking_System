# KẾ HOẠCH AGENT CODE BACKEND & FRONTEND

## MỤC LỤC

1. [Project Setup & Initialization](#project-setup--initialization)
2. [Nguyên Tắc & Quy Tắc Chung](#nguyên-tắc--quy-tắc-chung)
3. [Backend Coding Plan](#backend-coding-plan)
4. [Frontend Coding Plan](#frontend-coding-plan)
5. [Testing Strategy](#testing-strategy)
6. [Code Review Checklist](#code-review-checklist)

---

## PROJECT SETUP & INITIALIZATION

### 1. Initial Project Setup

#### 1.1 Create NestJS Project

```bash
# Create new NestJS project
cd iot-vehicle-tracking-system/backend
npx @nestjs/cli new . --skip-git --package-manager npm

# Or if project already exists, install dependencies
npm install
```

#### 1.2 Core Dependencies

**Required packages:**

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "@influxdata/influxdb-client": "^1.33.0",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "bcryptjs": "^2.4.3",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "zod": "^3.22.0",
    "@anatine/zod-nestjs": "^1.3.0",
    "mqtt": "^5.3.0",
    "socket.io": "^4.7.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcryptjs": "^2.4.2",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.9",
    "@types/passport-local": "^1.0.35",
    "@types/uuid": "^9.0.2",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^8.8.0",
    "eslint-plugin-prettier": "^5.0.0",
    "prettier": "^3.0.0",
    "source-map-support": "^0.5.21",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3",
    "jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "supertest": "^6.3.3"
  }
}
```

#### 1.3 Project Structure

```
backend/
├── src/
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── config/                          # Configuration
│   │   ├── configuration.ts             # Config service
│   │   ├── database.config.ts           # Database config
│   │   ├── influxdb.config.ts           # InfluxDB config
│   │   └── env.validation.ts            # Environment validation
│   │
│   ├── common/                          # Shared utilities
│   │   ├── decorators/                  # Custom decorators
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/                     # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/                      # Auth guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/                # Interceptors
│   │   │   ├── logging.interceptor.ts
│   │   │   └── trace.interceptor.ts
│   │   ├── pipes/                       # Validation pipes
│   │   │   └── validation.pipe.ts
│   │   ├── utils/                       # Utility functions
│   │   │   ├── response.util.ts
│   │   │   └── logger.util.ts
│   │   └── exceptions/                  # Custom exceptions
│   │       ├── business.exception.ts
│   │       └── validation.exception.ts
│   │
│   ├── infrastructure/                  # Infrastructure layer
│   │   ├── database/
│   │   │   └── database.module.ts
│   │   ├── influxdb/
│   │   │   └── influxdb.module.ts
│   │   ├── mqtt/
│   │   │   └── mqtt.module.ts
│   │   └── logger/
│   │       └── logger.module.ts
│   │
│   ├── modules/                         # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   │
│   │   ├── vehicles/
│   │   │   ├── vehicles.module.ts
│   │   │   ├── vehicles.controller.ts
│   │   │   ├── vehicles.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-vehicle.dto.ts
│   │   │   │   ├── update-vehicle.dto.ts
│   │   │   │   └── query-vehicle.dto.ts
│   │   │   └── entities/
│   │   │       └── vehicle.entity.ts
│   │   │
│   │   └── ... (other modules)
│   │
│   └── migrations/                      # Database migrations
│       └── ...
│
├── test/                                # E2E tests
│   ├── app.e2e-spec.ts
│   └── ...
│
├── .env.example                         # Environment template
├── .eslintrc.js                         # ESLint config
├── .prettierrc                          # Prettier config
├── nest-cli.json                        # Nest CLI config
├── package.json
├── tsconfig.json                        # TypeScript config
├── tsconfig.build.json                  # Build config
└── Dockerfile
```

#### 1.4 Configuration Files

**`tsconfig.json`:**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**`.eslintrc.js`:**

```javascript
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint/eslint-plugin"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "prefer-const": "error",
    "no-var": "error",
  },
};
```

**`.prettierrc`:**

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100,
  "arrowParens": "always"
}
```

#### 1.5 Environment Configuration

**`src/config/configuration.ts`:**

```typescript
import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  apiPrefix: process.env.API_PREFIX || "api/v1",
  corsOrigin: process.env.CORS_ORIGIN || "*",
}));

export const databaseConfig = registerAs("database", () => ({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vehicle_tracking",
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV === "development",
}));

export const influxdbConfig = registerAs("influxdb", () => ({
  url: process.env.INFLUXDB_URL || "http://localhost:8086",
  token: process.env.INFLUXDB_TOKEN || "",
  org: process.env.INFLUXDB_ORG || "vehicle_tracking",
  bucket: process.env.INFLUXDB_BUCKET || "telemetry",
}));
```

**`src/config/env.validation.ts`:**

```typescript
import { plainToInstance } from "class-transformer";
import { IsEnum, IsNumber, IsString, validateSync } from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  JWT_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

#### 1.6 Main Application Setup

**`src/main.ts`:**

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TraceInterceptor } from "./common/interceptors/trace.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>("app.apiPrefix", "api/v1");

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: configService.get<string>("app.corsOrigin", "*"),
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
  app.useGlobalInterceptors(new TraceInterceptor(), new LoggingInterceptor());

  // Swagger documentation
  if (configService.get<string>("app.nodeEnv") !== "production") {
    const config = new DocumentBuilder()
      .setTitle("IoT Vehicle Tracking API")
      .setDescription("API documentation for IoT Vehicle Tracking System")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter JWT token",
          in: "header",
        },
        "JWT-auth"
      )
      .addTag("auth", "Authentication endpoints")
      .addTag("vehicles", "Vehicle management")
      .addTag("devices", "Device management")
      .addTag("customers", "Customer management")
      .addTag("trips", "Trip tracking")
      .addTag("telemetry", "Telemetry data")
      .addTag("alerts", "Alert management")
      .addTag("violations", "Violation tracking")
      .addTag("geofences", "Geofence management")
      .addTag("maintenance", "Maintenance records")
      .addTag("commands", "Device commands")
      .addServer("http://localhost:3000", "Development server")
      .addServer("https://api.example.com", "Production server")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha",
      },
    });
  }

  // Health check endpoints sẽ được handle bởi HealthModule
  // Xem phần Health Check Module pattern bên dưới

  const port = configService.get<number>("app.port", 3000);
  await app.listen(port);

  // Store app instance for graceful shutdown
  appInstance = app;

  console.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`
  );
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

// Graceful shutdown
let appInstance: INestApplication;

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  if (appInstance) {
    await appInstance.close();
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled Promise Rejection:", reason);
  if (configService.get<string>("app.nodeEnv") === "production") {
    shutdown("unhandledRejection");
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  if (configService.get<string>("app.nodeEnv") === "production") {
    shutdown("uncaughtException");
  }
});

bootstrap();
```

#### 1.7 Root Module

**`src/app.module.ts`:**

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import configuration, { databaseConfig } from "./config/configuration";
import { validate } from "./config/env.validation";
import { AuthModule } from "./modules/auth/auth.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
// ... other modules

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig],
      validate,
      envFilePath: [".env.local", ".env"],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("database.host"),
        port: configService.get("database.port"),
        username: configService.get("database.username"),
        password: configService.get("database.password"),
        database: configService.get("database.database"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        migrations: [__dirname + "/migrations/*{.ts,.js}"],
        synchronize: configService.get("database.synchronize"),
        logging: configService.get("database.logging"),
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    VehiclesModule,
    // ... other modules
  ],
})
export class AppModule {}
```

---

## NGUYÊN TẮC & QUY TẮC CHUNG

### 1. Clean Code Principles

#### 1.1 Naming Conventions

**Backend (NestJS/TypeScript):**

- **Files**: `kebab-case.ts` (ví dụ: `vehicle.service.ts`, `auth.controller.ts`)
- **Classes**: `PascalCase` (ví dụ: `VehicleService`, `AuthController`)
- **Variables/Functions**: `camelCase` (ví dụ: `getVehicleById`, `vehicleId`)
- **Constants**: `UPPER_SNAKE_CASE` (ví dụ: `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`)
- **Interfaces/Types**: `PascalCase` với prefix `I` cho interfaces (ví dụ: `IVehicle`, `CreateVehicleDto`)

**Frontend (Next.js/React):**

- **Files**: `kebab-case.tsx` cho components, `camelCase.ts` cho utilities
- **Components**: `PascalCase` (ví dụ: `VehicleList`, `AuthGuard`)
- **Hooks**: `camelCase` với prefix `use` (ví dụ: `useVehicles`, `useAuth`)
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase` (ví dụ: `Vehicle`, `CreateVehicleRequest`)

#### 1.2 File Organization

**Backend Structure:**

```
module-name/
├── module-name.module.ts          # Module definition
├── module-name.controller.ts      # HTTP endpoints
├── module-name.service.ts         # Business logic
├── module-name.entity.ts          # Database entity
├── dto/                           # Data Transfer Objects
│   ├── create-module-name.dto.ts
│   ├── update-module-name.dto.ts
│   └── query-module-name.dto.ts
├── interfaces/                    # Type definitions
│   └── module-name.interface.ts
└── __tests__/                     # Unit tests
    ├── module-name.service.spec.ts
    └── module-name.controller.spec.ts
```

**Frontend Structure:**

```
feature-name/
├── components/                    # Feature-specific components
│   ├── feature-list.tsx
│   ├── feature-form.tsx
│   └── feature-detail.tsx
├── hooks/                         # Custom hooks
│   ├── useFeature.ts
│   └── useFeatureList.ts
├── types.ts                       # TypeScript types
└── index.ts                       # Barrel export
```

#### 1.3 Code Quality Rules

**DO:**

- ✅ Single Responsibility Principle (SRP)
- ✅ DRY (Don't Repeat Yourself)
- ✅ KISS (Keep It Simple, Stupid)
- ✅ YAGNI (You Aren't Gonna Need It)
- ✅ Meaningful names
- ✅ Small functions (< 50 lines)
- ✅ Maximum 3 parameters per function
- ✅ Early returns
- ✅ Error handling at boundaries

**DON'T:**

- ❌ Magic numbers/strings
- ❌ Deep nesting (> 3 levels)
- ❌ Long functions (> 100 lines)
- ❌ `any` type (use `unknown` if needed)
- ❌ Commented-out code
- ❌ Dead code
- ❌ God objects/classes

---

## BACKEND CODING PLAN

### 2. NestJS Architecture Patterns

#### 2.1 Module Structure

**Template:**

```typescript
// vehicles.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";
import { Vehicle } from "./entities/vehicle.entity";
import { DevicesModule } from "../devices/devices.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle]),
    DevicesModule, // Import other modules if needed
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService], // Export if used by other modules
})
export class VehiclesModule {}
```

#### 2.2 Controller Pattern

**Template:**

```typescript
// vehicles.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { VehiclesService } from "./vehicles.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { QueryVehicleDto } from "./dto/query-vehicle.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("vehicles")
@Controller("vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles("admin", "staff")
  @ApiOperation({ summary: "Create a new vehicle" })
  @ApiResponse({ status: 201, description: "Vehicle created successfully" })
  @ApiResponse({ status: 400, description: "Validation failed" })
  async create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all vehicles" })
  @ApiResponse({ status: 200, description: "List of vehicles" })
  async findAll(@Query() query: QueryVehicleDto) {
    return this.vehiclesService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get vehicle by ID" })
  @ApiResponse({ status: 200, description: "Vehicle details" })
  @ApiResponse({ status: 404, description: "Vehicle not found" })
  async findOne(@Param("id") id: string) {
    return this.vehiclesService.findOne(+id);
  }

  @Put(":id")
  @Roles("admin", "staff")
  @ApiOperation({ summary: "Update vehicle" })
  @ApiResponse({ status: 200, description: "Vehicle updated" })
  @ApiResponse({ status: 404, description: "Vehicle not found" })
  async update(
    @Param("id") id: string,
    @Body() updateVehicleDto: UpdateVehicleDto
  ) {
    return this.vehiclesService.update(+id, updateVehicleDto);
  }

  @Delete(":id")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete vehicle" })
  @ApiResponse({ status: 204, description: "Vehicle deleted" })
  @ApiResponse({ status: 404, description: "Vehicle not found" })
  async remove(@Param("id") id: string) {
    return this.vehiclesService.remove(+id);
  }
}
```

#### 2.3 Service Pattern

**Template:**

```typescript
// vehicles.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Vehicle } from "./entities/vehicle.entity";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { QueryVehicleDto } from "./dto/query-vehicle.dto";

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    // Validation
    await this.validateVehicleData(createVehicleDto);

    // Business logic
    const vehicle = this.vehicleRepository.create(createVehicleDto);
    return this.vehicleRepository.save(vehicle);
  }

  async findAll(query: QueryVehicleDto) {
    const { page = 1, limit = 10, status, search } = query;

    const queryBuilder = this.vehicleRepository.createQueryBuilder("vehicle");

    // Apply filters
    if (status) {
      queryBuilder.andWhere("vehicle.status = :status", { status });
    }

    if (search) {
      queryBuilder.andWhere(
        "(vehicle.plate ILIKE :search OR vehicle.vehicle_id ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order
    queryBuilder.orderBy("vehicle.created_at", "DESC");

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id },
      relations: ["device"], // Eager load relations
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return vehicle;
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto
  ): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    // Validation
    if (updateVehicleDto.device_id) {
      await this.validateDeviceExists(updateVehicleDto.device_id);
    }

    Object.assign(vehicle, updateVehicleDto);
    return this.vehicleRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehicleRepository.remove(vehicle);
  }

  // Private helper methods
  private async validateVehicleData(dto: CreateVehicleDto): Promise<void> {
    // Check duplicate plate
    const existing = await this.vehicleRepository.findOne({
      where: { plate: dto.plate },
    });

    if (existing) {
      throw new BadRequestException("Vehicle with this plate already exists");
    }

    // Validate device_id if provided
    if (dto.device_id) {
      await this.validateDeviceExists(dto.device_id);
    }
  }

  private async validateDeviceExists(deviceId: string): Promise<void> {
    // Implementation depends on DevicesService
    // This should be injected or called via DevicesService
  }
}
```

#### 2.4 DTO Pattern

**Option A: Using class-validator (Recommended for NestJS)**

```typescript
// dto/create-vehicle.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVehicleDto {
  @ApiProperty({ example: "VEH-001", description: "Unique vehicle identifier" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^VEH-\d{3}$/, { message: "vehicle_id must match pattern VEH-XXX" })
  vehicle_id: string;

  @ApiProperty({ example: "30A-12345", description: "License plate" })
  @IsString()
  @IsNotEmpty()
  plate: string;

  @ApiPropertyOptional({
    example: "Toyota Camry",
    description: "Vehicle model",
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    enum: ["active", "inactive", "maintenance"],
    example: "active",
  })
  @IsEnum(["active", "inactive", "maintenance"])
  status: string;

  @ApiPropertyOptional({ example: "ESP32-001", description: "Device ID" })
  @IsString()
  @IsOptional()
  device_id?: string;
}
```

**Option B: Using Zod (Alternative, recommended for complex validation)**

```typescript
// dto/create-vehicle.dto.ts
import { z } from "zod";
import { createZodDto } from "@anatine/zod-nestjs";

const createVehicleSchema = z
  .object({
    vehicle_id: z
      .string()
      .min(1)
      .regex(/^VEH-\d{3}$/, "vehicle_id must match pattern VEH-XXX"),
    plate: z.string().min(1),
    model: z.string().optional(),
    status: z.enum(["active", "inactive", "maintenance"]),
    device_id: z.string().optional(),
  })
  .transform((value) => ({
    vehicleId: value.vehicle_id.trim(),
    plate: value.plate.trim(),
    model: value.model?.trim(),
    status: value.status,
    deviceId: value.device_id?.trim(),
  }));

export class CreateVehicleDto extends createZodDto(createVehicleSchema) {}
```

**Using Zod in Controller:**

```typescript
// vehicles.controller.ts
import { Controller, Post, Body } from "@nestjs/common";
import { ZodValidationPipe } from "@anatine/zod-nestjs";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";

@Controller("vehicles")
export class VehiclesController {
  @Post()
  async create(
    @Body(new ZodValidationPipe(createVehicleSchema))
    createVehicleDto: CreateVehicleDto
  ) {
    // Validation is automatic
    return this.vehiclesService.create(createVehicleDto);
  }
}
```

#### 2.5 Entity Pattern

**Template (With Indexes, Cascade, and Soft Delete):**

```typescript
// entities/vehicle.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  DeleteDateColumn,
} from "typeorm";
import { Device } from "../../devices/entities/device.entity";
import { Trip } from "../../trips/entities/trip.entity";

@Entity("vehicles")
@Index(["status", "created_at"]) // Composite index for common queries
@Index(["plate"]) // Single column index
@Index(["vehicle_id"]) // Unique index (also enforced by unique constraint)
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  vehicle_id: string;

  @Column({ unique: true, length: 20 })
  plate: string;

  @Column({ nullable: true, length: 100 })
  model: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "active",
    comment: "Vehicle status: active, inactive, maintenance",
  })
  status: string;

  @Column({ name: "device_id", nullable: true, length: 50 })
  device_id: string;

  @ManyToOne(() => Device, {
    nullable: true,
    onDelete: "SET NULL", // Set device_id to NULL if device is deleted
    onUpdate: "CASCADE", // Update device_id if device.id changes
  })
  @JoinColumn({ name: "device_id" })
  device: Device;

  @OneToMany(() => Trip, (trip) => trip.vehicle, {
    cascade: false, // Don't auto-delete trips when vehicle is deleted
  })
  trips: Trip[];

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updated_at: Date;

  // Optional: Soft delete (if needed)
  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deleted_at: Date | null;
}
```

#### 2.6 Exception Handling Pattern

**Standard Error Response Format:**

Tất cả các lỗi phải tuân theo cấu trúc sau:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message description",
    "status": 400,
    "path": "/api/v1/endpoint",
    "details": null,
    "traceId": null
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Template:**

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
    path: string;
    details: any;
    traceId: string | null;
  };
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get traceId from request (set by TraceInterceptor) or generate new one
    const traceId = (request as any).traceId || uuidv4();
    const path = request.url;

    // Extract error code and message
    let errorCode: string;
    let errorMessage: string;
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        errorMessage = exceptionResponse;
        errorCode = this.getErrorCodeFromStatus(status);
      } else {
        const responseObj = exceptionResponse as any;
        errorMessage = responseObj.message || exception.message;
        errorCode = responseObj.code || this.getErrorCodeFromStatus(status);
        errorDetails = responseObj.details || null;
      }
    } else {
      errorMessage = "Internal server error";
      errorCode = "INTERNAL_SERVER_ERROR";
    }

    const errorResponse: ErrorResponse = {
      error: {
        code: errorCode,
        message: errorMessage,
        status,
        path,
        details: errorDetails,
        traceId,
      },
      timestamp: new Date().toISOString(),
    };

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${errorCode}: ${errorMessage}`,
      {
        traceId,
        status,
        path,
        details: errorDetails,
      }
    );

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
      502: "BAD_GATEWAY",
      503: "SERVICE_UNAVAILABLE",
    };

    return statusCodeMap[status] || "INTERNAL_SERVER_ERROR";
  }
}
```

**Custom Exception Classes:**

```typescript
// common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class BusinessException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details: any = null
  ) {
    super(
      {
        code,
        message,
        details,
      },
      status
    );
  }
}

// Usage examples:
// throw new BusinessException('VEHICLE_NOT_FOUND', 'Vehicle not found', HttpStatus.NOT_FOUND);
// throw new BusinessException('DUPLICATE_PLATE', 'Vehicle plate already exists', HttpStatus.CONFLICT, { plate: '30A-12345' });
```

**Validation Exception:**

```typescript
// common/exceptions/validation.exception.ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class ValidationException extends HttpException {
  constructor(validationErrors: Array<{ field: string; message: string }>) {
    super(
      {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: validationErrors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
```

#### 2.7 InfluxDB Service Pattern

**Template (Using ConfigService):**

```typescript
// telemetry/telemetry.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  InfluxDB,
  Point,
  QueryApi,
  WriteApi,
} from "@influxdata/influxdb-client";

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly influxDB: InfluxDB;
  private readonly writeApi: WriteApi;
  private readonly queryApi: QueryApi;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    // ✅ Use ConfigService instead of process.env
    const url = this.configService.getOrThrow<string>("influxdb.url");
    const token = this.configService.getOrThrow<string>("influxdb.token");
    const org = this.configService.getOrThrow<string>("influxdb.org");
    this.bucket = this.configService.getOrThrow<string>("influxdb.bucket");

    this.influxDB = new InfluxDB({ url, token });
    this.writeApi = this.influxDB.getWriteApi(org, this.bucket, "ms");
    this.queryApi = this.influxDB.getQueryApi(org);

    // Configure write API
    this.writeApi.useDefaultTags({
      environment: this.configService.get<string>("app.nodeEnv", "development"),
    });
  }

  async onModuleInit() {
    this.logger.log("InfluxDB service initialized");
  }

  async onModuleDestroy() {
    await this.writeApi.close();
    this.logger.log("InfluxDB service closed");
  }

  async writeLocation(data: {
    deviceId: string;
    vehicleId: string;
    lat: number;
    lon: number;
    speed: number;
    course: number;
  }): Promise<void> {
    try {
      const point = new Point("location")
        .tag("device_id", data.deviceId)
        .tag("vehicle_id", data.vehicleId)
        .floatField("lat", data.lat)
        .floatField("lon", data.lon)
        .floatField("speed", data.speed)
        .floatField("course", data.course)
        .timestamp(new Date());

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
    } catch (error) {
      this.logger.error(
        `Failed to write location data: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async queryLocation(
    deviceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    // ✅ Use parameterized query to prevent injection
    // Note: InfluxDB Flux doesn't support parameterized queries like SQL
    // But we validate and sanitize inputs
    if (!deviceId || deviceId.length > 100) {
      throw new Error("Invalid deviceId");
    }

    // Use Flux query with proper escaping
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r["_measurement"] == "location")
        |> filter(fn: (r) => r["device_id"] == "${deviceId.replace(
          /"/g,
          '\\"'
        )}")
        |> sort(columns: ["_time"], desc: false)
    `;

    return new Promise((resolve, reject) => {
      const results: any[] = [];

      this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row);
          results.push(record);
        },
        error(error) {
          this.logger.error(
            `InfluxDB query error: ${error.message}`,
            error.stack
          );
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });
  }
}
```

#### 2.8 MQTT Service Pattern

**Template (Using ConfigService with Reconnection & Error Handling):**

```typescript
// mqtt/mqtt.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MqttClient, connect, IClientOptions } from "mqtt";

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    // ✅ Use ConfigService instead of process.env
    const brokerUrl = this.configService.get<string>(
      "mqtt.brokerUrl",
      "mqtt://localhost:1883"
    );
    const username = this.configService.get<string>("mqtt.username");
    const password = this.configService.get<string>("mqtt.password");

    const options: IClientOptions = {
      clientId: `api-server-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000, // Reconnect every 5 seconds
      connectTimeout: 10000, // 10 seconds timeout
      ...(username && password && { username, password }),
    };

    this.client = connect(brokerUrl, options);
    this.setupEventHandlers();
  }

  async onModuleInit() {
    // Connection will be established automatically
    this.logger.log("MQTT service initialized");
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.client.end(true); // Force disconnect
    this.logger.log("MQTT service disconnected");
  }

  private setupEventHandlers(): void {
    this.client.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log("Connected to MQTT broker");
      this.subscribeToTopics();
    });

    this.client.on("message", (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on("error", (error) => {
      this.logger.error(`MQTT error: ${error.message}`, error.stack);
    });

    this.client.on("close", () => {
      this.isConnected = false;
      this.logger.warn("MQTT connection closed");
    });

    this.client.on("reconnect", () => {
      this.reconnectAttempts++;
      this.logger.warn(
        `Attempting to reconnect to MQTT broker (attempt ${this.reconnectAttempts})`
      );

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.logger.error(
          `Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`
        );
        this.client.end(true);
      }
    });

    this.client.on("offline", () => {
      this.isConnected = false;
      this.logger.warn("MQTT client went offline");
    });
  }

  private subscribeToTopics(): void {
    const topics = [
      "vehicle/+/telemetry",
      "vehicle/+/alerts",
      "vehicle/+/status",
    ];

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to subscribe to ${topic}:`, error);
        } else {
          this.logger.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      this.logger.debug(`Received message on ${topic}:`, data);

      // Route to appropriate handler
      if (topic.includes("/telemetry")) {
        this.handleTelemetry(topic, data);
      } else if (topic.includes("/alerts")) {
        this.handleAlert(topic, data);
      } else if (topic.includes("/status")) {
        this.handleStatus(topic, data);
      }
    } catch (error) {
      this.logger.error(
        `Error parsing MQTT message from ${topic}:`,
        error.message
      );
    }
  }

  private handleTelemetry(topic: string, data: any): void {
    // Process telemetry data
    // Save to InfluxDB, update PostgreSQL, etc.
    this.logger.debug(`Processing telemetry from ${topic}`);
  }

  private handleAlert(topic: string, data: any): void {
    // Process alert
    // Save to PostgreSQL, send notifications, etc.
    this.logger.warn(`Alert received from ${topic}:`, data);
  }

  private handleStatus(topic: string, data: any): void {
    // Process device status updates
    this.logger.debug(`Status update from ${topic}:`, data);
  }

  async publishCommand(
    deviceId: string,
    command: any,
    options?: { qos?: 0 | 1 | 2; retain?: boolean }
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MQTT client is not connected");
    }

    const topic = `vehicle/${deviceId}/commands`;
    const payload = JSON.stringify(command);

    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        payload,
        {
          qos: options?.qos || 1,
          retain: options?.retain || false,
        },
        (error) => {
          if (error) {
            this.logger.error(`Error publishing to ${topic}:`, error);
            reject(error);
          } else {
            this.logger.log(`Published command to ${topic}`);
            resolve();
          }
        }
      );
    });
  }

  isClientConnected(): boolean {
    return this.isConnected && this.client.connected;
  }
}
```

### 3. Database Migration Strategy

#### 3.1 Migration Setup

**Install TypeORM CLI:**

```bash
npm install --save-dev typeorm
```

**`package.json` scripts:**

```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/data-source.ts",
    "migration:create": "typeorm-ts-node-commonjs migration:create",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/data-source.ts"
  }
}
```

**`src/config/data-source.ts`:**

```typescript
import { DataSource } from "typeorm";
import { config } from "dotenv";

// Load environment variables
config();

// Note: DataSource cannot use NestJS ConfigService directly
// It runs outside of NestJS context, so we use process.env
export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vehicle_tracking",
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/../migrations/*{.ts,.js}"],
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
});
```

#### 3.2 Migration Best Practices

1. **Always use migrations in production** (never `synchronize: true`)
2. **Generate migrations from entities:**
   ```bash
   npm run migration:generate -- src/migrations/CreateVehiclesTable
   ```
3. **Create custom migrations for complex changes:**
   ```bash
   npm run migration:create -- src/migrations/AddIndexToVehicles
   ```
4. **Test migrations on development/staging before production**
5. **Always backup database before running migrations**

#### 3.3 Migration Template

```typescript
// migrations/1234567890123-CreateVehiclesTable.ts
import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateVehiclesTable1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "vehicles",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "vehicle_id",
            type: "varchar",
            length: "50",
            isUnique: true,
          },
          {
            name: "plate",
            type: "varchar",
            length: "20",
            isUnique: true,
          },
          {
            name: "model",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "20",
            default: "'active'",
          },
          {
            name: "device_id",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
        indices: [
          {
            name: "IDX_VEHICLE_PLATE",
            columnNames: ["plate"],
          },
          {
            name: "IDX_VEHICLE_STATUS",
            columnNames: ["status"],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("vehicles");
  }
}
```

### 4. Backend Implementation Order

**Phase 1 - Core Infrastructure:**

1. ✅ Setup NestJS project structure
2. ✅ Install and configure dependencies (including @anatine/zod-nestjs)
3. ✅ Setup configuration (environment, database, InfluxDB) - **Use ConfigService**
4. ✅ Setup logging - **Use NestJS Logger pattern**
5. ✅ Setup exception filters and interceptors - **Include TraceId Interceptor**
6. ✅ Setup response transformation interceptor - **Standardize response format**
7. ✅ Database modules (PostgreSQL + TypeORM) - **With migrations**
8. ✅ InfluxDB module - **Use ConfigService, secure queries**
9. ✅ Auth module (JWT, guards, decorators)
10. ✅ Common utilities (filters, interceptors, pipes, custom validators)
11. ✅ MQTT service integration - **Use ConfigService with reconnection & error handling**
12. ✅ WebSocket gateway setup
13. ✅ Health check module - **Full health checks (DB, InfluxDB, MQTT)**
14. ✅ Swagger documentation - **Complete configuration with tags & security**

**Phase 2 - Core Features:**

1. ✅ Vehicles module
2. ✅ Devices module
3. ✅ Customers module
4. ✅ Telemetry module (InfluxDB queries)
5. ✅ Alerts module (with WebSocket)
6. ✅ Violations module
7. ✅ Trips module

**Phase 3 - Advanced Features:**

1. ✅ Notifications module (Telegram + Email)
2. ✅ Geofences module
3. ✅ Maintenance module
4. ✅ Commands module (MQTT)

**Phase 4 - Phase 2 Features:**

1. ⏸️ Bookings module
2. ⏸️ Contracts module
3. ⏸️ Payments module
4. ⏸️ Damage Reports module
5. ⏸️ Reviews module

---

## FRONTEND CODING PLAN

### 4. Frontend Project Setup & Initialization

#### 4.1 Create Next.js Project

```bash
# Create new Next.js project with TypeScript
cd iot-vehicle-tracking-system/frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Or if project already exists
npm install
```

#### 4.2 Core Dependencies

**Required packages:**

```json
{
  "dependencies": {
    "next": "^16.0.7",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@tanstack/react-query": "^5.90.5",
    "@tanstack/react-query-devtools": "^5.90.2",
    "@tanstack/react-table": "^8.21.2",
    "zustand": "^5.0.2",
    "react-hook-form": "^7.54.1",
    "@hookform/resolvers": "^5.2.1",
    "zod": "^4.1.8",
    "socket.io-client": "^4.8.1",
    "sonner": "^1.7.1",
    "lucide-react": "^0.476.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwind-merge": "^3.0.2",
    "clsx": "^2.1.1",
    "class-variance-authority": "^0.7.1",
    "next-themes": "^0.4.6",
    "date-fns": "^4.1.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",
    "recharts": "^2.15.1",
    "nuqs": "^2.4.1",
    "nextjs-toploader": "^3.7.15"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@types/leaflet": "^1.9.21",
    "typescript": "^5.7.2",
    "eslint": "^8.48.0",
    "eslint-config-next": "^16.0.7",
    "@typescript-eslint/eslint-plugin": "^6.11.0",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.11",
    "husky": "^9.1.7",
    "lint-staged": "^15.2.11"
  }
}
```

#### 4.3 Project Structure

```
frontend/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                     # Root layout
│   │   ├── page.tsx                       # Home page
│   │   ├── globals.css                    # Global styles
│   │   ├── theme.css                      # Theme variables
│   │   ├── login/                         # Login page
│   │   │   └── page.tsx
│   │   └── dashboard/                     # Dashboard pages
│   │       ├── layout.tsx                 # Dashboard layout (with sidebar)
│   │       ├── overview/                  # Overview page
│   │       │   └── page.tsx
│   │       ├── vehicles/                  # Vehicles module
│   │       │   ├── page.tsx
│   │       │   ├── [id]/                  # Vehicle detail
│   │       │   │   └── page.tsx
│   │       │   └── components/            # Page-specific components
│   │       │       ├── vehicle-list.tsx
│   │       │       ├── vehicle-form.tsx
│   │       │       └── vehicle-filters.tsx
│   │       ├── trips/                     # Trips module
│   │       ├── alerts/                    # Alerts module
│   │       └── ... (other modules)
│   │
│   ├── components/                        # Shared components
│   │   ├── ui/                            # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── table/
│   │   │   │   ├── data-table.tsx
│   │   │   │   ├── data-table-toolbar.tsx
│   │   │   │   └── ...
│   │   │   └── ... (other UI components)
│   │   ├── layout/                        # Layout components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── auth-guard.tsx
│   │   │   ├── page-container.tsx
│   │   │   └── providers.tsx
│   │   ├── forms/                         # Form components
│   │   │   ├── form-input.tsx
│   │   │   ├── form-select.tsx
│   │   │   ├── form-date-picker.tsx
│   │   │   └── ...
│   │   └── providers/                     # Context providers
│   │       ├── QueryProvider.tsx
│   │       ├── RealtimeProvider.tsx
│   │       └── NotificationProvider.tsx
│   │
│   ├── features/                          # Feature modules
│   │   ├── vehicles/
│   │   │   ├── components/                # Feature-specific components
│   │   │   ├── hooks/                     # Feature hooks
│   │   │   └── types.ts                   # Feature types
│   │   ├── trips/
│   │   └── ... (other features)
│   │
│   ├── hooks/                             # Shared hooks
│   │   ├── queries/                       # Query hooks
│   │   │   ├── useVehicles.ts
│   │   │   ├── useTrips.ts
│   │   │   └── ...
│   │   ├── mutations/                     # Mutation hooks
│   │   │   ├── useCreateVehicle.ts
│   │   │   └── ...
│   │   ├── use-data-table.ts              # Data table hook
│   │   ├── use-debounce.tsx
│   │   └── use-media-query.ts
│   │
│   ├── lib/                               # Utilities & configs
│   │   ├── api/                           # API clients
│   │   │   ├── http.ts                    # HTTP client (fetch-based)
│   │   │   ├── endpoints.ts               # API endpoints constants
│   │   │   ├── vehicles.ts
│   │   │   ├── trips.ts
│   │   │   └── ...
│   │   ├── realtime/                      # WebSocket client
│   │   │   ├── client.ts
│   │   │   └── events.ts
│   │   ├── store/                         # Zustand stores
│   │   │   └── authStore.ts
│   │   ├── utils/                         # Utility functions
│   │   │   ├── cn.ts                      # className utility
│   │   │   ├── date.ts
│   │   │   └── ...
│   │   ├── constants/                     # Constants
│   │   │   ├── queryCache.ts
│   │   │   └── ...
│   │   └── queryClient.ts                 # TanStack Query config
│   │
│   ├── config/                            # Configuration
│   │   ├── nav-config.ts                  # Navigation config
│   │   └── data-table.ts                  # Data table config
│   │
│   └── types/                             # TypeScript types
│       ├── vehicle.d.ts
│       ├── trip.d.ts
│       └── index.ts
│
├── public/                                # Static assets
│   ├── images/
│   └── icons/
│
├── .env.example                           # Environment template
├── .eslintrc.json                         # ESLint config
├── .prettierrc                            # Prettier config
├── components.json                        # shadcn/ui config
├── next.config.ts                         # Next.js config
├── tailwind.config.ts                     # Tailwind config
├── tsconfig.json                          # TypeScript config
└── package.json
```

#### 4.4 Configuration Files

**`next.config.ts`:**

```typescript
import type { NextConfig } from "next";

const normalizeUrl = (url?: string) => url?.trim().replace(/\/$/, "") ?? "";

const resolveApiBaseUrl = () => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiBase && apiBase.trim()) return normalizeUrl(apiBase);
  return normalizeUrl("http://localhost:3000");
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone", // For Docker deployment
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Configure based on your image sources
      },
    ],
  },
  async rewrites() {
    const apiBase = resolveApiBaseUrl();
    if (!apiBase) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**`tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "~/*": ["./public/*"]
    },
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`components.json` (shadcn/ui config):**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**`.prettierrc`:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

#### 4.5 Root Layout Setup

**`src/app/layout.tsx`:**

```typescript
import Providers from "@/components/layout/providers";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/lib/font";
import ThemeProvider from "@/components/layout/ThemeToggle/theme-provider";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import NextTopLoader from "nextjs-toploader";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "IoT Vehicle Tracking System",
  description: "Real-time vehicle tracking and monitoring dashboard",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get("active_theme")?.value;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background font-sans antialiased",
          activeThemeValue ? `theme-${activeThemeValue}` : "",
          fontVariables
        )}
      >
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers activeThemeValue={activeThemeValue as string}>
              <Toaster />
              {children}
            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
```

#### 4.6 Dashboard Layout Setup

**`src/app/dashboard/layout.tsx`:**

```typescript
import AppSidebar from "@/components/layout/app-sidebar";
import Header from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import AuthGuard from "@/components/layout/auth-guard";

export const metadata: Metadata = {
  title: "Dashboard - IoT Vehicle Tracking",
  description: "Vehicle tracking dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <AuthGuard>
          <Header />
          {children}
        </AuthGuard>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 5. Next.js App Router Patterns

#### 5.1 Page Component Pattern

**Template:**

```typescript
// app/dashboard/vehicles/page.tsx
"use client";

import { useState } from "react";
import { useVehicles } from "@/hooks/queries/useVehicles";
import { VehicleDataTable } from "@/features/vehicles/components/vehicle-data-table";
import { VehicleCreateModal } from "@/features/vehicles/components/vehicle-create-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";

export default function VehiclesPage() {
  const { data, isLoading, error } = useVehicles();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">
            Manage and monitor your vehicle fleet
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {isLoading ? (
        <VehicleDataTable.Skeleton />
      ) : error ? (
        <div className="text-destructive">Error: {error.message}</div>
      ) : (
        <VehicleDataTable data={data || []} />
      )}

      <VehicleCreateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </PageContainer>
  );
}
```

#### 5.2 Custom Hook Pattern

**Query Hooks Template:**

```typescript
// hooks/queries/useVehicles.ts
import { useQuery } from "@tanstack/react-query";
import { vehiclesServices } from "@/lib/api/vehicles";
import { STALE_TIMES } from "@/lib/constants/queryCache";

export const useVehicles = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["vehicles", "list", params],
    queryFn: () => vehiclesServices.list(params),
    enabled: params?.enabled !== false,
    staleTime: STALE_TIMES.VEHICLE_LIST,
    retry: 3,
    refetchOnMount: false,
  });
};

export const useVehicle = (id: number | string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => vehiclesServices.getById(id),
    enabled: enabled && !!id,
    staleTime: STALE_TIMES.VEHICLE_DETAIL,
    retry: 3,
  });
};
```

**Mutation Hooks Template:**

```typescript
// hooks/mutations/useCreateVehicle.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vehiclesServices } from "@/lib/api/vehicles";
import { notificationUtils } from "@/lib/notification";
import type { CreateVehicleDto } from "@/types/vehicle.d";

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleDto) => vehiclesServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      notificationUtils.success(
        "Vehicle created successfully",
        "The vehicle has been added to your fleet"
      );
    },
    onError: (error: Error) => {
      notificationUtils.error(
        "Failed to create vehicle",
        error.message || "An error occurred while creating the vehicle"
      );
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateVehicleDto>;
    }) => vehiclesServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles", variables.id] });
      notificationUtils.success(
        "Vehicle updated successfully",
        "The vehicle information has been updated"
      );
    },
    onError: (error: Error) => {
      notificationUtils.error(
        "Failed to update vehicle",
        error.message || "An error occurred while updating the vehicle"
      );
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => vehiclesServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      notificationUtils.success(
        "Vehicle deleted successfully",
        "The vehicle has been removed from your fleet"
      );
    },
    onError: (error: Error) => {
      notificationUtils.error(
        "Failed to delete vehicle",
        error.message || "An error occurred while deleting the vehicle"
      );
    },
  });
};
```

#### 5.3 API Client Pattern

**Endpoints Constants:**

```typescript
// lib/api/endpoints.ts
export const API = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REGISTER: "/api/v1/auth/register",
    LOGOUT: "/api/v1/auth/logout",
    REFRESH: "/api/v1/auth/refresh",
  },
  VEHICLES: {
    LIST: "/api/v1/vehicles",
    DETAILS: (id: number | string) => `/api/v1/vehicles/${id}`,
    CREATE: "/api/v1/vehicles",
    UPDATE: "/api/v1/vehicles",
    DELETE: (id: number | string) => `/api/v1/vehicles/${id}`,
  },
  TRIPS: {
    LIST: "/api/v1/trips",
    DETAILS: (id: number | string) => `/api/v1/trips/${id}`,
  },
  TELEMETRY: {
    LOCATION: (deviceId: string) =>
      `/api/v1/telemetry/location?device_id=${deviceId}`,
  },
  // ... other endpoints
} as const;
```

**API Service Template:**

```typescript
// lib/api/vehicles.ts
import { http } from "./http";
import { API } from "./endpoints";
import { notificationUtils } from "@/lib/notification";

export const vehiclesServices = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(
              ([, v]) =>
                v !== undefined && v !== null && String(v).trim() !== ""
            )
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : "";

    const url = API.VEHICLES.LIST + (query ? `?${query}` : "");
    const response = await http.get<{
      data: Vehicle.VehicleDto[];
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(url);

    return response.data || response;
  },

  getById: async (id: number | string) => {
    const response = await http.get<{ data: Vehicle.VehicleDto }>(
      API.VEHICLES.DETAILS(id)
    );
    return response.data || response;
  },

  create: async (data: Vehicle.CreateVehicleDto) => {
    try {
      const response = await http.post<{ data: Vehicle.VehicleDto }>(
        API.VEHICLES.CREATE,
        data
      );
      notificationUtils.success(
        "Vehicle created successfully",
        `Vehicle ${data.plate} has been added`
      );
      return response.data || response;
    } catch (error) {
      notificationUtils.error(
        "Failed to create vehicle",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  },

  update: async (
    id: number | string,
    data: Partial<Vehicle.CreateVehicleDto>
  ) => {
    try {
      const response = await http.put<{ data: Vehicle.VehicleDto }>(
        API.VEHICLES.UPDATE,
        { ...data, id }
      );
      notificationUtils.success("Vehicle updated successfully");
      return response.data || response;
    } catch (error) {
      notificationUtils.error(
        "Failed to update vehicle",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  },

  delete: async (id: number | string) => {
    try {
      await http.delete(API.VEHICLES.DELETE(id));
      notificationUtils.success("Vehicle deleted successfully");
    } catch (error) {
      notificationUtils.error(
        "Failed to delete vehicle",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  },
};
```

#### 5.4 HTTP Client Pattern (Fetch-based)

**Template (Using Fetch with Retry & Error Handling):**

```typescript
// lib/api/http.ts
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

import { useAuthStore } from "@/lib/store/authStore";
import { notificationUtils } from "@/lib/notification";

let sessionExpiredNotified = false;
let sessionNotifyTimer: ReturnType<typeof setTimeout> | null = null;

const notifySessionExpired = () => {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  notificationUtils.error("Session expired", "Please login again");
  if (sessionNotifyTimer) {
    clearTimeout(sessionNotifyTimer);
  }
  sessionNotifyTimer = setTimeout(() => {
    sessionExpiredNotified = false;
    sessionNotifyTimer = null;
  }, 3000);
};

// Check if error is retryable
const isRetryableError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    const message = error.message?.toLowerCase() || "";
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("econnreset") ||
      message.includes("econnrefused")
    );
  }
  return false;
};

// Retry with exponential backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw lastError;
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return retryRequest(async () => {
    const token =
      typeof window !== "undefined" ? useAuthStore.getState().token : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // Handle error response with standard format
        const errorData = await res.json().catch(() => ({}));
        const error = errorData.error || {};

        if (res.status === 401) {
          notifySessionExpired();
          useAuthStore.getState().logout();
          throw new Error("Unauthorized");
        } else if (res.status >= 500) {
          notificationUtils.error(
            "Server error",
            "Server is experiencing issues. Please try again later."
          );
        } else if (res.status === 408) {
          notificationUtils.error(
            "Request timeout",
            "Request took too long. Please try again."
          );
        } else if (error.message) {
          notificationUtils.error("Error", error.message);
        }

        throw new Error(error.message || `HTTP ${res.status}`);
      }

      // Handle 204 No Content
      if (res.status === 204 || res.status === 205) {
        return null as T;
      }

      // Parse JSON response
      try {
        const text = await res.text();
        if (!text || text.trim().length === 0) {
          return null as T;
        }
        return JSON.parse(text) as T;
      } catch (e) {
        if (e instanceof SyntaxError) {
          return null as T;
        }
        throw e;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new TypeError("Request timeout");
      }
      throw error;
    }
  });
}

// Specialized helper for multipart/form-data
async function requestForm<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  return retryRequest(async () => {
    const token =
      typeof window !== "undefined" ? useAuthStore.getState().token : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const error = errorData.error || {};

        if (res.status === 401) {
          notifySessionExpired();
          useAuthStore.getState().logout();
        } else if (error.message) {
          notificationUtils.error("Error", error.message);
        }

        throw new Error(error.message || `HTTP ${res.status}`);
      }

      return res.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new TypeError("Request timeout");
      }
      throw error;
    }
  }, 2); // Only retry 2 times for file uploads
}

export const http = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  postForm: <T>(endpoint: string, formData: FormData) =>
    requestForm<T>(endpoint, formData),
};
```

#### 4.5 Form Component Pattern

**Template:**

```typescript
// features/vehicles/components/vehicle-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateVehicle, useUpdateVehicle } from "../hooks/useVehicles";
import { Vehicle } from "../types";

const vehicleSchema = z.object({
  vehicle_id: z.string().regex(/^VEH-\d{3}$/, "Invalid vehicle ID format"),
  plate: z.string().min(1, "Plate is required"),
  model: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
  device_id: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle?: Vehicle;
}

export function VehicleForm({
  open,
  onClose,
  onSuccess,
  vehicle,
}: VehicleFormProps) {
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle || {
      vehicle_id: "",
      plate: "",
      model: "",
      status: "active",
      device_id: "",
    },
  });

  const onSubmit = async (data: VehicleFormData) => {
    try {
      if (vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess();
      form.reset();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "Edit Vehicle" : "Create Vehicle"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="VEH-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="30A-12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {vehicle ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 5.5 Realtime Client Pattern

**Realtime Client Setup:**

```typescript
// lib/realtime/client.ts
"use client";

import { io, type Socket } from "socket.io-client";

export type NamespaceKey =
  | "dashboard"
  | "vehicles"
  | "trips"
  | "alerts"
  | "notifications";

const socketCache: Partial<Record<NamespaceKey, Socket>> = {};
const DEFAULT_WS_PATH = "/ws";

const deriveBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { origin } = window.location;
    // Handle different ports
    if (origin.includes(":3001") || origin.includes(":3002")) {
      return origin.replace(/:\d+/, ":3000"); // Backend port
    }
    return origin;
  }

  return "http://localhost:3000";
};

const getSocketOptions = (token?: string | null) => ({
  path: process.env.NEXT_PUBLIC_WS_PATH || DEFAULT_WS_PATH,
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: false,
  auth: token ? { token } : undefined,
  timeout: 45000,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  forceNew: false,
  upgrade: true,
});

export const getRealtimeSocket = (
  namespace: NamespaceKey,
  token?: string | null
): Socket => {
  if (!socketCache[namespace]) {
    const baseUrl = `${deriveBaseUrl()}/${namespace}`;
    const options = getSocketOptions(token);
    socketCache[namespace] = io(baseUrl, options);
  }

  const socket = socketCache[namespace]!;
  const oldAuth = socket.auth;
  socket.auth = token ? { token } : {};

  // Reconnect if auth changed
  const authChanged = JSON.stringify(oldAuth) !== JSON.stringify(socket.auth);
  if (authChanged && (socket.disconnected || !socket.connected)) {
    socket.disconnect();
    socket.connect();
  }

  if (!socket.connected && !socket.active) {
    socket.connect();
  }

  return socket;
};

export const disconnectRealtimeSocket = (namespace?: NamespaceKey): void => {
  if (namespace) {
    socketCache[namespace]?.disconnect();
    delete socketCache[namespace];
    return;
  }

  Object.keys(socketCache).forEach((key) => {
    const typedKey = key as NamespaceKey;
    socketCache[typedKey]?.disconnect();
    delete socketCache[typedKey];
  });
};
```

**Realtime Provider Pattern:**

```typescript
// components/providers/RealtimeProvider.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  getRealtimeSocket,
  disconnectRealtimeSocket,
  type NamespaceKey,
} from "@/lib/realtime/client";
import { useAuthStore } from "@/lib/store/authStore";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface IRealtimeContext {
  getSocket: (namespace: NamespaceKey) => Socket;
  status: Partial<Record<NamespaceKey, ConnectionStatus>>;
  joinVehicleRoom: (vehicleId: string) => void;
  leaveVehicleRoom: (vehicleId: string) => void;
}

const RealtimeContext = createContext<IRealtimeContext | null>(null);

export default function RealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const namespaces = useMemo<NamespaceKey[]>(
    () => ["dashboard", "vehicles", "trips", "alerts", "notifications"],
    []
  );
  const [status, setStatus] = useState<
    Partial<Record<NamespaceKey, ConnectionStatus>>
  >({});
  const tokenRef = useRef<string | null | undefined>(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(
    () => () => {
      disconnectRealtimeSocket();
    },
    []
  );

  useEffect(() => {
    const subscriptions = namespaces.map((namespace) => {
      const socket = getRealtimeSocket(namespace, token ?? null);
      const handleConnect = () => {
        setStatus((prev) => ({ ...prev, [namespace]: "connected" }));
      };
      const handleDisconnect = () => {
        setStatus((prev) => ({ ...prev, [namespace]: "disconnected" }));
      };
      const handleError = () => {
        setStatus((prev) => ({ ...prev, [namespace]: "disconnected" }));
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("connect_error", handleError);

      if (!socket.connected) {
        setStatus((prev) => ({ ...prev, [namespace]: "connecting" }));
        socket.connect();
      }

      return { socket, handleConnect, handleDisconnect, handleError };
    });

    return () => {
      subscriptions.forEach(
        ({ socket, handleConnect, handleDisconnect, handleError }) => {
          socket.off("connect", handleConnect);
          socket.off("disconnect", handleDisconnect);
          socket.off("connect_error", handleError);
        }
      );
    };
  }, [namespaces, token]);

  // Subscribe to vehicle location updates
  useEffect(() => {
    const socket = getRealtimeSocket("vehicles", token ?? null);

    const handleLocationUpdate = (payload: any) => {
      // Invalidate vehicle location queries
      queryClient.invalidateQueries({
        queryKey: ["vehicles", payload.vehicle_id, "location"],
      });
    };

    socket.on("vehicle.location.updated", handleLocationUpdate);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("vehicle.location.updated", handleLocationUpdate);
    };
  }, [queryClient, token]);

  const getSocket = useCallback(
    (namespace: NamespaceKey) =>
      getRealtimeSocket(namespace, tokenRef.current ?? null),
    []
  );

  const joinVehicleRoom = useCallback(
    (vehicleId: string) => {
      if (!vehicleId) return;
      const socket = getSocket("vehicles");
      socket.emit("vehicle:join", { vehicleId });
    },
    [getSocket]
  );

  const leaveVehicleRoom = useCallback(
    (vehicleId: string) => {
      if (!vehicleId) return;
      const socket = getSocket("vehicles");
      socket.emit("vehicle:leave", { vehicleId });
    },
    [getSocket]
  );

  const value = useMemo<IRealtimeContext>(
    () => ({
      getSocket,
      status,
      joinVehicleRoom,
      leaveVehicleRoom,
    }),
    [getSocket, joinVehicleRoom, leaveVehicleRoom, status]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtimeContext = (): IRealtimeContext => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtimeContext must be used within RealtimeProvider");
  }
  return context;
};
```

#### 5.6 Store Pattern (Zustand)

**Auth Store Template:**

```typescript
// lib/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  username: string;
  fullName?: string;
  role: "admin" | "staff" | "user";
}

interface AuthStoreState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: Array<User["role"]>) => boolean;
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      error: null,
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const hashed = await sha256(password);
          const { authServices } = await import("@/lib/api/auth");
          const json = await authServices.login(username, hashed);

          const sessionToken = (json as any)?.session?.token;
          const user = (json as any)?.user ?? null;

          if (sessionToken && user) {
            set({
              user,
              token: sessionToken,
              isAuthenticated: true,
              isLoading: false,
              hasHydrated: true,
            });
            return true;
          }

          set({
            error: "Login failed",
            isLoading: false,
            hasHydrated: true,
          });
          return false;
        } catch (e: unknown) {
          set({
            error: (e as Error)?.message || "Network error",
            isLoading: false,
            hasHydrated: true,
          });
          return false;
        }
      },
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
          hasHydrated: true,
        });
      },
      hasRole: (roles: Array<User["role"]>): boolean => {
        const u = get().user;
        return !!u && roles.includes(u.role);
      },
    }),
    {
      name: "auth-storage",
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

// Hydration handling
const reapplySessionState = (persisted?: Partial<AuthStoreState>) => {
  const hasValidSession = !!persisted?.token && !!persisted?.user;
  useAuthStore.setState((current) => ({
    ...current,
    user: hasValidSession ? persisted?.user ?? null : null,
    token: hasValidSession ? persisted?.token ?? null : null,
    isAuthenticated: hasValidSession,
    isLoading: false,
    hasHydrated: true,
    error: hasValidSession ? current.error : null,
  }));
};

const persistApi = useAuthStore.persist;
persistApi?.onFinishHydration(reapplySessionState);
if (persistApi?.hasHydrated?.()) {
  reapplySessionState(useAuthStore.getState());
}
```

#### 5.7 Query Client Configuration

**Template:**

```typescript
// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Constants for stale times
export const STALE_TIMES = {
  VEHICLE_LIST: 2 * 60 * 1000, // 2 minutes
  VEHICLE_DETAIL: 5 * 60 * 1000, // 5 minutes
  TRIP_LIST: 1 * 60 * 1000, // 1 minute
  ALERT_LIST: 30 * 1000, // 30 seconds
} as const;
```

**Query Provider:**

```typescript
// components/providers/QueryProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 3,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}
```

#### 5.8 Form Component Pattern (shadcn/ui + React Hook Form)

**Template:**

```typescript
// features/vehicles/components/vehicle-create-modal.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCreateVehicle } from "@/hooks/mutations/useCreateVehicle";

const vehicleSchema = z.object({
  vehicle_id: z
    .string()
    .min(1, "Vehicle ID is required")
    .regex(/^VEH-\d{3}$/, "Vehicle ID must match pattern VEH-XXX"),
  plate: z.string().min(1, "License plate is required"),
  model: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
  device_id: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleCreateModal({
  open,
  onOpenChange,
}: VehicleCreateModalProps) {
  const createMutation = useCreateVehicle();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_id: "",
      plate: "",
      model: "",
      status: "active",
      device_id: "",
    },
  });

  const onSubmit = async (data: VehicleFormData) => {
    try {
      await createMutation.mutateAsync(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Vehicle</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="VEH-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="30A-12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 5.9 Auth Guard Pattern

**Template:**

```typescript
// components/layout/auth-guard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace("/login");
    }
  }, [hasHydrated, token, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}
```

### 6. Frontend Implementation Order

**Phase 1 - Core Infrastructure:**

1. ✅ Setup Next.js project with App Router
2. ✅ Install and configure dependencies (shadcn/ui, TanStack Query, Zustand, etc.)
3. ✅ Setup configuration files (next.config.ts, tsconfig.json, tailwind.config.ts)
4. ✅ Setup Tailwind CSS v4 with theme variables
5. ✅ Create root layout with providers (Theme, Query, Realtime, Notification)
6. ✅ Setup HTTP client (fetch-based with retry & error handling)
7. ✅ Setup Zustand stores (authStore)
8. ✅ Setup TanStack Query client configuration
9. ✅ Setup Realtime client (Socket.io) with namespaces
10. ✅ Create layout components (AppSidebar, Header, PageContainer)
11. ✅ Create Auth Guard component
12. ✅ Setup API services and endpoints constants

**Phase 2 - Core Features:**

1. ✅ Auth pages (Login with form validation)
2. ✅ Dashboard overview page (stats, charts, activity feed)
3. ✅ Vehicles module:
   - List page with Data Table (filtering, sorting, pagination)
   - Create/Edit modal forms
   - Detail page
4. ✅ Customers module (list, create, edit)
5. ✅ Trips module:
   - List with filters
   - Detail page with map integration
   - Trip replay functionality
6. ✅ Alerts module (with realtime updates via WebSocket)
7. ✅ Violations module (list, filters, detail)
8. ✅ Devices module (list, status, settings)
9. ✅ Map page (realtime vehicle tracking with Leaflet)

**Phase 3 - Advanced Features:**

1. ✅ Geofences module:
   - List with map visualization
   - Create/Edit with map editor (draw polygons)
   - Geofence violation alerts
2. ✅ Maintenance module:
   - Maintenance records list
   - Create maintenance schedule
   - Maintenance history
3. ✅ Notifications settings (Telegram, Email preferences)
4. ✅ Settings pages:
   - Profile settings
   - System settings
   - Appearance settings
5. ✅ Reports & Exports (data export functionality)

**Phase 4 - Phase 2 Features:**

1. ⏸️ Bookings module
2. ⏸️ Contracts module
3. ⏸️ Payments module
4. ⏸️ Damage Reports module
5. ⏸️ Reviews module

---

## TESTING STRATEGY

### 6. Backend Testing Setup

#### 6.1 Testing Dependencies

```json
{
  "devDependencies": {
    "@nestjs/testing": "^10.0.0",
    "jest": "^29.5.0",
    "@types/jest": "^29.5.2",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12"
  }
}
```

#### 6.2 Jest Configuration

**`jest.config.js`:**

```javascript
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: [
    "**/*.(t|j)s",
    "!**/*.spec.ts",
    "!**/*.entity.ts",
    "!**/*.dto.ts",
    "!**/*.interface.ts",
  ],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
```

#### 6.3 Unit Tests

**Service Unit Test Template:**

```typescript
// vehicles.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VehiclesService } from "./vehicles.service";
import { Vehicle } from "./entities/vehicle.entity";
import { NotFoundException } from "@nestjs/common";

describe("VehiclesService", () => {
  let service: VehiclesService;
  let repository: Repository<Vehicle>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    repository = module.get<Repository<Vehicle>>(getRepositoryToken(Vehicle));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findOne", () => {
    it("should return a vehicle", async () => {
      const vehicle = { id: 1, vehicle_id: "VEH-001", plate: "30A-12345" };
      mockRepository.findOne.mockResolvedValue(vehicle);

      const result = await service.findOne(1);

      expect(result).toEqual(vehicle);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("should throw NotFoundException when vehicle not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
```

#### 6.4 Integration Tests

**Controller Integration Test Template:**

```typescript
// vehicles.controller.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

describe("VehiclesController", () => {
  let controller: VehiclesController;
  let service: VehiclesService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        {
          provide: VehiclesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
    service = module.get<VehiclesService>(VehiclesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
```

#### 6.5 E2E Tests

**E2E Test Template:**

```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET)", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe("healthy");
      });
  });
});
```

**Test Categories:**

1. **Unit Tests:**

   - Service methods
   - Utility functions
   - DTO validation
   - Repository methods

2. **Integration Tests:**

   - Controller endpoints
   - Database operations
   - MQTT/WebSocket connections
   - External API calls

3. **E2E Tests:**
   - Complete workflows
   - Authentication flows
   - API endpoints end-to-end

### 7. Frontend Testing

**Unit Tests:**

- Utility functions
- Custom hooks
- Component rendering

**Integration Tests:**

- Form submissions
- API calls
- State management

**E2E Tests:**

- User workflows
- Navigation
- Real-time updates

---

## CODE REVIEW CHECKLIST

### 8. Backend Checklist

- [x] Follows NestJS module structure
- [x] DTOs have proper validation
- [x] Services have error handling
- [x] Database queries are optimized
- [x] No hardcoded values
- [x] Proper logging
- [x] API documentation (Swagger)
- [ ] Unit tests written
- [x] No security vulnerabilities

### 9. Frontend Checklist

- [ ] Components are reusable
- [ ] Hooks follow naming convention
- [ ] API calls use custom hooks
- [ ] Forms have validation
- [ ] Error handling implemented
- [ ] Loading states shown
- [ ] TypeScript types defined
- [ ] No `any` types
- [ ] Responsive design
- [ ] Accessibility (a11y) considered

---

## TÓM TẮT

**Backend:**

- NestJS với module-based architecture
- DTO validation với class-validator
- Service layer cho business logic
- Repository pattern cho database
- Exception filters cho error handling
- Swagger cho API documentation

**Frontend:**

- Next.js App Router
- Feature-based structure
- Custom hooks cho data fetching
- React Hook Form + Zod validation
- TanStack Query cho server state
- Zustand cho client state
- Socket.io cho realtime

**Principles:**

- SOLID principles
- DRY, KISS, YAGNI
- Clean code practices
- Type safety (TypeScript)
- Error handling
- Testing

---

## QUICK START GUIDE

### Setup Steps

1. **Initialize Project:**

   ```bash
   cd iot-vehicle-tracking-system/backend
   npm install
   ```

2. **Configure Environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run Migrations:**

   ```bash
   npm run migration:run
   ```

4. **Start Development Server:**

   ```bash
   npm run start:dev
   ```

5. **Run Tests:**

   ```bash
   npm run test          # Unit tests
   npm run test:e2e      # E2E tests
   npm run test:cov      # Coverage
   ```

6. **Build for Production:**
   ```bash
   npm run build
   npm run start:prod
   ```

### Development Workflow

1. Create feature branch
2. Implement feature following patterns
3. Write tests (unit + integration)
4. Run linter: `npm run lint`
5. Run type checking: `npm run typecheck`
6. Run tests: `npm run test`
7. Create migration if needed: `npm run migration:generate -- src/migrations/YourMigration`
8. Commit changes
9. Create PR with description

### Common Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debug mode

# Production
npm run build              # Build project
npm run start:prod         # Start production server

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run E2E tests
npm run test:debug         # Run tests in debug mode

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint errors
npm run format             # Format with Prettier
npm run format:check       # Check formatting without fixing
npm run typecheck          # Type check without emit
npm run verify             # Run lint + typecheck + test

# Database
npm run migration:generate # Generate migration from entities
npm run migration:create   # Create empty migration
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
npm run migration:show     # Show migration status
```

### Package.json Scripts Template

```json
{
  "scripts": {
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main.js",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\"",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "verify": "npm run lint && npm run typecheck && npm run test",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/data-source.ts",
    "migration:create": "typeorm-ts-node-commonjs migration:create",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/data-source.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d src/config/data-source.ts"
  }
}
```

---

## DOCKER & ENVIRONMENT VARIABLES

### Build-time vs Runtime Environment Variables

#### Understanding the Difference

**Build-time (ARG):**

- Set during `docker build`
- Embedded into image
- Cannot be changed after build
- Use for build configuration only

**Runtime (ENV):**

- Set when container starts (`docker-compose up`)
- Read from `.env` file or docker-compose.yml
- Can be different for each deployment
- Use for application configuration

#### Workflow Example

**1. Build Image (Local):**

```bash
# Local .env (for reference only, NOT embedded)
DB_HOST=localhost
DB_PASSWORD=local_dev_password

# Build image
docker-compose build backend
# Image contains code only, NO env values embedded
```

**2. Push to Registry:**

```bash
docker push your-registry/backend:latest
```

**3. Deploy to Server:**

```bash
# Server .env (NEW - used when container runs)
DB_HOST=postgres-server.prod
DB_PASSWORD=production_secure_password

# Pull and run
docker-compose pull backend
docker-compose up -d backend
# Container uses .env from SERVER, not from build time
```

#### Dockerfile Best Practices

```dockerfile
# ✅ GOOD: Only use ARG for build-time config
ARG NODE_ENV=production
ARG BUILD_VERSION

# Build with these args
RUN echo "Building version $BUILD_VERSION for $NODE_ENV"

# ✅ GOOD: Set default ENV (will be overridden by docker-compose)
ENV NODE_ENV=production
ENV PORT=3000

# ❌ BAD: Don't hardcode secrets
# ENV DB_PASSWORD=secret123
# ENV JWT_SECRET=my_secret

# Runtime env will come from docker-compose.yml
```

#### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  backend:
    image: your-registry/backend:latest
    environment:
      # ✅ These are RUNTIME variables
      # Read from .env file on server
      NODE_ENV: ${NODE_ENV}
      PORT: ${PORT}
      DB_HOST: ${DB_HOST}
      DB_PASSWORD: ${DB_PASSWORD}
      INFLUXDB_URL: ${INFLUXDB_URL}
      JWT_SECRET: ${JWT_SECRET}
```

#### NestJS ConfigService Integration

```typescript
// ✅ ConfigService reads from process.env (injected by docker-compose)
export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST,        // From server .env
  password: process.env.DB_PASSWORD, // From server .env
}));

// Services use ConfigService
constructor(
  private readonly configService: ConfigService
) {
  // Gets value from .env on SERVER, not from build time
  const dbHost = this.configService.get<string>('database.host');
}
```

#### Key Points

1. **Build once, deploy anywhere**: Image is environment-agnostic
2. **Server-specific config**: Each server has its own `.env` file
3. **Security**: Secrets never embedded in image
4. **Flexibility**: Same image for dev/staging/production
5. **ConfigService**: Always reads runtime environment variables

#### Environment File Organization

```
project/
├── .env.example          # Template (committed to git)
├── .env.local            # Local development (gitignored)
├── .env.development      # Dev server (gitignored)
├── .env.staging          # Staging server (gitignored)
└── .env.production       # Production server (gitignored)
```

**Usage:**

```bash
# Local
docker-compose --env-file .env.local up

# Server
docker-compose --env-file .env.production up
```
