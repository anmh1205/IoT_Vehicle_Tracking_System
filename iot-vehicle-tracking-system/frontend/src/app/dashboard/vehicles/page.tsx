'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/http';
import { IconPlus, IconSearch, IconEye, IconEdit, IconTrash, IconLoader2 } from '@tabler/icons-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Vehicle {
    id: number;
    vehicleId: string;
    plateNumber: string;
    brand: string;
    model: string;
    status: string;
    vehicleType: string;
    color: string;
    year: number;
}

interface VehiclesResponse {
    data: Vehicle[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function VehiclesPage() {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<VehiclesResponse>({
        queryKey: ['vehicles', search],
        queryFn: () => api.get(`/vehicles?search=${search}&limit=50`),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/vehicles/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            toast.success('Xóa phương tiện thành công!');
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast.error('Không thể xóa phương tiện', { description: error.message });
        },
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

    const getVehicleTypeText = (type: string) => {
        const types: Record<string, string> = {
            car: 'Ô tô con',
            truck: 'Xe tải',
            motorcycle: 'Xe máy',
            bus: 'Xe buýt',
            van: 'Xe van',
        };
        return types[type] || type;
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Phương tiện' description={`Tổng: ${data?.meta?.total ?? 0} phương tiện`} />
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
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã xe</TableHead>
                                    <TableHead>Biển số</TableHead>
                                    <TableHead>Hãng xe</TableHead>
                                    <TableHead>Loại</TableHead>
                                    <TableHead>Màu</TableHead>
                                    <TableHead>Năm SX</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className='text-right'>Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className='text-center py-8'>
                                            <IconLoader2 className='h-6 w-6 animate-spin mx-auto text-muted-foreground' />
                                        </TableCell>
                                    </TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className='text-center py-8 text-muted-foreground'>
                                            Chưa có phương tiện nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((vehicle) => (
                                        <TableRow key={vehicle.id}>
                                            <TableCell className='font-medium'>{vehicle.vehicleId}</TableCell>
                                            <TableCell className='font-mono'>{vehicle.plateNumber}</TableCell>
                                            <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                                            <TableCell>{getVehicleTypeText(vehicle.vehicleType)}</TableCell>
                                            <TableCell>{vehicle.color || '-'}</TableCell>
                                            <TableCell>{vehicle.year || '-'}</TableCell>
                                            <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                                            <TableCell className='text-right'>
                                                <div className='flex justify-end gap-1'>
                                                    <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                                                        <Button variant='ghost' size='icon' title='Xem chi tiết'>
                                                            <IconEye className='h-4 w-4' />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                                                        <Button variant='ghost' size='icon' title='Chỉnh sửa'>
                                                            <IconEdit className='h-4 w-4' />
                                                        </Button>
                                                    </Link>
                                                    <Dialog open={deleteId === vehicle.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant='ghost' size='icon' className='text-destructive' onClick={() => setDeleteId(vehicle.id)}>
                                                                <IconTrash className='h-4 w-4' />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Xác nhận xóa</DialogTitle>
                                                                <DialogDescription>
                                                                    Bạn có chắc muốn xóa phương tiện <strong>{vehicle.plateNumber}</strong>? Hành động này không thể hoàn tác.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter>
                                                                <Button variant='outline' onClick={() => setDeleteId(null)}>
                                                                    Hủy
                                                                </Button>
                                                                <Button
                                                                    variant='destructive'
                                                                    onClick={() => deleteMutation.mutate(vehicle.id)}
                                                                    disabled={deleteMutation.isPending}
                                                                >
                                                                    {deleteMutation.isPending && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}
                                                                    Xóa
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
