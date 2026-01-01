import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { Command } from './entities/command.entity';
import { MqttModule } from '@/infrastructure/mqtt/mqtt.module';
import { DevicesModule } from '@/modules/devices/devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Command]),
    MqttModule,
    DevicesModule,
  ],
  controllers: [CommandsController],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}

