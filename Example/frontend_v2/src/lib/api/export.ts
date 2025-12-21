/**
 * Export API Client
 */
import { http } from './http';
import { notificationUtils } from '../notification';

/**
 * Download base64 encoded file
 */
const downloadBase64File = (base64Data: string, fileName: string): void => {
    try {
        // Validate base64 string format (remove data URL prefix if present)
        let cleanBase64 = base64Data;
        if (base64Data.includes(',')) {
            cleanBase64 = base64Data.split(',')[1]; // Remove data:...;base64, prefix
        }

        // Convert base64 to blob
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        throw error;
    }
};

export const exportServices = {
    /**
     * Create export (sync or async)
     */
    createExport: async (context: Export.ExportConfigInput): Promise<Export.ExportResponse> => {
        try {
            const response = await http.post<Export.ExportResponse>('/exports', context);

            // Handle sync export (buffer)
            if (response.kind === 'buffer' && response.data) {
                // Download file immediately
                const base64Data = response.data;
                let fileName = response.fileName || 'export.xlsx';

                // Ensure filename has .xlsx extension
                if (!fileName.toLowerCase().endsWith('.xlsx')) {
                    fileName = `${fileName}.xlsx`;
                }

                if (typeof base64Data !== 'string' || base64Data.length === 0) {
                    throw new Error('Invalid export data received');
                }

                try {
                    atob(base64Data.substring(0, 100));
                } catch (e) {
                    throw new Error('Invalid base64 data format');
                }

                downloadBase64File(base64Data, fileName);
                notificationUtils.success('Xuất file thành công');
            }

            return response;
        } catch (error) {
            notificationUtils.error('Xuất file thất bại');
            throw error;
        }
    },

    /**
     * Get export job status
     */
    getExportStatus: async (jobId: string): Promise<Export.ExportJobStatus> => {
        try {
            const response = await http.get<Export.ExportJobStatus>(`/exports/${jobId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Download export file by token
     */
    downloadExport: async (token: string): Promise<void> => {
        try {
            const { blob, headers } = await http.getBlob(`/exports/download/${token}`);

            // Extract filename from Content-Disposition header
            const contentDisposition = headers.get('Content-Disposition');
            let fileName = 'export.xlsx';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            notificationUtils.success('Tải file thành công');
        } catch (error) {
            notificationUtils.error('Tải file thất bại');
            throw error;
        }
    }
};
