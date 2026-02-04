import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('telemetry')
@Controller('telemetry')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TelemetryController {
    constructor(private readonly telemetryService: TelemetryService) { }

    @Get('location/:vehicleId')
    @ApiOperation({ summary: 'Get current vehicle location' })
    async getLocation(@Param('vehicleId') vehicleId: string) {
        return this.telemetryService.getLocation(+vehicleId);
    }

    @Get('history/:vehicleId')
    @ApiOperation({ summary: 'Get vehicle location history' })
    async getHistory(
        @Param('vehicleId') vehicleId: string,
        @Query('startTime') startTime: string,
        @Query('endTime') endTime: string,
    ) {
        return this.telemetryService.getHistory(+vehicleId, startTime, endTime);
    }
}
