// Company information constants
export const COMPANY = {
  NAME: 'CÔNG TY CỔ PHẦN GIẢI PHÁP CÔNG NGHỆ CAO ME',
  SHORT_NAME: 'ME Technology',
  PRODUCT_NAME: 'IVM26 Dashboard',
  VERSION: 'v1.0.0',
  DESCRIPTION: 'Hệ thống giám sát máy phát điện thông minh',
  
  CONTACT: {
    HOTLINE: '1900-xxxx',
    EMAIL: 'info@meht.vn',
    WEBSITE: 'https://meht.vn',
    ADDRESS: 'Việt Nam'
  },
  
  COPYRIGHT: {
    YEAR: '2026',
    TEXT: '© 2026 CÔNG TY CỔ PHẦN GIẢI PHÁP CÔNG NGHỆ CAO ME'
  }
} as const

// Helper function to get full copyright text
export const getCopyrightText = (): string => {
  return `${COMPANY.COPYRIGHT.TEXT}`
}

// Helper function to get contact info
export const getContactInfo = (): string => {
  return `Hotline: ${COMPANY.CONTACT.HOTLINE} • ${COMPANY.CONTACT.EMAIL}`
}
