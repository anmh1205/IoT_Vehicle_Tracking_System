import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, QueryVehicleDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) { }

    @Post()
    @Roles('admin', 'manager', 'staff')
    @ApiOperation({ summary: 'Create a new vehicle' })
    @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    @ApiResponse({ status: 409, description: 'Vehicle already exists' })
    async create(@Body() createVehicleDto: CreateVehicleDto) {
        return this.vehiclesService.create(createVehicleDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all vehicles with pagination and filtering' })
    @ApiResponse({ status: 200, description: 'List of vehicles' })
    async findAll(@Query() query: QueryVehicleDto) {
        return this.vehiclesService.findAll(query);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get vehicle statistics' })
    @ApiResponse({ status: 200, description: 'Vehicle statistics' })
    async getStats() {
        return this.vehiclesService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get vehicle by ID' })
    @ApiResponse({ status: 200, description: 'Vehicle details' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    async findOne(@Param('id') id: string) {
        return this.vehiclesService.findOne(+id);
    }

    @Put(':id')
    @Roles('admin', 'manager', 'staff')
    @ApiOperation({ summary: 'Update vehicle' })
    @ApiResponse({ status: 200, description: 'Vehicle updated' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    async update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
        return this.vehiclesService.update(+id, updateVehicleDto);
    }

    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete vehicle' })
    @ApiResponse({ status: 204, description: 'Vehicle deleted' })
    @ApiResponse({ status: 404, description: 'Vehicle not found' })
    async remove(@Param('id') id: string) {
        return this.vehiclesService.remove(+id);
    }
}
