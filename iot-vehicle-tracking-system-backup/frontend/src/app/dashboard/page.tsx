'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconCar, IconAlertTriangle, IconRoute, IconUsers, IconTrendingUp, IconMapPin } from '@tabler/icons-react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface DashboardStats {
    vehicles: { total: number; active: number; inactive: number; maintenance: number };
    alerts: { total: number; unacknowledged: number; critical: number };
    trips: { total: number; todayTrips: number; inProgress: number };
}

export default function DashboardPage() {
    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: () => api.get('/dashboard/stats'),
    });

    const statCards = [
        {
            title: 'Tổng phương tiện',
            value: stats?.vehicles?.total ?? 0,
            subtitle: `${stats?.vehicles?.active ?? 0} đang hoạt động`,
            icon: IconCar,
            trend: '+12%',
            trendUp: true,
        },
        {
            title: 'Cảnh báo chưa xử lý',
            value: stats?.alerts?.unacknowledged ?? 0,
            subtitle: `${stats?.alerts?.critical ?? 0} nghiêm trọng`,
            icon: IconAlertTriangle,
            trend: '-5%',
            trendUp: false,
        },
        {
            title: 'Chuyến đi hôm nay',
            value: stats?.trips?.todayTrips ?? 0,
            subtitle: `${stats?.trips?.inProgress ?? 0} đang di chuyển`,
            icon: IconRoute,
            trend: '+8%',
            trendUp: true,
        },
        {
            title: 'Vị trí theo dõi',
            value: stats?.vehicles?.active ?? 0,
            subtitle: 'Đang cập nhật realtime',
            icon: IconMapPin,
            trend: 'Live',
            trendUp: true,
        },
    ];

    const vehicleChartOption = {
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left', textStyle: { color: 'inherit' } },
        series: [
            {
                name: 'Phương tiện',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
                label: { show: false },
                emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
                labelLine: { show: false },
                data: [
                    { value: stats?.vehicles?.active ?? 0, name: 'Hoạt động', itemStyle: { color: '#22c55e' } },
                    { value: stats?.vehicles?.inactive ?? 0, name: 'Không hoạt động', itemStyle: { color: '#6b7280' } },
                    { value: stats?.vehicles?.maintenance ?? 0, name: 'Bảo trì', itemStyle: { color: '#f59e0b' } },
                ],
            },
        ],
    };

    const activityChartOption = {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'], axisLine: { lineStyle: { color: '#888' } } },
        yAxis: { type: 'value', axisLine: { lineStyle: { color: '#888' } } },
        series: [
            {
                name: 'Chuyến đi',
                data: [120, 132, 101, 134, 90, 230, 210],
                type: 'bar',
                itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
            },
            {
                name: 'Cảnh báo',
                data: [12, 8, 15, 10, 5, 3, 7],
                type: 'line',
                smooth: true,
                itemStyle: { color: '#ef4444' },
            },
        ],
        legend: { data: ['Chuyến đi', 'Cảnh báo'], textStyle: { color: 'inherit' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <Heading title='Tổng quan' description='Dashboard quản lý hệ thống theo dõi phương tiện IoT' />

                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                    {statCards.map((stat) => (
                        <Card key={stat.title}>
                            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                                <CardTitle className='text-sm font-medium'>{stat.title}</CardTitle>
                                <stat.icon className='h-5 w-5 text-muted-foreground' />
                            </CardHeader>
                            <CardContent>
                                <div className='text-2xl font-bold'>{isLoading ? '...' : stat.value.toLocaleString()}</div>
                                <div className='flex items-center text-xs text-muted-foreground'>
                                    <span className={stat.trendUp ? 'text-green-500' : 'text-red-500'}>{stat.trend}</span>
                                    <span className='ml-1'>{stat.subtitle}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Trạng thái phương tiện</CardTitle>
                            <CardDescription>Phân bố trạng thái các phương tiện</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ReactECharts option={vehicleChartOption} style={{ height: '300px' }} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Hoạt động tuần qua</CardTitle>
                            <CardDescription>Số chuyến đi và cảnh báo theo ngày</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ReactECharts option={activityChartOption} style={{ height: '300px' }} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}
