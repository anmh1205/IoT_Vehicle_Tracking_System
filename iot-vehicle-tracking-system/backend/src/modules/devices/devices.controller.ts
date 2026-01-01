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
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({
    status: 201,
    description: 'Device created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Device ID or IMEI already exists',
  })
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all devices with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of devices',
  })
  findAll(@Query() queryDto: QueryDeviceDto) {
    return this.devicesService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiResponse({
    status: 200,
    description: 'Device details',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update device' })
  @ApiResponse({
    status: 200,
    description: 'Device updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(+id, updateDeviceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete device' })
  @ApiResponse({
    status: 200,
    description: 'Device deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  remove(@Param('id') id: string) {
    return this.devicesService.remove(+id);
  }
}

