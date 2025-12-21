import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/api/http'
import { STALE_TIMES } from '@/lib/constants/queryCache'

type VibrationPeriod = 'sample' | 'minute' | 'hour' | 'day'

interface VibrationChartData {
    period: VibrationPeriod
    labels: string[]
    values: number[]
}

interface VibrationChartApiResponse {
    period: string
    series: Array<{
        id: string
        label: string
        points: Array<{ x: string; y: number }>
    }>
}

export const useDeviceVibrationChart = (deviceId: string, period: VibrationPeriod, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['device', deviceId, 'vibration-chart', period],
        queryFn: async () => {
            const apiData = await http.get<VibrationChartApiResponse>(
                `/device/${deviceId}/vibration-chart?period=${period}`
            )

            const firstSeries = apiData.series?.[0]
            const points = firstSeries?.points ?? []

            const labels = points.map((p) => p.x)
            const values = points.map((p) => p.y ?? 0)

            const result: VibrationChartData = {
                period: (apiData.period as VibrationPeriod) ?? period,
                labels,
                values,
            }

            return result
        },
        enabled: !!deviceId && enabled,
        staleTime: STALE_TIMES.DEVICE_VIBRATION_CHART,
        retry: 3,
        refetchOnMount: true,
    })
}

