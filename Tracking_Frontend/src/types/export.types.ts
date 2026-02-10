export interface ExportJob {
  id: number;
  exportType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filePath: string | null;
  createdAt: string;
  completedAt: string | null;
}
