import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/api/http'
import { groupSessionsByDate } from '@/lib/utils/chart/data'
import { STALE_TIMES } from '@/lib/constants/queryCache'

interface RuntimeChartData {
    days: number
    labels: string[]
    seconds: number[]
}

interface Session {
    id: number
    session_start: string
    session_end: string | null
    uptime: number | null
    status: string
}

interface RuntimeChartApiResponse {
    sessions: Session[]
    startDate: string
    endDate: string
}

export const useDeviceRuntimeChart = (deviceId: string, range: 7 | 30 | 90, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['device', deviceId, 'runtime-chart', range],
        queryFn: async () => {
            const apiData = await http.get<RuntimeChartApiResponse>(
                `/device/${deviceId}/runtime-chart?range=${range}`
            )

            // Process raw sessions data on client-side
            const startDate = new Date(apiData.startDate)
            const endDate = new Date(apiData.endDate)

            // Group sessions by date
            const dailyRuntime = groupSessionsByDate(
                apiData.sessions.map(s => ({
                    session_start: s.session_start,
                    session_end: s.session_end,
                    uptime: s.uptime ?? undefined,
                    total_runtime_seconds: s.uptime ?? undefined
                })),
                startDate,
                endDate
            )

            // Format labels and extract seconds
            const labels = dailyRuntime.map((day) => {
                const date = new Date(day.date)
                const dayNum = String(date.getDate()).padStart(2, '0')
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const year = date.getFullYear()
                return `${dayNum}/${month}/${year}`
            })
            const seconds = dailyRuntime.map((day) => day.seconds)

            const result: RuntimeChartData = {
                days: range,
                labels,
                seconds,
            }

            return result
        },
        enabled: !!deviceId && enabled,
        staleTime: STALE_TIMES.DEVICE_RUNTIME_CHART,
        retry: 3,
        refetchOnMount: true,
    })
}

