'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/http';
import { IconPlus, IconEye, IconTrash, IconLoader2, IconDeviceDesktop, IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function DevicesPage() {
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<any>({
        queryKey: ['devices'],
        queryFn: () => api.get('/devices?limit=50'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/devices/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            toast.success('Xóa thiết bị thành công!');
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast.error('Không thể xóa thiết bị', { description: error.message });
        },
    });

    const onlineCount = data?.data?.filter((d: any) => d.status === 'active').length ?? 0;
    const totalCount = data?.data?.length ?? 0;

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Thiết bị IoT' description={`Tổng: ${totalCount} thiết bị`} />
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
                        <CardContent><div className='text-2xl font-bold'>{totalCount}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Đang online</CardTitle>
                            <IconWifi className='h-4 w-4 text-green-500' />
                        </CardHeader>
                        <CardContent><div className='text-2xl font-bold text-green-500'>{onlineCount}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Offline</CardTitle>
                            <IconWifiOff className='h-4 w-4 text-red-500' />
                        </CardHeader>
                        <CardContent><div className='text-2xl font-bold text-red-500'>{totalCount - onlineCount}</div></CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Danh sách thiết bị</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã thiết bị</TableHead>
                                    <TableHead>IMEI</TableHead>
                                    <TableHead>SIM</TableHead>
                                    <TableHead>Firmware</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Lần cuối online</TableHead>
                                    <TableHead className='text-right'>Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={7} className='text-center py-8'><IconLoader2 className='h-6 w-6 animate-spin mx-auto' /></TableCell></TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className='text-center py-8 text-muted-foreground'>Chưa có thiết bị nào</TableCell></TableRow>
                                ) : (
                                    data?.data?.map((device: any) => (
                                        <TableRow key={device.id}>
                                            <TableCell className='font-medium'>{device.deviceId}</TableCell>
                                            <TableCell className='font-mono text-xs'>{device.imei}</TableCell>
                                            <TableCell>{device.simNumber || '-'}</TableCell>
                                            <TableCell>{device.firmwareVersion || '-'}</TableCell>
                                            <TableCell>
                                                <Badge className={device.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                                                    {device.status === 'active' ? 'Online' : 'Offline'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className='text-muted-foreground text-sm'>
                                                {device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true, locale: vi }) : '-'}
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                <div className='flex justify-end gap-1'>
                                                    <Link href={`/dashboard/devices/${device.id}`}>
                                                        <Button variant='ghost' size='icon'><IconEye className='h-4 w-4' /></Button>
                                                    </Link>
                                                    <Dialog open={deleteId === device.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant='ghost' size='icon' className='text-destructive' onClick={() => setDeleteId(device.id)}>
                                                                <IconTrash className='h-4 w-4' />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Xác nhận xóa</DialogTitle>
                                                                <DialogDescription>Bạn có chắc muốn xóa thiết bị <strong>{device.deviceId}</strong>?</DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter>
                                                                <Button variant='outline' onClick={() => setDeleteId(null)}>Hủy</Button>
                                                                <Button variant='destructive' onClick={() => deleteMutation.mutate(device.id)} disabled={deleteMutation.isPending}>
                                                                    {deleteMutation.isPending && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}Xóa
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
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
