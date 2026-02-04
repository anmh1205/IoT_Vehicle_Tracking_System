'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconRoute, IconClock, IconMapPin } from '@tabler/icons-react';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function TripsPage() {
    const { data, isLoading } = useQuery<any>({
        queryKey: ['trips'],
        queryFn: () => api.get('/trips?limit=50'),
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'in_progress':
                return <Badge className='bg-green-500'>Đang di chuyển</Badge>;
            case 'completed':
                return <Badge variant='secondary'>Hoàn thành</Badge>;
            default:
                return <Badge variant='outline'>{status}</Badge>;
        }
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <Heading title='Chuyến đi' description='Lịch sử các chuyến đi của phương tiện' />

                <div className='grid gap-4 md:grid-cols-3'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng chuyến đi</CardTitle>
                            <IconRoute className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>{data?.meta?.total ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Đang di chuyển</CardTitle>
                            <IconMapPin className='h-4 w-4 text-green-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-green-500'>
                                {data?.data?.filter((t: any) => t.status === 'in_progress').length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Hôm nay</CardTitle>
                            <IconClock className='h-4 w-4 text-blue-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-blue-500'>
                                {data?.data?.filter((t: any) => {
                                    const today = new Date().toDateString();
                                    return new Date(t.startTime).toDateString() === today;
                                }).length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách chuyến đi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-4'>
                            {isLoading ? (
                                <div className='text-center py-8'>Đang tải...</div>
                            ) : data?.data?.length === 0 ? (
                                <div className='text-center py-8 text-muted-foreground'>Chưa có chuyến đi nào</div>
                            ) : (
                                data?.data?.map((trip: any) => (
                                    <div key={trip.id} className='flex items-center gap-4 p-4 rounded-lg border'>
                                        <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                                            <IconRoute className='h-5 w-5 text-primary' />
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-center gap-2'>
                                                <span className='font-medium'>{trip.vehicle?.plateNumber || trip.tripId}</span>
                                                {getStatusBadge(trip.status)}
                                            </div>
                                            <div className='text-sm text-muted-foreground mt-1'>
                                                {trip.startLocation || 'Không xác định'} → {trip.endLocation || 'Đang di chuyển'}
                                            </div>
                                        </div>
                                        <div className='text-right text-sm'>
                                            <div>{trip.distanceKm ? `${trip.distanceKm} km` : '-'}</div>
                                            <div className='text-muted-foreground'>
                                                {format(new Date(trip.startTime), 'HH:mm dd/MM', { locale: vi })}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
