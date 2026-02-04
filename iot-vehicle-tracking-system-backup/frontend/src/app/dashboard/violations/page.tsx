'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconAlertTriangle, IconSpeedboat } from '@tabler/icons-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function ViolationsPage() {
    const { data, isLoading } = useQuery<any>({
        queryKey: ['violations'],
        queryFn: () => api.get('/violations?limit=50'),
    });

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'high':
                return <Badge className='bg-red-500'>Nghiêm trọng</Badge>;
            case 'medium':
                return <Badge className='bg-yellow-500'>Trung bình</Badge>;
            default:
                return <Badge variant='secondary'>Thấp</Badge>;
        }
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <Heading title='Vi phạm' description='Lịch sử các vi phạm của phương tiện' />

                <div className='grid gap-4 md:grid-cols-2'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng vi phạm</CardTitle>
                            <IconAlertTriangle className='h-4 w-4 text-red-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>{data?.meta?.total ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Vượt tốc độ</CardTitle>
                            <IconSpeedboat className='h-4 w-4 text-orange-500' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>
                                {data?.data?.filter((v: any) => v.violationType === 'speeding').length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách vi phạm</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Loại vi phạm</TableHead>
                                    <TableHead>Phương tiện</TableHead>
                                    <TableHead>Mức độ</TableHead>
                                    <TableHead>Thời gian</TableHead>
                                    <TableHead>Ghi chú</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className='text-center py-8'>Đang tải...</TableCell>
                                    </TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className='text-center py-8 text-muted-foreground'>
                                            Chưa có vi phạm nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((violation: any) => (
                                        <TableRow key={violation.id}>
                                            <TableCell className='font-medium'>{violation.violationType}</TableCell>
                                            <TableCell>{violation.vehicle?.plateNumber || '-'}</TableCell>
                                            <TableCell>{getSeverityBadge(violation.severity)}</TableCell>
                                            <TableCell className='text-muted-foreground'>
                                                {violation.violationTime
                                                    ? format(new Date(violation.violationTime), 'HH:mm dd/MM/yyyy', { locale: vi })
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className='max-w-xs truncate'>{violation.description || '-'}</TableCell>
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
