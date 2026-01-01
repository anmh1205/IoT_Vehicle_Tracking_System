import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  vehicleId: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  customerId?: number;

  @ApiProperty({ example: 'TRIP-20240115-001' })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ required: false, example: 21.028511 })
  @IsNumber()
  @IsOptional()
  startLocationLat?: number;

  @ApiProperty({ required: false, example: 105.804817 })
  @IsNumber()
  @IsOptional()
  startLocationLon?: number;

  @ApiProperty({ required: false, example: 15000 })
  @IsInt()
  @IsOptional()
  mileageAtStart?: number;
}

