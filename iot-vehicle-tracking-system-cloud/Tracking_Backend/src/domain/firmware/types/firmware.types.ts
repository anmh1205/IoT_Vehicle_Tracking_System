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
  status_reason_code: string | null;
  first_assigned_at: Date | null;
  command_dispatched_at: Date | null;
  last_seen_at: Date | null;
  last_message_id: string | null;
  last_seq_no: number | null;
  last_boot_id: string | null;
  confirm_timeout_sec: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface FirmwareDeploymentView {
  id: number;
  jobId: string | null;
  deviceId: string;
  status: string;
  summaryStatus: string;
  progress: number | null;
  targetVersion: string | null;
  currentVersion: string | null;
  partition: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  firstAssignedAt: string | null;
  commandDispatchedAt: string | null;
  lastSeenAt: string | null;
  lastSeqNo: number | null;
  lastMessageId: string | null;
  lastBootId: string | null;
  isStuck: boolean;
  stuckReason: string | null;
  errorMessage: string | null;
  errorCode: string | null;
}
