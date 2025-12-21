/**
 * Chart data processing utilities
 * For processing raw data into chart-ready formats
 */

/**
 * Group sessions by date for chart display
 * This is a wrapper around device aggregation for chart-specific use
 */
export { groupSessionsByDate, type DailyRuntime } from '../device/aggregation';

/**
 * Process chart data points from daily runtime
 * @param dailyRuntime - Array of daily runtime data
 * @returns Array of chart data points with x (date) and y (seconds) values
 */
export function processChartDataPoints(dailyRuntime: Array<{ date: string; seconds: number }>): Array<{ x: string; y: number }> {
    return dailyRuntime.map(day => ({
        x: day.date,
        y: day.seconds
    }));
}

