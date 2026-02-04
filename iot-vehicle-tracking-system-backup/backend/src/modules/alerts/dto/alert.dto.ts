import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { AlertType, AlertSeverity } from '../entities/alert.entity';

export class QueryAlertDto {
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

    @ApiPropertyOptional({ enum: AlertType })
    @IsEnum(AlertType)
    @IsOptional()
    alertType?: AlertType;

    @ApiPropertyOptional({ enum: AlertSeverity })
    @IsEnum(AlertSeverity)
    @IsOptional()
    severity?: AlertSeverity;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    acknowledged?: boolean;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    resolved?: boolean;
}
