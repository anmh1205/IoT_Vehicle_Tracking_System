import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GeofencesService } from './geofences.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Geofence } from './entities/geofence.entity';

@ApiTags('geofences')
@Controller('geofences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GeofencesController {
    constructor(private readonly geofencesService: GeofencesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new geofence' })
    async create(@Body() data: Partial<Geofence>) {
        return this.geofencesService.create(data);
    }

    @Get()
    @ApiOperation({ summary: 'Get all geofences' })
    async findAll(@Query() query: { page?: number; limit?: number }) {
        return this.geofencesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get geofence by ID' })
    async findOne(@Param('id') id: string) {
        return this.geofencesService.findOne(+id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update geofence' })
    async update(@Param('id') id: string, @Body() data: Partial<Geofence>) {
        return this.geofencesService.update(+id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete geofence' })
    async remove(@Param('id') id: string) {
        return this.geofencesService.remove(+id);
    }
}
