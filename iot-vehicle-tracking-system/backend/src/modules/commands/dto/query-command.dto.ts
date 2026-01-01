import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCommandDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({
    required: false,
    enum: ['pending', 'sent', 'acknowledged', 'failed'],
  })
  @IsEnum(['pending', 'sent', 'acknowledged', 'failed'])
  @IsOptional()
  status?: string;

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
}

