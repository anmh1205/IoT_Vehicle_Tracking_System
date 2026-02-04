import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Maintenance } from './entities/maintenance.entity';

@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    @Post()
    @ApiOperation({ summary: 'Create maintenance record' })
    async create(@Body() data: Partial<Maintenance>) {
        return this.maintenanceService.create(data);
    }

    @Get()
    @ApiOperation({ summary: 'Get all maintenance records' })
    async findAll(@Query() query: { page?: number; limit?: number; vehicleId?: number }) {
        return this.maintenanceService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get maintenance by ID' })
    async findOne(@Param('id') id: string) {
        return this.maintenanceService.findOne(+id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update maintenance' })
    async update(@Param('id') id: string, @Body() data: Partial<Maintenance>) {
        return this.maintenanceService.update(+id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete maintenance' })
    async remove(@Param('id') id: string) {
        return this.maintenanceService.remove(+id);
    }
}
