import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create and send a notification' })
  @ApiResponse({ status: 201, description: 'Notification created and queued for sending' })
  async create(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async findAll(@Query() queryDto: QueryNotificationDto) {
    return this.notificationsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: 'Mark notification as delivered' })
  @ApiResponse({ status: 200, description: 'Notification marked as delivered' })
  async markAsDelivered(@Param('id') id: string) {
    return this.notificationsService.markAsDelivered(+id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry sending a failed notification' })
  @ApiResponse({ status: 200, description: 'Notification queued for retry' })
  async retry(@Param('id') id: string) {
    return this.notificationsService.retryFailedNotification(+id);
  }
}

