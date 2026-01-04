'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconPlus, IconTool, IconCalendar, IconReceipt } from '@tabler/icons-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function MaintenancePage() {
    const { data, isLoading } = useQuery<any>({
        queryKey: ['maintenance'],
        queryFn: () => api.get('/maintenance?limit=50'),
    });

    const totalCost = data?.data?.reduce((sum: number, r: any) => sum + (parseFloat(r.cost) || 0), 0) ?? 0;

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Bảo trì' description='Quản lý lịch sử bảo trì phương tiện' />
                    <Button>
                        <IconPlus className='mr-2 h-4 w-4' />
                        Thêm bảo trì
                    </Button>
                </div>

                <div className='grid gap-4 md:grid-cols-3'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng bảo trì</CardTitle>
                            <IconTool className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>{data?.meta?.total ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng chi phí</CardTitle>
                            <IconReceipt className='h-4 w-4 text-green-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-green-500'>{totalCost.toLocaleString('vi-VN')} đ</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Sắp bảo trì</CardTitle>
                            <IconCalendar className='h-4 w-4 text-yellow-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-yellow-500'>0</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Lịch sử bảo trì</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Loại bảo trì</TableHead>
                                    <TableHead>Phương tiện</TableHead>
                                    <TableHead>Chi phí</TableHead>
                                    <TableHead>Km</TableHead>
                                    <TableHead>Ngày thực hiện</TableHead>
                                    <TableHead>Thực hiện bởi</TableHead>
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
                                            Chưa có lịch sử bảo trì
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((record: any) => (
                                        <TableRow key={record.id}>
                                            <TableCell className='font-medium'>{record.maintenanceType}</TableCell>
                                            <TableCell>{record.vehicle?.plateNumber || '-'}</TableCell>
                                            <TableCell>{record.cost ? `${parseFloat(record.cost).toLocaleString('vi-VN')} đ` : '-'}</TableCell>
                                            <TableCell>{record.mileageKm ? `${record.mileageKm.toLocaleString()} km` : '-'}</TableCell>
                                            <TableCell className='text-muted-foreground'>
                                                {record.createdAt ? format(new Date(record.createdAt), 'dd/MM/yyyy', { locale: vi }) : '-'}
                                            </TableCell>
                                            <TableCell>{record.performedBy || '-'}</TableCell>
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
