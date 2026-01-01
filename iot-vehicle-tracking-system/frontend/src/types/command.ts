/**
 * Command Types
 */
import type { BaseEntity, QueryParams } from './common';

export type CommandType = 
  | 'engine_on' 
  | 'engine_off' 
  | 'lock' 
  | 'unlock' 
  | 'locate' 
  | 'reboot'
  | 'update_config';

export type CommandStatus = 'pending' | 'sent' | 'delivered' | 'executed' | 'failed';

export interface Command extends BaseEntity {
  deviceId: number;
  vehicleId: number;
  type: CommandType;
  status: CommandStatus;
  payload?: Record<string, unknown>;
  sentAt?: string;
  deliveredAt?: string;
  executedAt?: string;
  errorMessage?: string;
}

export interface SendCommandDto {
  deviceId: number;
  type: CommandType;
  payload?: Record<string, unknown>;
}

export interface QueryCommandDto extends QueryParams {
  deviceId?: number;
  vehicleId?: number;
  type?: CommandType;
  status?: CommandStatus;
}

