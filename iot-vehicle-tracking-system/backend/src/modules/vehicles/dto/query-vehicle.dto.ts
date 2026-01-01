import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryVehicleDto {
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
    enum: ['active', 'inactive', 'maintenance', 'retired'],
  })
  @IsEnum(['active', 'inactive', 'maintenance', 'retired'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiProperty({ required: false, description: 'Search by plate number, brand, or model' })
  @IsString()
  @IsOptional()
  search?: string;
}

