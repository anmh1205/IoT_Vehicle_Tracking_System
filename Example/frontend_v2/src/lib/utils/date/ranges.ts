/**
 * Date range calculation utilities
 * Moved from backend to enable client-side date range calculations
 */

/**
 * Get current quarter bounds (start and end dates)
 * @param reference - Reference date (defaults to now)
 * @returns Object with start and end dates of current quarter
 */
export const getCurrentQuarterBounds = (reference: Date = new Date()): { start: Date; end: Date } => {
    const month = reference.getMonth();
    const year = reference.getFullYear();

    const quarterStartMonth = Math.floor(month / 3) * 3;
    const quarterEndMonth = quarterStartMonth + 2;

    const start = new Date(year, quarterStartMonth, 1, 0, 0, 0, 0);
    const end = new Date(year, quarterEndMonth + 1, 0, 23, 59, 59, 999);

    return { start, end };
};

/**
 * Period key type
 */
export type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Get date range for a specific period
 * @param period - Period key (today, week, month, quarter, year)
 * @param reference - Reference date (defaults to now)
 * @returns Object with start and end dates of the period
 */
export const getPeriodRange = (period: PeriodKey, reference: Date = new Date()): { start: Date; end: Date } => {
    const end = new Date(reference);

    switch (period) {
        case 'today': {
            const start = new Date(reference);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        case 'week': {
            const start = new Date(reference);
            const day = start.getDay() || 7; // Sunday as 7
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - (day - 1));
            end.setHours(23, 59, 59, 999);
            end.setDate(start.getDate() + 6);
            return { start, end };
        }
        case 'month': {
            const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(reference.getFullYear(), reference.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        case 'quarter': {
            const { start, end: quarterEnd } = getCurrentQuarterBounds(reference);
            return { start, end: quarterEnd };
        }
        case 'year': {
            const start = new Date(reference.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(reference.getFullYear(), 11, 31);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        default:
            throw new Error(`Unsupported period: ${period}`);
    }
};

