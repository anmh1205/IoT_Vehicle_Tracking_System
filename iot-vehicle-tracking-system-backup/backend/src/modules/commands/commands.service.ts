import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommandsService {
    private readonly logger = new Logger(CommandsService.name);

    constructor(private readonly configService: ConfigService) { }

    async sendCommand(deviceId: string, command: string, params?: Record<string, any>) {
        // TODO: Implement MQTT publish to device
        this.logger.log(`Sending command ${command} to device ${deviceId}`);
        return {
            success: true,
            deviceId,
            command,
            params,
            sentAt: new Date().toISOString(),
        };
    }
}
