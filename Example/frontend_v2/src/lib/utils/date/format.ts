/**
 * Utility functions for consistent date/time formatting across the application
 */

/**
 * Format time to HH:MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string (HH:MM:SS)
 */
export const formatTime = (seconds?: number | null): string => {
    if (!seconds) return '00:00:00'

    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')

    return `${h}:${m}:${s}`
}

/**
 * Format timestamp to HH:MM:SS DD:MM:YYYY format
 * @param dateString - Date string or timestamp
 * @returns Formatted timestamp string (HH:MM:SS DD:MM:YYYY)
 */
export const formatTimestamp = (dateString?: string | null): string => {
    if (!dateString) return '—'

    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return '—'

        const time = date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })

        const dateStr = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })

        return `${time} ${dateStr}`
    } catch (error) {
        console.error('Error formatting timestamp:', error)
        return '—'
    }
}

/**
 * Format date to DD:MM:YYYY format
 * @param dateString - Date string or timestamp
 * @returns Formatted date string (DD:MM:YYYY)
 */
export const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '—'

    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return '—'

        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    } catch (error) {
        console.error('Error formatting date:', error)
        return '—'
    }
}

/**
 * Format time to HH:MM:SS format (for display)
 * @param dateString - Date string or timestamp
 * @returns Formatted time string (HH:MM:SS)
 */
export const formatTimeFromDate = (dateString?: string | null): string => {
    if (!dateString) return '—'

    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return '—'

        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })
    } catch (error) {
        console.error('Error formatting time:', error)
        return '—'
    }
}

/**
 * Get current date in YYYY-MM-DD format for form inputs
 * @returns Current date string (YYYY-MM-DD)
 */
export const getCurrentDate = (): string => {
    return new Date().toISOString().split('T')[0]
}

/**
 * Get date N days ago in YYYY-MM-DD format
 * @param days - Number of days ago
 * @returns Date string (YYYY-MM-DD)
 */
export const getDateDaysAgo = (days: number): string => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
}

/**
 * Format a timestamp relative to now (e.g., "5 phút trước", "2 giờ trước")
 */
export const formatRelative = (dateString?: string | null): string => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '—'

    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

    const minutes = Math.round(diff / (1000 * 60))
    const hours = Math.round(diff / (1000 * 60 * 60))
    const days = Math.round(diff / (1000 * 60 * 60 * 24))

    if (Math.abs(minutes) < 60) {
        return rtf.format(minutes, 'minute')
    }
    if (Math.abs(hours) < 24) {
        return rtf.format(hours, 'hour')
    }
    return rtf.format(days, 'day')
}

