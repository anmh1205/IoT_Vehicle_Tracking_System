import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';

export class CreateAlertDto {
  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  vehicleId?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  deviceId?: number;

  @ApiProperty({
    example: 'motion_detected',
    description:
      "Alert type: 'motion_detected', 'low_battery', 'geofence_exit', 'speeding', 'ignition_on', 'unauthorized_movement'",
  })
  @IsString()
  @IsNotEmpty()
  alertType: string;

  @ApiProperty({
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: string;

  @ApiProperty({ required: false, example: 'Motion Detected' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, example: 'Vehicle movement detected while parked' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ required: false, example: 21.028511 })
  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @ApiProperty({ required: false, example: 105.804817 })
  @IsNumber()
  @IsOptional()
  locationLon?: number;
}

