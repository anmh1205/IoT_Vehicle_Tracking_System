/**
 * Device data aggregation utilities
 * For aggregating sessions data by date, period, etc.
 */

/**
 * Session data structure for aggregation
 */
export interface Session {
    device_id?: string;
    session_start: string | Date;
    session_end?: string | Date | null;
    uptime?: number;
    total_runtime_seconds?: number;
}

/**
 * Daily runtime data structure
 */
export interface DailyRuntime {
    date: string; // ISO date string (YYYY-MM-DD)
    seconds: number;
}

/**
 * Group sessions by date and calculate total runtime per day
 * @param sessions - Array of session objects
 * @param startDate - Start date for the range
 * @param endDate - End date for the range
 * @returns Array of daily runtime data
 */
export function groupSessionsByDate(
    sessions: Session[],
    startDate: Date,
    endDate: Date
): DailyRuntime[] {
    // Create a map to aggregate by date
    const dailyMap = new Map<string, number>();

    // Initialize all dates in range with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dailyMap.set(dateKey, 0);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate sessions
    for (const session of sessions) {
        const sessionStart = new Date(session.session_start);
        if (Number.isNaN(sessionStart.getTime())) continue;

        const dateKey = sessionStart.toISOString().split('T')[0];
        
        // Calculate runtime for this session
        let runtime = 0;
        if (session.total_runtime_seconds !== undefined) {
            runtime = session.total_runtime_seconds;
        } else if (session.uptime !== undefined) {
            runtime = session.uptime;
        } else if (session.session_end) {
            const sessionEnd = new Date(session.session_end);
            if (!Number.isNaN(sessionEnd.getTime())) {
                runtime = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
            }
        } else {
            // Running session - calculate from start to now
            runtime = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
        }

        const current = dailyMap.get(dateKey) || 0;
        dailyMap.set(dateKey, current + runtime);
    }

    // Convert map to array and sort by date
    return Array.from(dailyMap.entries())
        .map(([date, seconds]) => ({ date, seconds }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregate sessions by period (today, week, month, quarter, year)
 * @param sessions - Array of session objects
 * @param period - Period object with start and end dates
 * @returns Total runtime in seconds for the period
 */
export function aggregateByPeriod(
    sessions: Session[],
    period: { start: Date; end: Date }
): number {
    let total = 0;

    for (const session of sessions) {
        const sessionStart = new Date(session.session_start);
        if (Number.isNaN(sessionStart.getTime())) continue;

        // Check if session is within period
        if (sessionStart < period.start || sessionStart > period.end) {
            continue;
        }

        // Calculate runtime for this session
        let runtime = 0;
        if (session.total_runtime_seconds !== undefined) {
            runtime = session.total_runtime_seconds;
        } else if (session.uptime !== undefined) {
            runtime = session.uptime;
        } else if (session.session_end) {
            const sessionEnd = new Date(session.session_end);
            if (!Number.isNaN(sessionEnd.getTime())) {
                runtime = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
            }
        } else {
            // Running session - calculate from start to now (or period end if earlier)
            const endTime = period.end.getTime() < Date.now() ? period.end.getTime() : Date.now();
            runtime = Math.floor((endTime - sessionStart.getTime()) / 1000);
        }

        total += Math.max(0, runtime);
    }

    return total;
}

