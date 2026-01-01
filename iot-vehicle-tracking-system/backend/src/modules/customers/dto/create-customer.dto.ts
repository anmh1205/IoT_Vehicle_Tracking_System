import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsInt,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ required: false, example: 'nguyenvana@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false, example: '1990-01-01' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ required: false, example: '001234567890' })
  @IsString()
  @IsOptional()
  idCardNumber?: string;

  @ApiProperty({ required: false, example: '2010-01-01' })
  @IsDateString()
  @IsOptional()
  idCardIssueDate?: string;

  @ApiProperty({ required: false, example: 'Công an Hà Nội' })
  @IsString()
  @IsOptional()
  idCardIssuePlace?: string;

  @ApiProperty({ required: false, example: '123 Đường ABC, Quận XYZ, Hà Nội' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false, example: 'BL123456' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiProperty({ required: false, example: 'B2' })
  @IsString()
  @IsOptional()
  licenseType?: string;

  @ApiProperty({ required: false, example: '2015-01-01' })
  @IsDateString()
  @IsOptional()
  licenseIssueDate?: string;

  @ApiProperty({ required: false, example: '2030-01-01' })
  @IsDateString()
  @IsOptional()
  licenseExpiryDate?: string;

  @ApiProperty({ required: false, example: 'Sở GTVT Hà Nội' })
  @IsString()
  @IsOptional()
  licenseIssuePlace?: string;

  @ApiProperty({
    required: false,
    enum: ['active', 'suspended', 'blacklisted'],
    default: 'active',
  })
  @IsEnum(['active', 'suspended', 'blacklisted'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  userId?: number;
}

