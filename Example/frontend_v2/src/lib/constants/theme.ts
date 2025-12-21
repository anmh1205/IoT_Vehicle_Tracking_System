// Theme and styling constants
export const THEME = {
  COLORS: {
    PRIMARY: '#1890ff',
    SUCCESS: '#52c41a',
    WARNING: '#faad14',
    ERROR: '#ff4d4f',
    INFO: '#13c2c2',
    
    // Gradients
    GRADIENTS: {
      PRIMARY: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      SUCCESS: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      WARNING: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      ERROR: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      INFO: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      CARD: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      GLASS: 'rgba(255, 255, 255, 0.9)',
    },
    
    // Background patterns
    BACKGROUNDS: {
      PATTERN: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm-20-18c9.941 0 18 8.059 18 18s-8.059 18-18 18-18-8.059-18-18 8.059-18 18-18z'/%3E%3C/g%3E%3C/svg%3E")`,
      DOTS: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    }
  },
  
  // Spacing
  SPACING: {
    XS: '4px',
    SM: '8px',
    MD: '16px',
    LG: '24px',
    XL: '32px',
    XXL: '48px',
  },
  
  // Border radius
  BORDER_RADIUS: {
    SM: '4px',
    MD: '8px',
    LG: '12px',
    XL: '16px',
    XXL: '20px',
    ROUND: '50%',
  },
  
  // Shadows
  SHADOWS: {
    SM: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    MD: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    LG: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    XL: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    XXL: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  
  // Transitions
  TRANSITIONS: {
    FAST: '0.15s ease-in-out',
    NORMAL: '0.3s ease-in-out',
    SLOW: '0.5s ease-in-out',
  }
} as const

// Helper function to get gradient style
export const getGradientStyle = (gradient: keyof typeof THEME.COLORS.GRADIENTS) => {
  return {
    background: THEME.COLORS.GRADIENTS[gradient]
  }
}

// Helper function to get shadow style
export const getShadowStyle = (shadow: keyof typeof THEME.SHADOWS) => {
  return {
    boxShadow: THEME.SHADOWS[shadow]
  }
}
