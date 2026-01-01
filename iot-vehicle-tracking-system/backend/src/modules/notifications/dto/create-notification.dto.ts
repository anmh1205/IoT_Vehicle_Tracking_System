import { IsEnum, IsString, IsOptional, IsObject, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification subject' })
  @IsString()
  @MaxLength(255)
  subject: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Recipient (email, Telegram chat ID, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  recipient?: string;

  @ApiPropertyOptional({ description: 'User ID to send notification to' })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

