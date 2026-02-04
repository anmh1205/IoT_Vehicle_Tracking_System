'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/http';
import { IconPlus, IconEdit, IconTrash, IconLoader2, IconMapPin, IconCircle, IconPolygon } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function GeofencesPage() {
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<any>({
        queryKey: ['geofences'],
        queryFn: () => api.get('/geofences?limit=50'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/geofences/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geofences'] });
            toast.success('Xóa vùng thành công!');
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast.error('Không thể xóa vùng', { description: error.message });
        },
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'circle': return <IconCircle className='h-5 w-5 text-blue-500' />;
            case 'polygon': return <IconPolygon className='h-5 w-5 text-purple-500' />;
            default: return <IconMapPin className='h-5 w-5 text-green-500' />;
        }
    };

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Vùng địa lý (Geofences)' description={`Tổng: ${data?.meta?.total ?? 0} vùng`} />
                    <Link href='/dashboard/geofences/new'>
                        <Button><IconPlus className='mr-2 h-4 w-4' />Thêm vùng</Button>
                    </Link>
                </div>

                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {isLoading ? (
                        <div className='col-span-full text-center py-8'><IconLoader2 className='h-8 w-8 animate-spin mx-auto' /></div>
                    ) : data?.data?.length === 0 ? (
                        <Card className='col-span-full'>
                            <CardContent className='text-center py-12'>
                                <IconMapPin className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                                <p className='text-muted-foreground'>Chưa có vùng địa lý nào</p>
                                <Link href='/dashboard/geofences/new'>
                                    <Button className='mt-4'><IconPlus className='mr-2 h-4 w-4' />Tạo vùng đầu tiên</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        data?.data?.map((geofence: any) => (
                            <Card key={geofence.id} className='hover:shadow-md transition-shadow'>
                                <CardContent className='pt-6'>
                                    <div className='flex items-start gap-3'>
                                        <div className='p-2 rounded-lg bg-muted'>{getTypeIcon(geofence.geofenceType)}</div>
                                        <div className='flex-1 min-w-0'>
                                            <h3 className='font-semibold truncate'>{geofence.name}</h3>
                                            <p className='text-sm text-muted-foreground line-clamp-2'>{geofence.description || 'Không có mô tả'}</p>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-2 flex-wrap mt-4'>
                                        <Badge variant='outline'>{geofence.geofenceType === 'circle' ? 'Hình tròn' : 'Đa giác'}</Badge>
                                        {geofence.radiusMeters && <Badge variant='secondary'>{geofence.radiusMeters}m</Badge>}
                                        <Badge className={geofence.enabled ? 'bg-green-500' : 'bg-gray-500'}>{geofence.enabled ? 'Đang bật' : 'Tắt'}</Badge>
                                    </div>
                                    <div className='flex gap-4 mt-3 text-xs text-muted-foreground'>
                                        {geofence.alertOnEntry && <span>🔔 Vào</span>}
                                        {geofence.alertOnExit && <span>🔔 Ra</span>}
                                    </div>
                                    <div className='flex gap-2 mt-4 pt-4 border-t'>
                                        <Link href={`/dashboard/geofences/${geofence.id}`} className='flex-1'>
                                            <Button variant='outline' size='sm' className='w-full'><IconEdit className='mr-1 h-3 w-3' />Sửa</Button>
                                        </Link>
                                        <Dialog open={deleteId === geofence.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                            <DialogTrigger asChild>
                                                <Button variant='outline' size='sm' className='text-destructive' onClick={() => setDeleteId(geofence.id)}>
                                                    <IconTrash className='h-4 w-4' />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Xác nhận xóa</DialogTitle>
                                                    <DialogDescription>Bạn có chắc muốn xóa vùng <strong>{geofence.name}</strong>?</DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <Button variant='outline' onClick={() => setDeleteId(null)}>Hủy</Button>
                                                    <Button variant='destructive' onClick={() => deleteMutation.mutate(geofence.id)} disabled={deleteMutation.isPending}>
                                                        {deleteMutation.isPending && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}Xóa
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
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
