export interface ExportJob {
  id: number;
  user_id: number;
  export_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: Record<string, unknown> | null;
  file_path: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface ExportJobPublic {
  id: number;
  exportType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: Record<string, unknown> | null;
  filePath: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateExportInput {
  exportType: string;
  filters?: Record<string, unknown>;
}
