import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';

export class SendCommandDto {
  @ApiProperty({
    example: 'update_config',
    description:
      "Command type: 'update_config', 'request_location', 'enable_tracking', etc.",
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum([
    'update_config',
    'request_location',
    'enable_tracking',
    'disable_tracking',
    'reboot',
    'factory_reset',
  ])
  command: string;

  @ApiProperty({
    required: false,
    example: { heartbeat_interval: 900, tracking_interval: 10 },
    description: 'Command parameters',
  })
  @IsObject()
  @IsOptional()
  params?: any;
}

