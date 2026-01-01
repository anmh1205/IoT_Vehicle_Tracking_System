import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Vehicle ID (unique identifier)',
    example: 'VEHICLE_001',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'vehicle_id must contain only uppercase letters, numbers, and underscores',
  })
  vehicleId: string;

  @ApiProperty({
    description: 'License plate number',
    example: '30A-12345',
  })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({ required: false, example: 'Toyota' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ required: false, example: 'Camry' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ required: false, example: 2020 })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  @IsOptional()
  year?: number;

  @ApiProperty({ required: false, example: 'White' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, example: 'sedan' })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiProperty({ required: false, example: 'JT1234567890' })
  @IsString()
  @IsOptional()
  vin?: string;

  @ApiProperty({ required: false, example: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  seats?: number;

  @ApiProperty({ required: false, example: 'automatic' })
  @IsString()
  @IsOptional()
  transmission?: string;

  @ApiProperty({ required: false, example: 'gasoline' })
  @IsString()
  @IsOptional()
  fuelType?: string;

  @ApiProperty({ required: false, example: 15000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  mileageKm?: number;

  @ApiProperty({ required: false, example: 'REG123456' })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiProperty({ required: false, example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  insuranceExpiry?: string;

  @ApiProperty({
    required: false,
    enum: ['active', 'inactive', 'maintenance', 'retired'],
    default: 'active',
  })
  @IsEnum(['active', 'inactive', 'maintenance', 'retired'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  ownerId?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  deviceId?: number;
}

