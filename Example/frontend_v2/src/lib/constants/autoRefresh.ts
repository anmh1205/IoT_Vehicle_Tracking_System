export const AUTO_REFRESH_INTERVALS = {
    STATS: 1000,        // 1 giây cho dashboard stats
    DEVICES: 1000,      // 1 giây cho device list
    DEVICE_DETAILS: 5000, // 5 giây cho device details
    RUNTIME_DATA: 5000, // 5 giây cho runtime data
    ACTIVITY_LOG: 30000, // 30 giây cho activity log
    ALERTS: 10000,      // 10 giây cho alerts
} as const;

export const AUTO_REFRESH_CONFIG = {
    DASHBOARD: {
        interval: AUTO_REFRESH_INTERVALS.STATS,
        enabled: true,
        pauseOnModal: true,
    },
    DEVICE_LIST: {
        interval: AUTO_REFRESH_INTERVALS.DEVICES,
        enabled: true,
        pauseOnModal: true,
    },
    DEVICE_DETAILS: {
        interval: AUTO_REFRESH_INTERVALS.DEVICE_DETAILS,
        enabled: true,
        pauseOnModal: true,
    },
    RUNTIME_DATA: {
        interval: AUTO_REFRESH_INTERVALS.RUNTIME_DATA,
        enabled: true,
        pauseOnModal: false,
    },
} as const;
