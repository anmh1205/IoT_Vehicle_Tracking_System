import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommandsService } from './commands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('commands')
@Controller('commands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommandsController {
    constructor(private readonly commandsService: CommandsService) { }

    @Post(':deviceId')
    @ApiOperation({ summary: 'Send command to device' })
    async sendCommand(
        @Param('deviceId') deviceId: string,
        @Body() body: { command: string; params?: Record<string, any> },
    ) {
        return this.commandsService.sendCommand(deviceId, body.command, body.params);
    }
}
