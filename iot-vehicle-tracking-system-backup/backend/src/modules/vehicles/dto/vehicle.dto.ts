import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsEnum,
    Min,
    Max,
    IsDateString,
} from 'class-validator';
import { VehicleType, Transmission, FuelType, VehicleStatus } from '../entities/vehicle.entity';

export class CreateVehicleDto {
    @ApiProperty({ example: 'VH001' })
    @IsString()
    @IsNotEmpty()
    vehicleId: string;

    @ApiProperty({ example: '29A-12345' })
    @IsString()
    @IsNotEmpty()
    plateNumber: string;

    @ApiPropertyOptional({ enum: VehicleType, example: VehicleType.SEDAN })
    @IsEnum(VehicleType)
    @IsOptional()
    vehicleType?: VehicleType;

    @ApiPropertyOptional({ example: 'Toyota' })
    @IsString()
    @IsOptional()
    brand?: string;

    @ApiPropertyOptional({ example: 'Camry' })
    @IsString()
    @IsOptional()
    model?: string;

    @ApiPropertyOptional({ example: 2023 })
    @IsNumber()
    @IsOptional()
    @Min(1900)
    @Max(2100)
    year?: number;

    @ApiPropertyOptional({ example: 'Black' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ example: '1HGBH41JXMN109186' })
    @IsString()
    @IsOptional()
    vin?: string;

    @ApiPropertyOptional({ example: 5 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(50)
    seats?: number;

    @ApiPropertyOptional({ enum: Transmission, example: Transmission.AUTOMATIC })
    @IsEnum(Transmission)
    @IsOptional()
    transmission?: Transmission;

    @ApiPropertyOptional({ enum: FuelType, example: FuelType.GASOLINE })
    @IsEnum(FuelType)
    @IsOptional()
    fuelType?: FuelType;

    @ApiPropertyOptional({ example: 50000 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    mileageKm?: number;

    @ApiPropertyOptional({ example: 'REG-2023-001' })
    @IsString()
    @IsOptional()
    registrationNumber?: string;

    @ApiPropertyOptional({ example: '2025-12-31' })
    @IsDateString()
    @IsOptional()
    insuranceExpiry?: string;

    @ApiPropertyOptional({ enum: VehicleStatus, example: VehicleStatus.ACTIVE })
    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;
}

export class UpdateVehicleDto {
    @ApiPropertyOptional({ example: '29A-12345' })
    @IsString()
    @IsOptional()
    plateNumber?: string;

    @ApiPropertyOptional({ enum: VehicleType })
    @IsEnum(VehicleType)
    @IsOptional()
    vehicleType?: VehicleType;

    @ApiPropertyOptional({ example: 'Toyota' })
    @IsString()
    @IsOptional()
    brand?: string;

    @ApiPropertyOptional({ example: 'Camry' })
    @IsString()
    @IsOptional()
    model?: string;

    @ApiPropertyOptional({ example: 2023 })
    @IsNumber()
    @IsOptional()
    @Min(1900)
    @Max(2100)
    year?: number;

    @ApiPropertyOptional({ example: 'Black' })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional({ example: 5 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(50)
    seats?: number;

    @ApiPropertyOptional({ enum: Transmission })
    @IsEnum(Transmission)
    @IsOptional()
    transmission?: Transmission;

    @ApiPropertyOptional({ enum: FuelType })
    @IsEnum(FuelType)
    @IsOptional()
    fuelType?: FuelType;

    @ApiPropertyOptional({ example: 50000 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    mileageKm?: number;

    @ApiPropertyOptional({ enum: VehicleStatus })
    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;
}

export class QueryVehicleDto {
    @ApiPropertyOptional({ example: 1, description: 'Page number' })
    @IsNumber()
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, description: 'Items per page' })
    @IsNumber()
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Search by plate number or vehicle ID' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ enum: VehicleStatus })
    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;

    @ApiPropertyOptional({ enum: VehicleType })
    @IsEnum(VehicleType)
    @IsOptional()
    vehicleType?: VehicleType;
}
