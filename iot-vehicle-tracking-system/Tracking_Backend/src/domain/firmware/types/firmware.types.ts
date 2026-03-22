export interface Firmware {
  id: number;
  version: string;
  filename: string;
  file_path: string;
  size: number;
  sha256: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FirmwarePublic {
  id: number;
  version: string;
  filename: string;
  filePath: string;
  size: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateFirmwareInput {
  version: string;
  filename: string;
  filePath?: string;
  size: number;
  sha256: string;
  description?: string;
}

export interface FirmwareListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface FirmwareDeploymentRow {
  id: number;
  job_id: string | null;
  firmware_id: number;
  device_id: string;
  status: string;
  progress: number | null;
  target_version: string | null;
  current_version: string | null;
  partition: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}
