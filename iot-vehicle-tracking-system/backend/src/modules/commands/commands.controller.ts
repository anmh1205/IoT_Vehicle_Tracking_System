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
import { CommandsService } from './commands.service';
import { SendCommandDto } from './dto/send-command.dto';
import { QueryCommandDto } from './dto/query-command.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('commands')
@Controller('commands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post(':deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send command to device via MQTT' })
  @ApiResponse({
    status: 200,
    description: 'Command sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found or offline',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid command or MQTT not connected',
  })
  sendCommand(
    @Param('deviceId') deviceId: string,
    @Body() sendCommandDto: SendCommandDto,
    @CurrentUser() user: any
  ) {
    return this.commandsService.sendCommand(deviceId, sendCommandDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all commands with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of commands',
  })
  findAll(@Query() queryDto: QueryCommandDto) {
    return this.commandsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get command by ID' })
  @ApiResponse({
    status: 200,
    description: 'Command details',
  })
  @ApiResponse({
    status: 404,
    description: 'Command not found',
  })
  findOne(@Param('id') id: string) {
    return this.commandsService.findOne(+id);
  }
}

