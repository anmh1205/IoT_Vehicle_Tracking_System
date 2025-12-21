// Assets constants for the IVM26 Dashboard
export const ASSETS = {
  // Images
  IMAGES: {
    LOGO: '/assets/logos/ivm26-logo.png',
    LOGO_WHITE: '/assets/logos/ivm26-logo-white.png',
    LOGO_ICON: '/assets/logos/ivm26-icon.png',
    BACKGROUND_PATTERN: '/assets/images/background-pattern.svg',
    DASHBOARD_BG: '/assets/images/dashboard-bg.jpg',
    DEVICE_ICON: '/assets/icons/device-icon.png',
    FIRMWARE_ICON: '/assets/icons/firmware-icon.png',
    NOTIFICATION_ICON: '/assets/icons/notification-icon.png',
    USER_ICON: '/assets/icons/user-icon.png',
    STATS_ICON: '/assets/icons/stats-icon.png',
  },
  
  // Icons
  ICONS: {
    THUNDERBOLT: '/assets/icons/thunderbolt.svg',
    DASHBOARD: '/assets/icons/dashboard.svg',
    DEVICE: '/assets/icons/device.svg',
    FIRMWARE: '/assets/icons/firmware.svg',
    NOTIFICATION: '/assets/icons/notification.svg',
    USER: '/assets/icons/user.svg',
    STATS: '/assets/icons/stats.svg',
    LOGOUT: '/assets/icons/logout.svg',
    SETTINGS: '/assets/icons/settings.svg',
    HELP: '/assets/icons/help.svg',
  },
  
  // Background images
  BACKGROUNDS: {
    LOGIN_BG: '/assets/background/LoginBackground.png',
    DASHBOARD_BG: '/assets/images/dashboard-bg.jpg',
    WEBSITE_BG: '/assets/images/website-bg.jpg',
  },
  
  // Placeholder images
  PLACEHOLDERS: {
    DEVICE_PLACEHOLDER: '/assets/images/device-placeholder.png',
    USER_AVATAR: '/assets/images/user-avatar.png',
    NO_DATA: '/assets/images/no-data.png',
    ERROR: '/assets/images/error.png',
    LOADING: '/assets/images/loading.gif',
  }
} as const

// Helper function to get asset path
export const getAssetPath = (path: string): string => {
  return path.startsWith('/') ? path : `/assets/${path}`
}

// Helper function to get image with fallback
export const getImageWithFallback = (src: string, fallback: string = ASSETS.PLACEHOLDERS.NO_DATA): string => {
  return src || fallback
}
