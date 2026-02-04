import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get('config')
    @ApiOperation({ summary: 'Get notification config' })
    async getConfig(@CurrentUser() user: any) {
        return this.notificationsService.getConfig(user.id);
    }

    @Put('config')
    @ApiOperation({ summary: 'Update notification config' })
    async updateConfig(@CurrentUser() user: any, @Body() config: any) {
        return this.notificationsService.updateConfig(user.id, config);
    }

    @Post('test')
    @ApiOperation({ summary: 'Test notification' })
    async testNotification(@Body() body: { type: 'telegram' | 'email' }) {
        return this.notificationsService.testNotification(body.type);
    }
}
