'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api/http';
import { IconAlertTriangle, IconBell, IconCheck, IconClock } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Alert {
    id: number;
    alertType: string;
    severity: string;
    title: string;
    message: string;
    acknowledged: boolean;
    createdAt: string;
    vehicle?: { plateNumber: string };
}

interface AlertsResponse {
    data: Alert[];
    meta: { total: number };
}

export default function AlertsPage() {
    const { data, isLoading, refetch } = useQuery<AlertsResponse>({
        queryKey: ['alerts'],
        queryFn: () => api.get('/alerts?limit=50'),
    });

    const handleAcknowledge = async (id: number) => {
        await api.put(`/alerts/${id}/acknowledge`, {});
        refetch();
    };

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'critical':
                return { bg: 'bg-red-500/10 border-red-500/20', icon: 'text-red-500', badge: 'bg-red-500' };
            case 'high':
                return { bg: 'bg-orange-500/10 border-orange-500/20', icon: 'text-orange-500', badge: 'bg-orange-500' };
            case 'medium':
                return { bg: 'bg-yellow-500/10 border-yellow-500/20', icon: 'text-yellow-500', badge: 'bg-yellow-500' };
            default:
                return { bg: 'bg-blue-500/10 border-blue-500/20', icon: 'text-blue-500', badge: 'bg-blue-500' };
        }
    };

    const unacknowledgedCount = data?.data?.filter((a) => !a.acknowledged).length ?? 0;

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading
                        title='Cảnh báo'
                        description={`${unacknowledgedCount} cảnh báo chưa xử lý`}
                    />
                    <div className='flex gap-2'>
                        <Badge variant='outline'>
                            <IconClock className='mr-1 h-3 w-3' />
                            Thời gian thực
                        </Badge>
                    </div>
                </div>

                <div className='grid gap-4 md:grid-cols-3'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Nghiêm trọng</CardTitle>
                            <IconAlertTriangle className='h-4 w-4 text-red-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-red-500'>
                                {data?.data?.filter((a) => a.severity === 'critical' && !a.acknowledged).length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Chờ xử lý</CardTitle>
                            <IconBell className='h-4 w-4 text-yellow-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-yellow-500'>{unacknowledgedCount}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Đã xử lý</CardTitle>
                            <IconCheck className='h-4 w-4 text-green-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-green-500'>
                                {data?.data?.filter((a) => a.acknowledged).length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách cảnh báo</CardTitle>
                    </CardHeader>
                    <CardContent className='p-0'>
                        <ScrollArea className='h-[500px]'>
                            <div className='space-y-2 p-4'>
                                {isLoading ? (
                                    <div className='text-center py-8'>Đang tải...</div>
                                ) : data?.data?.length === 0 ? (
                                    <div className='text-center py-8 text-muted-foreground'>Không có cảnh báo nào</div>
                                ) : (
                                    data?.data?.map((alert) => {
                                        const styles = getSeverityStyles(alert.severity);
                                        return (
                                            <div
                                                key={alert.id}
                                                className={`flex items-start gap-4 p-4 rounded-lg border ${styles.bg} ${alert.acknowledged ? 'opacity-60' : ''}`}
                                            >
                                                <IconAlertTriangle className={`h-5 w-5 mt-0.5 ${styles.icon}`} />
                                                <div className='flex-1 min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-medium truncate'>{alert.title || alert.alertType}</span>
                                                        <Badge className={`${styles.badge} text-white text-[10px]`}>{alert.severity}</Badge>
                                                    </div>
                                                    <p className='text-sm text-muted-foreground mt-1 line-clamp-2'>{alert.message}</p>
                                                    <div className='flex items-center gap-4 mt-2 text-xs text-muted-foreground'>
                                                        {alert.vehicle && <span>Xe: {alert.vehicle.plateNumber}</span>}
                                                        <span>
                                                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: vi })}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!alert.acknowledged && (
                                                    <Button size='sm' variant='outline' onClick={() => handleAcknowledge(alert.id)}>
                                                        <IconCheck className='h-4 w-4 mr-1' />
                                                        Xác nhận
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
