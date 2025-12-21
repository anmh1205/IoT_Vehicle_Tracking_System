namespace Export {
    export interface ExportConfigInput {
        page: string;
        tab?: string;
        tabs?: string[];
        deviceId?: string;
        filters?: Record<string, unknown>;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        selectedColumns?: string[];
        locale?: string;
        templateId?: string;
        fileName?: string;
        splitBy?: string;
        asyncPreferred?: boolean;
    }

    export interface ExportResponse {
        kind: 'buffer' | 'job';
        fileName?: string;
        contentType?: string;
        data?: string;
        jobId?: string;
    }

    export interface ExportJobStatus {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress?: number;
        downloadToken?: string;
        error?: string;
    }
}

