import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { TripStatus } from '../entities/trip.entity';

export class QueryTripDto {
    @ApiPropertyOptional({ example: 1 })
    @IsNumber()
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ example: 10 })
    @IsNumber()
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    vehicleId?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    customerId?: number;

    @ApiPropertyOptional({ enum: TripStatus })
    @IsEnum(TripStatus)
    @IsOptional()
    status?: TripStatus;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    endDate?: string;
}
