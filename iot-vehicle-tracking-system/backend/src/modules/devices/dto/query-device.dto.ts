import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDeviceDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    required: false,
    enum: ['active', 'inactive', 'offline', 'error'],
  })
  @IsEnum(['active', 'inactive', 'offline', 'error'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiProperty({
    required: false,
    description: 'Search by device_id, imei, or sim_card_number',
  })
  @IsString()
  @IsOptional()
  search?: string;
}

