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

export class CreateViolationDto {
  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  tripId?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  vehicleId: number;

  @ApiProperty({
    example: 'speeding',
    description: "Violation type: 'speeding', 'red_light', 'wrong_way', etc.",
  })
  @IsString()
  @IsNotEmpty()
  violationType: string;

  @ApiProperty({ example: '2024-01-15T09:30:00Z' })
  @IsDateString()
  @IsNotEmpty()
  violationTime: string;

  @ApiProperty({ required: false, example: 21.028511 })
  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @ApiProperty({ required: false, example: 105.804817 })
  @IsNumber()
  @IsOptional()
  locationLon?: number;

  @ApiProperty({ required: false, example: 80.0 })
  @IsNumber()
  @IsOptional()
  speedLimit?: number;

  @ApiProperty({ required: false, example: 85.0 })
  @IsNumber()
  @IsOptional()
  actualSpeed?: number;

  @ApiProperty({
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: string;

  @ApiProperty({ required: false, example: 'Vượt quá tốc độ 80 km/h' })
  @IsString()
  @IsOptional()
  description?: string;
}

