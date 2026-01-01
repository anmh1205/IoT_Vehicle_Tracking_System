import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, MqttClient } from 'mqtt';
import { createLogger } from '@/common/utils/logger.util';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(MqttService.name);
  private client: MqttClient | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private connect(): void {
    const brokerUrl = this.configService.get<string>('mqtt.brokerUrl');
    const username = this.configService.get<string>('mqtt.username');
    const password = this.configService.get<string>('mqtt.password');

    if (!brokerUrl) {
      this.logger.warn('MQTT broker URL not configured, skipping connection');
      return;
    }

    const options: any = {
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    };

    if (username) {
      options.username = username;
    }
    if (password) {
      options.password = password;
    }

    try {
      this.client = connect(brokerUrl, options);

      this.client.on('connect', () => {
        this.logger.log('Connected to MQTT broker');
        this.reconnectAttempts = 0;
      });

      this.client.on('error', (error) => {
        this.logger.error(`MQTT error: ${error.message}`, error.stack);
      });

      this.client.on('close', () => {
        this.logger.warn('MQTT connection closed');
        this.attemptReconnect();
      });

      this.client.on('offline', () => {
        this.logger.warn('MQTT client offline');
      });

      this.client.on('reconnect', () => {
        this.logger.log('Attempting to reconnect to MQTT broker');
      });
    } catch (error) {
      this.logger.error(
        `Failed to connect to MQTT broker: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.logger.log(
      `Attempting to reconnect to MQTT broker (attempt ${this.reconnectAttempts}) in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.client && !this.client.connected) {
        this.client.reconnect();
      } else if (!this.client) {
        this.connect();
      }
    }, delay);
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      this.client.end();
      this.client = null;
      this.logger.log('Disconnected from MQTT broker');
    }
  }

  /**
   * Publish message to MQTT topic
   */
  async publish(topic: string, message: string | object): Promise<void> {
    if (!this.isClientConnected()) {
      throw new Error('MQTT client is not connected');
    }

    const payload =
      typeof message === 'string' ? message : JSON.stringify(message);

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT client is not initialized'));
        return;
      }

      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish to ${topic}: ${error.message}`);
          reject(error);
        } else {
          this.logger.debug(`Published to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Subscribe to MQTT topic
   */
  async subscribe(
    topic: string,
    callback: (message: string, topic: string) => void
  ): Promise<void> {
    if (!this.isClientConnected()) {
      throw new Error('MQTT client is not connected');
    }

    if (!this.client) {
      throw new Error('MQTT client is not initialized');
    }

    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`Failed to subscribe to ${topic}: ${error.message}`);
        throw error;
      } else {
        this.logger.log(`Subscribed to ${topic}`);
      }
    });

    this.client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        callback(message.toString(), receivedTopic);
      }
    });
  }

  /**
   * Unsubscribe from MQTT topic
   */
  async unsubscribe(topic: string): Promise<void> {
    if (!this.client) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client!.unsubscribe(topic, (error) => {
        if (error) {
          this.logger.error(
            `Failed to unsubscribe from ${topic}: ${error.message}`
          );
          reject(error);
        } else {
          this.logger.log(`Unsubscribed from ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Check if MQTT client is connected
   */
  isClientConnected(): boolean {
    return this.client?.connected === true;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isClientConnected(),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

