'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconPlus, IconMapPin, IconCircle, IconPolygon } from '@tabler/icons-react';

export default function GeofencesPage() {
    const { data, isLoading } = useQuery<any>({
        queryKey: ['geofences'],
        queryFn: () => api.get('/geofences?limit=50'),
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'circle':
                return <IconCircle className='h-5 w-5 text-blue-500' />;
            case 'polygon':
                return <IconPolygon className='h-5 w-5 text-purple-500' />;
            default:
                return <IconMapPin className='h-5 w-5 text-green-500' />;
        }
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Vùng địa lý' description='Quản lý các vùng geofence để giám sát' />
                    <Button>
                        <IconPlus className='mr-2 h-4 w-4' />
                        Thêm vùng
                    </Button>
                </div>

                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {isLoading ? (
                        <div className='col-span-full text-center py-8'>Đang tải...</div>
                    ) : data?.data?.length === 0 ? (
                        <Card className='col-span-full'>
                            <CardContent className='text-center py-12'>
                                <IconMapPin className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                                <p className='text-muted-foreground'>Chưa có vùng địa lý nào</p>
                                <Button className='mt-4'>
                                    <IconPlus className='mr-2 h-4 w-4' />
                                    Tạo vùng đầu tiên
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        data?.data?.map((geofence: any) => (
                            <Card key={geofence.id} className='hover:shadow-md transition-shadow cursor-pointer'>
                                <CardHeader className='flex flex-row items-start gap-3 pb-2'>
                                    <div className='p-2 rounded-lg bg-muted'>{getTypeIcon(geofence.geofenceType)}</div>
                                    <div className='flex-1'>
                                        <CardTitle className='text-base'>{geofence.name}</CardTitle>
                                        <p className='text-sm text-muted-foreground mt-1'>{geofence.description || 'Không có mô tả'}</p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className='flex items-center gap-2 flex-wrap'>
                                        <Badge variant='outline'>{geofence.geofenceType}</Badge>
                                        {geofence.radiusMeters && <Badge variant='secondary'>{geofence.radiusMeters}m</Badge>}
                                        <Badge className={geofence.enabled ? 'bg-green-500' : 'bg-gray-500'}>
                                            {geofence.enabled ? 'Đang bật' : 'Tắt'}
                                        </Badge>
                                    </div>
                                    <div className='flex gap-4 mt-3 text-xs text-muted-foreground'>
                                        {geofence.alertOnEntry && <span>🔔 Cảnh báo vào</span>}
                                        {geofence.alertOnExit && <span>🔔 Cảnh báo ra</span>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
