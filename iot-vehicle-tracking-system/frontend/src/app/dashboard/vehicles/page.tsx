'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconPlus, IconSearch, IconEye, IconEdit, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

interface Vehicle {
    id: number;
    vehicleId: string;
    plateNumber: string;
    brand: string;
    model: string;
    status: string;
    vehicleType: string;
    createdAt: string;
}

interface VehiclesResponse {
    data: Vehicle[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function VehiclesPage() {
    const [search, setSearch] = useState('');

    const { data, isLoading } = useQuery<VehiclesResponse>({
        queryKey: ['vehicles', search],
        queryFn: () => api.get(`/vehicles?search=${search}&limit=20`),
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className='bg-green-500/10 text-green-600 hover:bg-green-500/20'>Hoạt động</Badge>;
            case 'inactive':
                return <Badge variant='secondary'>Không hoạt động</Badge>;
            case 'maintenance':
                return <Badge className='bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'>Bảo trì</Badge>;
            default:
                return <Badge variant='outline'>{status}</Badge>;
        }
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Phương tiện' description='Quản lý danh sách phương tiện trong hệ thống' />
                    <Link href='/dashboard/vehicles/new'>
                        <Button>
                            <IconPlus className='mr-2 h-4 w-4' />
                            Thêm xe
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <div className='flex items-center gap-4'>
                            <div className='relative flex-1 max-w-sm'>
                                <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                <Input
                                    placeholder='Tìm kiếm biển số, mã xe...'
                                    className='pl-10'
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                Tổng: {data?.meta?.total ?? 0} xe
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã xe</TableHead>
                                    <TableHead>Biển số</TableHead>
                                    <TableHead>Hãng xe</TableHead>
                                    <TableHead>Loại xe</TableHead>
                                    <TableHead>Trạng thái</TableHead>
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
                                            Chưa có phương tiện nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((vehicle) => (
                                        <TableRow key={vehicle.id}>
                                            <TableCell className='font-medium'>{vehicle.vehicleId}</TableCell>
                                            <TableCell>{vehicle.plateNumber}</TableCell>
                                            <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                                            <TableCell>{vehicle.vehicleType}</TableCell>
                                            <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                                            <TableCell className='text-right'>
                                                <div className='flex justify-end gap-2'>
                                                    <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                                                        <Button variant='ghost' size='icon'>
                                                            <IconEye className='h-4 w-4' />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
                                                        <Button variant='ghost' size='icon'>
                                                            <IconEdit className='h-4 w-4' />
                                                        </Button>
                                                    </Link>
                                                    <Button variant='ghost' size='icon' className='text-destructive'>
                                                        <IconTrash className='h-4 w-4' />
                                                    </Button>
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
