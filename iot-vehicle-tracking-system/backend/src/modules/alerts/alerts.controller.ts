import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new alert' })
  @ApiResponse({
    status: 201,
    description: 'Alert created successfully',
  })
  create(@Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(createAlertDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all alerts with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of alerts',
  })
  findAll(@Query() queryDto: QueryAlertDto) {
    return this.alertsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiResponse({
    status: 200,
    description: 'Alert details',
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found',
  })
  findOne(@Param('id') id: string) {
    return this.alertsService.findOne(+id);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiResponse({
    status: 200,
    description: 'Alert acknowledged successfully',
  })
  acknowledge(@Param('id') id: string, @CurrentUser() user: any) {
    return this.alertsService.acknowledge(+id, user.id);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve alert' })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved successfully',
  })
  resolve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.alertsService.resolve(+id, user.id);
  }
}

