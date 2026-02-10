export interface Firmware {
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
