namespace Firmware {
    export interface FirmwareDto {
        id: number;
        version: string;
        filename: string;
        size: number;
        sha256: string;
        description: string | null;
        is_active: boolean;
        created_at: string;
    }

    export interface FirmwareAssignmentDto {
        id: number;
        device_id: string;
        firmware_id: number;
        old_version: string | null;
        new_version: string;
        status: 'pending' | 'downloading' | 'success' | 'failed';
        error_message: string | null;
        started_at: string;
        completed_at: string | null;
    }

    export interface FirmwareFilter {
        device_id?: string;
        status?: string;
        page?: number;
        pageSize?: number;
    }

    export interface FirmwareLogsFilter {
        device_id?: string;
        status?: string;
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
    }
}

