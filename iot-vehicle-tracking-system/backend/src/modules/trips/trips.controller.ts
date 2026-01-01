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
} from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('trips')
@Controller('trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({
    status: 201,
    description: 'Trip created successfully',
  })
  create(@Body() createTripDto: CreateTripDto) {
    return this.tripsService.create(createTripDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trips with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of trips',
  })
  findAll(@Query() queryDto: QueryTripDto) {
    return this.tripsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip by ID with events' })
  @ApiResponse({
    status: 200,
    description: 'Trip details',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
  })
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update trip' })
  @ApiResponse({
    status: 200,
    description: 'Trip updated successfully',
  })
  update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto) {
    return this.tripsService.update(+id, updateTripDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete trip' })
  @ApiResponse({
    status: 200,
    description: 'Trip deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.tripsService.remove(+id);
  }
}

