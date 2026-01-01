import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTripDto {
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

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  vehicleId?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  customerId?: number;

  @ApiProperty({
    required: false,
    enum: ['in_progress', 'completed', 'cancelled'],
  })
  @IsEnum(['in_progress', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, example: '2024-01-15T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, example: '2024-01-15T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

