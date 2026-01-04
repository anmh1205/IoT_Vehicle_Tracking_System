'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconPlus, IconEye, IconEdit } from '@tabler/icons-react';

export default function CustomersPage() {
    const { data, isLoading } = useQuery<any>({
        queryKey: ['customers'],
        queryFn: () => api.get('/customers?limit=50'),
    });

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Khách hàng' description='Quản lý thông tin khách hàng' />
                    <Link href='/dashboard/customers/new'>
                        <Button>
                            <IconPlus className='mr-2 h-4 w-4' />
                            Thêm khách hàng
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách khách hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Họ tên</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Số điện thoại</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className='text-right'>Thao tác</TableHead>
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
                                            Chưa có khách hàng nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((customer: any) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className='font-medium'>{customer.fullName}</TableCell>
                                            <TableCell>{customer.email}</TableCell>
                                            <TableCell>{customer.phone}</TableCell>
                                            <TableCell>
                                                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                                                    {customer.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                <div className='flex justify-end gap-2'>
                                                    <Link href={`/dashboard/customers/${customer.id}`}>
                                                        <Button variant='ghost' size='icon'>
                                                            <IconEye className='h-4 w-4' />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/dashboard/customers/${customer.id}/edit`}>
                                                        <Button variant='ghost' size='icon'>
                                                            <IconEdit className='h-4 w-4' />
                                                        </Button>
                                                    </Link>
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
