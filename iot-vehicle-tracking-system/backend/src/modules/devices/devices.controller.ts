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
import { DevicesService } from './devices.service';
import { CreateDeviceDto, UpdateDeviceDto, QueryDeviceDto } from './dto/device.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) { }

    @Post()
    @Roles('admin', 'manager')
    @ApiOperation({ summary: 'Create a new device' })
    @ApiResponse({ status: 201, description: 'Device created' })
    async create(@Body() createDeviceDto: CreateDeviceDto) {
        return this.devicesService.create(createDeviceDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all devices' })
    @ApiResponse({ status: 200, description: 'List of devices' })
    async findAll(@Query() query: QueryDeviceDto) {
        return this.devicesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get device by ID' })
    @ApiResponse({ status: 200, description: 'Device details' })
    async findOne(@Param('id') id: string) {
        return this.devicesService.findOne(+id);
    }

    @Put(':id')
    @Roles('admin', 'manager')
    @ApiOperation({ summary: 'Update device' })
    @ApiResponse({ status: 200, description: 'Device updated' })
    async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
        return this.devicesService.update(+id, updateDeviceDto);
    }

    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete device' })
    @ApiResponse({ status: 204, description: 'Device deleted' })
    async remove(@Param('id') id: string) {
        return this.devicesService.remove(+id);
    }
}
