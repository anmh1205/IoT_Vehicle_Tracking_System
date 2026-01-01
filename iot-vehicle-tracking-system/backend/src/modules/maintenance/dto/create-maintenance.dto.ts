import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreateMaintenanceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  vehicleId: number;

  @ApiProperty({ example: 'oil_change' })
  @IsString()
  @IsNotEmpty()
  maintenanceType: string;

  @ApiProperty({ required: false, example: 'Thay dầu động cơ' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, example: 500000 })
  @IsNumber()
  @IsOptional()
  cost?: number;

  @ApiProperty({ required: false, example: 15000 })
  @IsInt()
  @IsOptional()
  mileageKm?: number;

  @ApiProperty({ required: false, example: 'Kỹ thuật viên A' })
  @IsString()
  @IsOptional()
  performedBy?: string;

  @ApiProperty({ required: false, example: '2024-04-15' })
  @IsDateString()
  @IsOptional()
  nextMaintenanceDate?: string;

  @ApiProperty({ required: false, example: 20000 })
  @IsInt()
  @IsOptional()
  nextMaintenanceMileage?: number;
}

