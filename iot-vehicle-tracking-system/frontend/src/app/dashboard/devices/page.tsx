'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconPlus, IconEye, IconDeviceDesktop, IconWifi, IconWifiOff } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function DevicesPage() {
    const { data, isLoading } = useQuery<any>({
        queryKey: ['devices'],
        queryFn: () => api.get('/devices?limit=50'),
    });

    const onlineCount = data?.data?.filter((d: any) => d.status === 'active').length ?? 0;
    const totalCount = data?.data?.length ?? 0;

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Thiết bị' description='Quản lý thiết bị theo dõi IoT' />
                    <Link href='/dashboard/devices/new'>
                        <Button>
                            <IconPlus className='mr-2 h-4 w-4' />
                            Thêm thiết bị
                        </Button>
                    </Link>
                </div>

                <div className='grid gap-4 md:grid-cols-3'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng thiết bị</CardTitle>
                            <IconDeviceDesktop className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>{totalCount}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Đang online</CardTitle>
                            <IconWifi className='h-4 w-4 text-green-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-green-500'>{onlineCount}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Offline</CardTitle>
                            <IconWifiOff className='h-4 w-4 text-red-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-red-500'>{totalCount - onlineCount}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách thiết bị</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã thiết bị</TableHead>
                                    <TableHead>IMEI</TableHead>
                                    <TableHead>Firmware</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Lần cuối hoạt động</TableHead>
                                    <TableHead className='text-right'>Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className='text-center py-8'>Đang tải...</TableCell>
                                    </TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className='text-center py-8 text-muted-foreground'>
                                            Chưa có thiết bị nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((device: any) => (
                                        <TableRow key={device.id}>
                                            <TableCell className='font-medium'>{device.deviceId}</TableCell>
                                            <TableCell>{device.imei}</TableCell>
                                            <TableCell>{device.firmwareVersion || '-'}</TableCell>
                                            <TableCell>
                                                <Badge className={device.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                                                    {device.status === 'active' ? 'Online' : 'Offline'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className='text-muted-foreground'>
                                                {device.lastSeen
                                                    ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true, locale: vi })
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                <Link href={`/dashboard/devices/${device.id}`}>
                                                    <Button variant='ghost' size='icon'>
                                                        <IconEye className='h-4 w-4' />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
