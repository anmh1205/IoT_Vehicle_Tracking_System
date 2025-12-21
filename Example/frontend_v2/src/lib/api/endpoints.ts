// Endpoints are relative to API_BASE_URL (e.g. https://be.meht.vn/api/v1)
// Do NOT include '/api' prefix here as it's already in API_BASE_URL
export const API = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        USERS: '/auth/users'
    },
    DASHBOARD: {
        STATS: '/dashboard/stats',
        ACTIVITY: '/dashboard/activity-log',
        ALERTS: '/dashboard/recent-alerts'
    },
    DEVICE: {
        LIST: '/device/list',
        DETAILS: (deviceId: string) => `/device/details?deviceId=${encodeURIComponent(deviceId)}`,
        VIBRATION_THRESHOLD: (deviceId: string) => `/device/vibration-threshold?deviceId=${encodeURIComponent(deviceId)}`,
        MANAGE: '/device/manage',
        SESSIONS: (deviceId: string) => `/device/sessions?deviceId=${encodeURIComponent(deviceId)}`,
        ANALYTICS: (deviceId: string) => `/device/analytics?deviceId=${encodeURIComponent(deviceId)}`,
        RAWDATA: '/device/rawdata'
    },
    FIRMWARE: {
        LIST: '/firmware/list',
        UPLOAD: '/firmware/upload',
        DELETE: '/firmware/delete',
        ACTIVATE: '/firmware/activate',
        ASSIGN: '/firmware/assign',
        ASSIGNMENTS: '/firmware/assignments',
        CANCEL: '/firmware/cancel',
        LOGS: '/firmware/logs',
        DELETE_LOG: '/firmware/logs',
        DEVICES: '/firmware/devices'
    }
} as const


