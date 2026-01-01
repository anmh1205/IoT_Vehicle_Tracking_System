import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { createLogger } from '@/common/utils/logger.util';
import { User } from '@/modules/auth/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = createLogger(NotificationsService.name);
  private readonly telegramBotToken: string | null;
  private readonly telegramChatId: string | null;
  private readonly emailFrom: string | null;
  private readonly emailHost: string | null;
  private readonly emailPort: number | null;
  private readonly emailUser: string | null;
  private readonly emailPassword: string | null;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    // Telegram configuration
    this.telegramBotToken = this.configService.get<string>('notifications.telegramBotToken') || null;
    this.telegramChatId = this.configService.get<string>('notifications.telegramChatId') || null;

    // Email configuration
    this.emailFrom = this.configService.get<string>('notifications.emailFrom') || null;
    this.emailHost = this.configService.get<string>('notifications.emailHost') || null;
    this.emailPort = this.configService.get<number>('notifications.emailPort') || null;
    this.emailUser = this.configService.get<string>('notifications.emailUser') || null;
    this.emailPassword = this.configService.get<string>('notifications.emailPassword') || null;
  }

  async findAll(queryDto: QueryNotificationDto) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      userId,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('notification.userId = :userId', { userId });
    }

    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createDto,
      status: NotificationStatus.PENDING,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Send notification asynchronously
    this.sendNotification(savedNotification).catch((error) => {
      this.logger.error(`Failed to send notification ${savedNotification.id}:`, error);
    });

    return savedNotification;
  }

  async sendNotification(notification: Notification): Promise<void> {
    try {
      let recipient = notification.recipient;

      // If userId is provided, get user's notification preferences
      if (notification.userId && !recipient) {
        const user = await this.userRepository.findOne({
          where: { id: notification.userId },
        });

        if (user) {
          // Get recipient from user preferences based on notification type
          if (notification.type === NotificationType.EMAIL) {
            recipient = user.email;
          } else if (notification.type === NotificationType.TELEGRAM) {
            // Get Telegram chat ID from user metadata or preferences
            recipient = (user as any).telegramChatId || this.telegramChatId;
          }
        }
      }

      if (!recipient) {
        throw new Error(`No recipient found for notification ${notification.id}`);
      }

      // Send based on type
      switch (notification.type) {
        case NotificationType.EMAIL:
          await this.sendEmail(recipient, notification.subject, notification.message);
          break;
        case NotificationType.TELEGRAM:
          await this.sendTelegram(recipient, notification.message);
          break;
        default:
          this.logger.warn(`Unsupported notification type: ${notification.type}`);
          return;
      }

      // Update notification status
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      notification.recipient = recipient;
      await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(`Error sending notification ${notification.id}:`, error);
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationRepository.save(notification);
      throw error;
    }
  }

  private async sendEmail(to: string, subject: string, message: string): Promise<void> {
    if (!this.emailHost || !this.emailUser || !this.emailPassword) {
      this.logger.warn('Email configuration is missing. Skipping email send.');
      return;
    }

    // In production, use a proper email service like nodemailer, SendGrid, etc.
    // For now, we'll just log it
    this.logger.log(`[EMAIL] To: ${to}, Subject: ${subject}, Message: ${message.substring(0, 100)}...`);

    // TODO: Implement actual email sending with nodemailer or SendGrid
    // Example with nodemailer:
    // const transporter = nodemailer.createTransport({
    //   host: this.emailHost,
    //   port: this.emailPort,
    //   secure: this.emailPort === 465,
    //   auth: {
    //     user: this.emailUser,
    //     pass: this.emailPassword,
    //   },
    // });
    // await transporter.sendMail({
    //   from: this.emailFrom,
    //   to,
    //   subject,
    //   text: message,
    //   html: message,
    // });
  }

  private async sendTelegram(chatId: string, message: string): Promise<void> {
    if (!this.telegramBotToken) {
      this.logger.warn('Telegram bot token is missing. Skipping Telegram send.');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
      }

      this.logger.log(`[TELEGRAM] Sent message to chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Error sending Telegram message:`, error);
      throw error;
    }
  }

  async markAsDelivered(id: number): Promise<Notification> {
    const notification = await this.findOne(id);
    notification.status = NotificationStatus.DELIVERED;
    return this.notificationRepository.save(notification);
  }

  async retryFailedNotification(id: number): Promise<Notification> {
    const notification = await this.findOne(id);
    
    if (notification.status !== NotificationStatus.FAILED) {
      throw new Error(`Notification ${id} is not in failed status`);
    }

    notification.status = NotificationStatus.PENDING;
    notification.errorMessage = null;
    const updated = await this.notificationRepository.save(notification);

    // Retry sending
    this.sendNotification(updated).catch((error) => {
      this.logger.error(`Failed to retry notification ${id}:`, error);
    });

    return updated;
  }
}

