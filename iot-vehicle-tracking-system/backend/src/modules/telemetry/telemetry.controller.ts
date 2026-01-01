import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { DevicesService } from '@/modules/devices/devices.service';

@ApiTags('telemetry')
@Controller('telemetry')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly devicesService: DevicesService
  ) {}

  @Get('location')
  @ApiOperation({ summary: 'Get location data from InfluxDB' })
  @ApiResponse({
    status: 200,
    description: 'Location data',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async getLocation(
    @Query('device_id') deviceId: string,
    @Query('start_time') startTime: string,
    @Query('end_time') endTime: string,
    @Query('interval') interval?: string
  ) {
    if (!deviceId || !startTime || !endTime) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Missing required parameters: device_id, start_time, end_time',
        details: {
          missing_fields: [
            !deviceId ? 'device_id' : null,
            !startTime ? 'start_time' : null,
            !endTime ? 'end_time' : null,
          ].filter(Boolean),
        },
      });
    }

    // Verify device exists
    try {
      await this.devicesService.findByDeviceId(deviceId);
    } catch (error) {
      throw new BadRequestException({
        code: 'NOT_FOUND',
        message: `Device with ID '${deviceId}' not found`,
        details: { device_id: deviceId },
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    return this.telemetryService.getLocation(deviceId, start, end, interval);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get vehicle movement history' })
  @ApiResponse({
    status: 200,
    description: 'Movement history',
  })
  async getHistory(
    @Query('vehicle_id') vehicleId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('include_stops') includeStops?: boolean
  ) {
    if (!vehicleId || !startDate || !endDate) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Missing required parameters: vehicle_id, start_date, end_date',
      });
    }

    return this.telemetryService.getHistory(
      +vehicleId,
      new Date(startDate),
      new Date(endDate),
      includeStops
    );
  }
}

