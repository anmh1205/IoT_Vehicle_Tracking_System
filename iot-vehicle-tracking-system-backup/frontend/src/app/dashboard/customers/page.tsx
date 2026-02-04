'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/http';
import { IconPlus, IconSearch, IconEye, IconEdit, IconTrash, IconLoader2, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function CustomersPage() {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<any>({
        queryKey: ['customers', search],
        queryFn: () => api.get(`/customers?search=${search}&limit=50`),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/customers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Xóa khách hàng thành công!');
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast.error('Không thể xóa khách hàng', { description: error.message });
        },
    });

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Khách hàng' description={`Tổng: ${data?.meta?.total ?? 0} khách hàng`} />
                    <Link href='/dashboard/customers/new'>
                        <Button>
                            <IconPlus className='mr-2 h-4 w-4' />
                            Thêm khách hàng
                        </Button>
                    </Link>
                </div>

                <div className='grid gap-4 md:grid-cols-3'>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Tổng khách hàng</CardTitle>
                            <IconUsers className='h-4 w-4 text-muted-foreground' />
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>{data?.meta?.total ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Đang hoạt động</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-green-500'>
                                {data?.data?.filter((c: any) => c.status === 'active').length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium'>Không hoạt động</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold text-gray-500'>
                                {data?.data?.filter((c: any) => c.status !== 'active').length ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className='flex items-center gap-4'>
                            <div className='relative flex-1 max-w-sm'>
                                <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                <Input placeholder='Tìm kiếm tên, email, SĐT...' className='pl-10' value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Họ tên</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Số điện thoại</TableHead>
                                    <TableHead>Công ty</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className='text-right'>Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className='text-center py-8'><IconLoader2 className='h-6 w-6 animate-spin mx-auto' /></TableCell></TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className='text-center py-8 text-muted-foreground'>Chưa có khách hàng nào</TableCell></TableRow>
                                ) : (
                                    data?.data?.map((customer: any) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className='font-medium'>{customer.fullName}</TableCell>
                                            <TableCell>{customer.email}</TableCell>
                                            <TableCell>{customer.phone}</TableCell>
                                            <TableCell>{customer.company || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                                                    {customer.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                <div className='flex justify-end gap-1'>
                                                    <Link href={`/dashboard/customers/${customer.id}`}>
                                                        <Button variant='ghost' size='icon'><IconEdit className='h-4 w-4' /></Button>
                                                    </Link>
                                                    <Dialog open={deleteId === customer.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant='ghost' size='icon' className='text-destructive' onClick={() => setDeleteId(customer.id)}>
                                                                <IconTrash className='h-4 w-4' />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Xác nhận xóa</DialogTitle>
                                                                <DialogDescription>Bạn có chắc muốn xóa khách hàng <strong>{customer.fullName}</strong>?</DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter>
                                                                <Button variant='outline' onClick={() => setDeleteId(null)}>Hủy</Button>
                                                                <Button variant='destructive' onClick={() => deleteMutation.mutate(customer.id)} disabled={deleteMutation.isPending}>
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
