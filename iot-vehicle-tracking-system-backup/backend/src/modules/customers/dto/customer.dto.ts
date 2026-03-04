import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsEmail, IsDateString } from 'class-validator';
import { CustomerStatus, VerificationStatus } from '../entities/customer.entity';

export class CreateCustomerDto {
    @ApiProperty({ example: 'Nguyen Van A' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiPropertyOptional({ example: 'customer@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: '0901234567' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiPropertyOptional({ example: '1990-01-01' })
    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @ApiPropertyOptional({ example: '001234567890' })
    @IsString()
    @IsOptional()
    idCardNumber?: string;

    @ApiPropertyOptional({ example: '123 Street, District, City' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ example: 'B2-123456' })
    @IsString()
    @IsOptional()
    licenseNumber?: string;

    @ApiPropertyOptional({ example: 'B2' })
    @IsString()
    @IsOptional()
    licenseType?: string;
}

export class UpdateCustomerDto {
    @ApiPropertyOptional({ example: 'Nguyen Van A' })
    @IsString()
    @IsOptional()
    fullName?: string;

    @ApiPropertyOptional({ example: 'customer@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({ example: '0901234567' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: '123 Street' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ enum: CustomerStatus })
    @IsEnum(CustomerStatus)
    @IsOptional()
    status?: CustomerStatus;

    @ApiPropertyOptional({ enum: VerificationStatus })
    @IsEnum(VerificationStatus)
    @IsOptional()
    verificationStatus?: VerificationStatus;
}

export class QueryCustomerDto {
    @ApiPropertyOptional({ example: 1 })
    @IsNumber()
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ example: 10 })
    @IsNumber()
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ enum: CustomerStatus })
    @IsEnum(CustomerStatus)
    @IsOptional()
    status?: CustomerStatus;

    @ApiPropertyOptional({ enum: VerificationStatus })
    @IsEnum(VerificationStatus)
    @IsOptional()
    verificationStatus?: VerificationStatus;
}
