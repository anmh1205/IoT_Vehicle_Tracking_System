import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Command } from './entities/command.entity';
import { SendCommandDto } from './dto/send-command.dto';
import { QueryCommandDto } from './dto/query-command.dto';
import { MqttService } from '@/infrastructure/mqtt/mqtt.service';
import { DevicesService } from '@/modules/devices/devices.service';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class CommandsService {
  private readonly logger = createLogger(CommandsService.name);

  constructor(
    @InjectRepository(Command)
    private commandRepository: Repository<Command>,
    private mqttService: MqttService,
    private devicesService: DevicesService
  ) {}

  async findAll(queryDto: QueryCommandDto) {
    const { page = 1, limit = 20, deviceId, status } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.commandRepository.createQueryBuilder('command');

    if (deviceId) {
      const device = await this.devicesService.findByDeviceId(deviceId);
      queryBuilder.andWhere('command.deviceId = :deviceId', {
        deviceId: device.id,
      });
    }

    if (status) {
      queryBuilder.andWhere('command.status = :status', { status });
    }

    const total = await queryBuilder.getCount();

    const commands = await queryBuilder
      .leftJoinAndSelect('command.device', 'device')
      .leftJoinAndSelect('command.creator', 'creator')
      .skip(skip)
      .take(limit)
      .orderBy('command.createdAt', 'DESC')
      .getMany();

    return {
      data: commands,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const command = await this.commandRepository.findOne({
      where: { id },
      relations: ['device', 'creator'],
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    return command;
  }

  async sendCommand(deviceId: string, sendCommandDto: SendCommandDto, createdBy?: number) {
    // Verify device exists and is online
    const device = await this.devicesService.findByDeviceId(deviceId);

    if (device.status !== 'active') {
      throw new BadRequestException(
        `Device ${deviceId} is not active or is offline`
      );
    }

    // Check MQTT connection
    if (!this.mqttService.isClientConnected()) {
      throw new BadRequestException('MQTT broker is not connected');
    }

    // Create command record
    const command = this.commandRepository.create({
      deviceId: device.id,
      commandType: sendCommandDto.command,
      commandData: sendCommandDto.params || {},
      status: 'pending',
      createdBy,
    });
    const savedCommand = await this.commandRepository.save(command);

    try {
      // Publish command to MQTT
      const topic = `vehicle/${deviceId}/commands`;
      const payload = {
        command_id: savedCommand.id,
        command: sendCommandDto.command,
        params: sendCommandDto.params || {},
        timestamp: new Date().toISOString(),
      };

      await this.mqttService.publish(topic, payload);

      // Update command status
      savedCommand.status = 'sent';
      savedCommand.sentAt = new Date();
      await this.commandRepository.save(savedCommand);

      this.logger.log(
        `Command ${sendCommandDto.command} sent to device ${deviceId}`
      );

      return {
        command_id: savedCommand.id,
        device_id: deviceId,
        command: sendCommandDto.command,
        status: 'sent',
        sent_at: savedCommand.sentAt.toISOString(),
      };
    } catch (error) {
      // Update command status to failed
      savedCommand.status = 'failed';
      await this.commandRepository.save(savedCommand);

      this.logger.error(
        `Failed to send command to device ${deviceId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      throw new BadRequestException(
        `Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

