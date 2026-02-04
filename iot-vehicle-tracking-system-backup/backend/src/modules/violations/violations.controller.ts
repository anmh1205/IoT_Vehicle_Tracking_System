import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ViolationsService } from './violations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('violations')
@Controller('violations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ViolationsController {
    constructor(private readonly violationsService: ViolationsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all violations' })
    async findAll(@Query() query: { page?: number; limit?: number; vehicleId?: number; violationType?: string }) {
        return this.violationsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get violation by ID' })
    async findOne(@Param('id') id: string) {
        return this.violationsService.findOne(+id);
    }

    @Put(':id/acknowledge')
    @ApiOperation({ summary: 'Acknowledge violation' })
    async acknowledge(@Param('id') id: string) {
        return this.violationsService.acknowledge(+id);
    }
}
