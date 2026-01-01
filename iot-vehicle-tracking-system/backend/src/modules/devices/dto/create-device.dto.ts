import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ example: 'TRACKER_001' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  vehicleId?: number;

  @ApiProperty({ required: false, example: 'tracker', default: 'tracker' })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiProperty({ required: false, example: '1.0.0' })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;

  @ApiProperty({ required: false, example: '1.0' })
  @IsString()
  @IsOptional()
  hardwareVersion?: string;

  @ApiProperty({ required: false, example: '123456789012345' })
  @IsString()
  @IsOptional()
  imei?: string;

  @ApiProperty({ required: false, example: '0123456789' })
  @IsString()
  @IsOptional()
  simCardNumber?: string;

  @ApiProperty({
    required: false,
    enum: ['active', 'inactive', 'offline', 'error'],
    default: 'active',
  })
  @IsEnum(['active', 'inactive', 'offline', 'error'])
  @IsOptional()
  status?: string;
}

