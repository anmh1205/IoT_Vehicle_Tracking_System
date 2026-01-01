import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({
    status: 201,
    description: 'Vehicle created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Vehicle ID or plate number already exists',
  })
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of vehicles',
  })
  findAll(@Query() queryDto: QueryVehicleDto) {
    return this.vehiclesService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle details',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehicle not found',
  })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehicle not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Vehicle ID or plate number already exists',
  })
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(+id, updateVehicleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vehicle' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehicle not found',
  })
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(+id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get real-time status of a vehicle (location, device, trip, alerts)' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle real-time status',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehicle not found',
  })
  getStatus(@Param('id') id: string) {
    return this.vehiclesService.getStatus(+id);
  }
}

