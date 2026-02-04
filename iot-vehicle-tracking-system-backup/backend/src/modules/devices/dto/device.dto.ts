import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { DeviceStatus } from '../entities/device.entity';

export class CreateDeviceDto {
    @ApiProperty({ example: 'TRACKER_001' })
    @IsString()
    @IsNotEmpty()
    deviceId: string;

    @ApiPropertyOptional({ example: 1 })
    @IsNumber()
    @IsOptional()
    vehicleId?: number;

    @ApiPropertyOptional({ example: 'tracker' })
    @IsString()
    @IsOptional()
    deviceType?: string;

    @ApiPropertyOptional({ example: '1.0.0' })
    @IsString()
    @IsOptional()
    firmwareVersion?: string;

    @ApiPropertyOptional({ example: '868123456789012' })
    @IsString()
    @IsOptional()
    imei?: string;

    @ApiPropertyOptional({ example: '0901234567' })
    @IsString()
    @IsOptional()
    simCardNumber?: string;
}

export class UpdateDeviceDto {
    @ApiPropertyOptional({ example: 1 })
    @IsNumber()
    @IsOptional()
    vehicleId?: number;

    @ApiPropertyOptional({ example: '1.0.1' })
    @IsString()
    @IsOptional()
    firmwareVersion?: string;

    @ApiPropertyOptional({ enum: DeviceStatus })
    @IsEnum(DeviceStatus)
    @IsOptional()
    status?: DeviceStatus;
}

export class QueryDeviceDto {
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

    @ApiPropertyOptional({ enum: DeviceStatus })
    @IsEnum(DeviceStatus)
    @IsOptional()
    status?: DeviceStatus;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    vehicleId?: number;
}
