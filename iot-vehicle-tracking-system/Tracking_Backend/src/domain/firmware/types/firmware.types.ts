export interface Firmware {
  id: number;
  version: string;
  filename: string;
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
  size: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateFirmwareInput {
  version: string;
  filename: string;
  size: number;
  sha256: string;
  description?: string;
}

export interface FirmwareListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
}
