import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { QueryTripDto } from './dto/trip.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('trips')
@Controller('trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all trips' })
    async findAll(@Query() query: QueryTripDto) {
        return this.tripsService.findAll(query);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get trip statistics' })
    async getStats() {
        return this.tripsService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get trip by ID' })
    async findOne(@Param('id') id: string) {
        return this.tripsService.findOne(+id);
    }
}
