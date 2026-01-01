import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GeofencesService } from './geofences.service';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { AssignVehiclesDto } from './dto/assign-vehicles.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('geofences')
@Controller('geofences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GeofencesController {
  constructor(private readonly geofencesService: GeofencesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new geofence' })
  @ApiResponse({
    status: 201,
    description: 'Geofence created successfully',
  })
  create(
    @Body() createGeofenceDto: CreateGeofenceDto,
    @CurrentUser() user: any
  ) {
    return this.geofencesService.create(createGeofenceDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all geofences' })
  @ApiResponse({
    status: 200,
    description: 'List of geofences',
  })
  findAll() {
    return this.geofencesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get geofence by ID' })
  @ApiResponse({
    status: 200,
    description: 'Geofence details',
  })
  findOne(@Param('id') id: string) {
    return this.geofencesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update geofence' })
  @ApiResponse({
    status: 200,
    description: 'Geofence updated successfully',
  })
  update(@Param('id') id: string, @Body() updateGeofenceDto: UpdateGeofenceDto) {
    return this.geofencesService.update(+id, updateGeofenceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete geofence' })
  @ApiResponse({
    status: 200,
    description: 'Geofence deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.geofencesService.remove(+id);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign vehicles to geofence' })
  @ApiResponse({
    status: 200,
    description: 'Vehicles assigned successfully',
  })
  assignVehicles(
    @Param('id') id: string,
    @Body() assignDto: AssignVehiclesDto
  ) {
    return this.geofencesService.assignVehicles(+id, assignDto);
  }
}

