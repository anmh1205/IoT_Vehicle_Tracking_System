import {
  Controller,
  Get,
  Post,
  Body,
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
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new maintenance record' })
  @ApiResponse({
    status: 201,
    description: 'Maintenance record created successfully',
  })
  create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenanceService.create(createMaintenanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all maintenance records with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of maintenance records',
  })
  findAll(@Query() queryDto: QueryMaintenanceDto) {
    return this.maintenanceService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance record details',
  })
  @ApiResponse({
    status: 404,
    description: 'Maintenance record not found',
  })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete maintenance record' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance record deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.maintenanceService.remove(+id);
  }
}

