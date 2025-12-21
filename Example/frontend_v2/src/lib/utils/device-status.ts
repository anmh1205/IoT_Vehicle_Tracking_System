import dayjs from 'dayjs';

export type DeviceStatus = 'running' | 'disconnected' | 'stopped' | null;

const DISCONNECT_THRESHOLD_MS = 15_000;

const pickLastSeen = (...timestamps: Array<string | null | undefined>): string | null => {
    for (const ts of timestamps) {
        if (ts) {
            return ts;
        }
    }
    return null;
};

export const resolveDeviceStatus = (
    status: DeviceStatus,
    ...timestamps: Array<string | null | undefined>
): DeviceStatus => {
    const lastSeen = pickLastSeen(...timestamps);
    if (!lastSeen) {
        return status ?? null;
    }

    const parsed = dayjs(lastSeen);
    if (!parsed.isValid()) {
        return status ?? null;
    }

    const diff = dayjs().diff(parsed, 'millisecond');
    if (diff <= DISCONNECT_THRESHOLD_MS) {
        return status ?? null;
    }

    if (!status || status === 'running') {
        return 'disconnected';
    }

    return status;
};

export const normalizeDeviceStatus = <
    T extends { current_status?: DeviceStatus; last_seen_at?: string | null }
>(
    device: T
): T & { current_status: DeviceStatus } => {
    return {
        ...device,
        current_status: resolveDeviceStatus(device.current_status ?? null, device.last_seen_at)
    };
};

