import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { QueryAlertDto } from './dto/alert.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all alerts' })
    async findAll(@Query() query: QueryAlertDto) {
        return this.alertsService.findAll(query);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get alert statistics' })
    async getStats() {
        return this.alertsService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get alert by ID' })
    async findOne(@Param('id') id: string) {
        return this.alertsService.findOne(+id);
    }

    @Put(':id/acknowledge')
    @ApiOperation({ summary: 'Acknowledge alert' })
    async acknowledge(@Param('id') id: string) {
        return this.alertsService.acknowledge(+id);
    }

    @Put(':id/resolve')
    @ApiOperation({ summary: 'Resolve alert' })
    async resolve(@Param('id') id: string) {
        return this.alertsService.resolve(+id);
    }
}
