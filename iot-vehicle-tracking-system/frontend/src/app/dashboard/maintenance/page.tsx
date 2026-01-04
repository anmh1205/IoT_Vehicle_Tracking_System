'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/http';
import { IconPlus, IconEdit, IconTrash, IconLoader2, IconTool, IconCalendar, IconReceipt } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function MaintenancePage() {
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<any>({
        queryKey: ['maintenance'],
        queryFn: () => api.get('/maintenance?limit=50'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/maintenance/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Xóa bảo trì thành công!');
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast.error('Không thể xóa', { description: error.message });
        },
    });

    const totalCost = data?.data?.reduce((sum: number, r: any) => sum + (parseFloat(r.cost) || 0), 0) ?? 0;

    const maintenanceTypeLabels: Record<string, string> = {
        oil_change: 'Thay dầu',
        tire_rotation: 'Đảo lốp',
        brake_service: 'Bảo dưỡng phanh',
        engine_tune: 'Bảo dưỡng động cơ',
        battery_replacement: 'Thay ắc quy',
        inspection: 'Kiểm tra',
        repair: 'Sửa chữa',
        other: 'Khác',
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Bảo trì' description={`Tổng: ${data?.meta?.total ?? 0} lịch bảo trì`} />
                    <Link href='/dashboard/maintenance/new'>
                        <Button><IconPlus className='mr-2 h-4 w-4' />Thêm bảo trì</Button>
                    </Link>
                </div>

                <div className='grid gap-4 md:grid-cols-3'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng bảo trì</CardTitle>
                            <IconTool className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent><div className='text-2xl font-bold'>{data?.meta?.total ?? 0}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng chi phí</CardTitle>
                            <IconReceipt className='h-4 w-4 text-green-500' />
                        </CardHeader>
                        <CardContent><div className='text-2xl font-bold text-green-500'>{totalCost.toLocaleString('vi-VN')} đ</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tháng này</CardTitle>
                            <IconCalendar className='h-4 w-4 text-blue-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-blue-500'>
                                {data?.data?.filter((r: any) => {
                                    const now = new Date();
                                    const recordDate = new Date(r.createdAt);
                                    return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
                                }).length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Lịch sử bảo trì</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Loại bảo trì</TableHead>
                                    <TableHead>Phương tiện</TableHead>
                                    <TableHead>Chi phí</TableHead>
                                    <TableHead>Km</TableHead>
                                    <TableHead>Người thực hiện</TableHead>
                                    <TableHead>Ngày</TableHead>
                                    <TableHead className='text-right'>Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={7} className='text-center py-8'><IconLoader2 className='h-6 w-6 animate-spin mx-auto' /></TableCell></TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className='text-center py-8 text-muted-foreground'>Chưa có lịch sử bảo trì</TableCell></TableRow>
                                ) : (
                                    data?.data?.map((record: any) => (
                                        <TableRow key={record.id}>
                                            <TableCell className='font-medium'>{maintenanceTypeLabels[record.maintenanceType] || record.maintenanceType}</TableCell>
                                            <TableCell>{record.vehicle?.plateNumber || '-'}</TableCell>
                                            <TableCell>{record.cost ? `${parseFloat(record.cost).toLocaleString('vi-VN')} đ` : '-'}</TableCell>
                                            <TableCell>{record.mileageKm ? `${record.mileageKm.toLocaleString()} km` : '-'}</TableCell>
                                            <TableCell>{record.performedBy || '-'}</TableCell>
                                            <TableCell className='text-muted-foreground'>{record.createdAt ? format(new Date(record.createdAt), 'dd/MM/yyyy', { locale: vi }) : '-'}</TableCell>
                                            <TableCell className='text-right'>
                                                <div className='flex justify-end gap-1'>
                                                    <Link href={`/dashboard/maintenance/${record.id}`}>
                                                        <Button variant='ghost' size='icon'><IconEdit className='h-4 w-4' /></Button>
                                                    </Link>
                                                    <Dialog open={deleteId === record.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant='ghost' size='icon' className='text-destructive' onClick={() => setDeleteId(record.id)}>
                                                                <IconTrash className='h-4 w-4' />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Xác nhận xóa</DialogTitle>
                                                                <DialogDescription>Bạn có chắc muốn xóa lịch bảo trì này?</DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter>
                                                                <Button variant='outline' onClick={() => setDeleteId(null)}>Hủy</Button>
                                                                <Button variant='destructive' onClick={() => deleteMutation.mutate(record.id)} disabled={deleteMutation.isPending}>
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
