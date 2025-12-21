'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

interface UseRuntimeStatsRealtimeProps {
    baseToday: number; // Base today runtime in seconds from backend
    baseWeek: number; // Base week runtime in seconds from backend
    baseMonth: number; // Base month runtime in seconds from backend
    baseQuarter: number; // Base quarter runtime in seconds from backend
    baseYear: number; // Base year runtime in seconds from backend
    currentStatus: 'running' | 'disconnected' | 'stopped' | null;
    lastSeenAt: string | null; // ISO timestamp
}

interface UseRuntimeStatsRealtimeReturn {
    today: number; // Real-time today runtime in seconds
    week: number; // Real-time week runtime in seconds
    month: number; // Real-time month runtime in seconds
    quarter: number; // Real-time quarter runtime in seconds
    year: number; // Real-time year runtime in seconds
}

/**
 * Hook to calculate real-time runtime statistics (today, week, month, quarter, year)
 * Updates every second when device is running
 * 
 * Logic:
 * - If device is running, add elapsed time since start of period to base runtime
 * - Only add time if the period includes the current time
 */
export const useRuntimeStatsRealtime = ({
    baseToday,
    baseWeek,
    baseMonth,
    baseQuarter,
    baseYear,
    currentStatus,
    lastSeenAt,
}: UseRuntimeStatsRealtimeProps): UseRuntimeStatsRealtimeReturn => {
    const [today, setToday] = useState<number>(baseToday);
    const [week, setWeek] = useState<number>(baseWeek);
    const [month, setMonth] = useState<number>(baseMonth);
    const [quarter, setQuarter] = useState<number>(baseQuarter);
    const [year, setYear] = useState<number>(baseYear);

    const intervalRef = useRef<number | null>(null);
    const baseTodayRef = useRef<number>(baseToday);
    const baseWeekRef = useRef<number>(baseWeek);
    const baseMonthRef = useRef<number>(baseMonth);
    const baseQuarterRef = useRef<number>(baseQuarter);
    const baseYearRef = useRef<number>(baseYear);

    // Update base values when props change
    useEffect(() => {
        baseTodayRef.current = baseToday;
        baseWeekRef.current = baseWeek;
        baseMonthRef.current = baseMonth;
        baseQuarterRef.current = baseQuarter;
        baseYearRef.current = baseYear;
        setToday(baseToday);
        setWeek(baseWeek);
        setMonth(baseMonth);
        setQuarter(baseQuarter);
        setYear(baseYear);
    }, [baseToday, baseWeek, baseMonth, baseQuarter, baseYear]);

    useEffect(() => {
        // Clear any existing interval first
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const updateStats = () => {
            const now = dayjs();

            // If device is running and we have lastSeenAt
            if (currentStatus === 'running' && lastSeenAt) {
                const lastSeen = dayjs(lastSeenAt);
                if (lastSeen.isValid()) {
                    // Calculate elapsed time since lastSeenAt
                    const elapsed = now.diff(lastSeen, 'second');
                    if (elapsed >= 0) {
                        // Get period boundaries for current time
                        const startOfToday = now.startOf('day');
                        const startOfWeek = now.startOf('week');
                        const startOfMonth = now.startOf('month');
                        const startOfQuarter = now.startOf('quarter');
                        const startOfYear = now.startOf('year');

                        // Only add elapsed time if lastSeenAt is within each period
                        // This ensures we only count time that actually occurred within the period
                        const elapsedToday = lastSeen.isAfter(startOfToday) || lastSeen.isSame(startOfToday, 'day')
                            ? elapsed
                            : 0;
                        const elapsedWeek = lastSeen.isAfter(startOfWeek) || lastSeen.isSame(startOfWeek, 'day')
                            ? elapsed
                            : 0;
                        const elapsedMonth = lastSeen.isAfter(startOfMonth) || lastSeen.isSame(startOfMonth, 'day')
                            ? elapsed
                            : 0;
                        const elapsedQuarter = lastSeen.isAfter(startOfQuarter) || lastSeen.isSame(startOfQuarter, 'day')
                            ? elapsed
                            : 0;
                        const elapsedYear = lastSeen.isAfter(startOfYear) || lastSeen.isSame(startOfYear, 'day')
                            ? elapsed
                            : 0;

                        // Update stats: base + elapsed time (if within period)
                        setToday(baseTodayRef.current + elapsedToday);
                        setWeek(baseWeekRef.current + elapsedWeek);
                        setMonth(baseMonthRef.current + elapsedMonth);
                        setQuarter(baseQuarterRef.current + elapsedQuarter);
                        setYear(baseYearRef.current + elapsedYear);
                    } else {
                        // Invalid elapsed, use base values
                        setToday(baseTodayRef.current);
                        setWeek(baseWeekRef.current);
                        setMonth(baseMonthRef.current);
                        setQuarter(baseQuarterRef.current);
                        setYear(baseYearRef.current);
                    }
                } else {
                    // Invalid lastSeenAt, use base values
                    setToday(baseTodayRef.current);
                    setWeek(baseWeekRef.current);
                    setMonth(baseMonthRef.current);
                    setQuarter(baseQuarterRef.current);
                    setYear(baseYearRef.current);
                }
            } else {
                // Device not running, reset to base values
                setToday(baseTodayRef.current);
                setWeek(baseWeekRef.current);
                setMonth(baseMonthRef.current);
                setQuarter(baseQuarterRef.current);
                setYear(baseYearRef.current);
            }
        };

        // Initial update
        updateStats();

        // Update every second
        intervalRef.current = window.setInterval(updateStats, 1000);

        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [currentStatus, lastSeenAt]);

    return {
        today,
        week,
        month,
        quarter,
        year,
    };
};

