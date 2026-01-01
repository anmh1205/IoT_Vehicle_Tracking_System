import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCustomerDto {
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
    enum: ['active', 'suspended', 'blacklisted'],
  })
  @IsEnum(['active', 'suspended', 'blacklisted'])
  @IsOptional()
  status?: string;

  @ApiProperty({
    required: false,
    enum: ['pending', 'verified', 'rejected'],
  })
  @IsEnum(['pending', 'verified', 'rejected'])
  @IsOptional()
  verificationStatus?: string;

  @ApiProperty({
    required: false,
    description: 'Search by name, phone, email, or ID card number',
  })
  @IsString()
  @IsOptional()
  search?: string;
}

