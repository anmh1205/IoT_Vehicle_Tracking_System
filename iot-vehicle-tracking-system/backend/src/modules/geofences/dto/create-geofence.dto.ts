import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateIf,
} from 'class-validator';

export class CreateGeofenceDto {
  @ApiProperty({ example: 'Văn phòng chính' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'Khu vực văn phòng' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    required: false,
    enum: ['circle', 'polygon', 'rectangle'],
    default: 'circle',
  })
  @IsEnum(['circle', 'polygon', 'rectangle'])
  @IsOptional()
  geofenceType?: string;

  @ApiProperty({ required: false, example: 21.028511 })
  @ValidateIf((o) => o.geofenceType === 'circle')
  @IsNumber()
  @IsOptional()
  centerLat?: number;

  @ApiProperty({ required: false, example: 105.804817 })
  @ValidateIf((o) => o.geofenceType === 'circle')
  @IsNumber()
  @IsOptional()
  centerLon?: number;

  @ApiProperty({ required: false, example: 500 })
  @ValidateIf((o) => o.geofenceType === 'circle')
  @IsNumber()
  @IsOptional()
  radiusMeters?: number;

  @ApiProperty({
    required: false,
    example: [
      [21.028511, 105.804817],
      [21.029511, 105.805817],
      [21.030511, 105.806817],
    ],
    description: 'Array of [lat, lon] pairs for polygon',
  })
  @ValidateIf((o) => o.geofenceType === 'polygon')
  @IsArray()
  @IsOptional()
  coordinates?: number[][];

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  alertOnEntry?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  alertOnExit?: boolean;
}

