'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { toast } from 'sonner';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import Link from 'next/link';

interface VehicleFormProps {
    params: Promise<{ id: string }>;
}

export default function VehicleFormPage({ params }: VehicleFormProps) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';
    const vehicleId = isEdit ? parseInt(id) : null;

    const [formData, setFormData] = useState({
        vehicleId: '',
        plateNumber: '',
        brand: '',
        model: '',
        vehicleType: 'car',
        color: '',
        year: new Date().getFullYear(),
        status: 'active',
        notes: '',
    });

    const { isLoading: loadingVehicle } = useQuery({
        queryKey: ['vehicle', vehicleId],
        queryFn: () => api.get(`/vehicles/${vehicleId}`),
        enabled: isEdit && !!vehicleId,
    });

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (isEdit) {
                return api.put(`/vehicles/${vehicleId}`, data);
            }
            return api.post('/vehicles', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            toast.success(isEdit ? 'Cập nhật phương tiện thành công!' : 'Thêm phương tiện mới thành công!');
            router.push('/dashboard/vehicles');
        },
        onError: (error: any) => {
            toast.error('Có lỗi xảy ra', { description: error.message });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (isEdit && loadingVehicle) {
        return (
            <PageContainer>
                <div className='flex items-center justify-center py-20'>
                    <IconLoader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center gap-4'>
                    <Link href='/dashboard/vehicles'>
                        <Button variant='outline' size='icon'>
                            <IconArrowLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <Heading title={isEdit ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'} />
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin phương tiện</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-6'>
                            <div className='grid gap-6 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='vehicleId'>Mã phương tiện *</Label>
                                    <Input id='vehicleId' value={formData.vehicleId} onChange={(e) => handleChange('vehicleId', e.target.value)} placeholder='VH-001' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='plateNumber'>Biển số xe *</Label>
                                    <Input id='plateNumber' value={formData.plateNumber} onChange={(e) => handleChange('plateNumber', e.target.value)} placeholder='51A-12345' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='brand'>Hãng xe *</Label>
                                    <Input id='brand' value={formData.brand} onChange={(e) => handleChange('brand', e.target.value)} placeholder='Toyota' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='model'>Dòng xe</Label>
                                    <Input id='model' value={formData.model} onChange={(e) => handleChange('model', e.target.value)} placeholder='Camry' />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='vehicleType'>Loại xe</Label>
                                    <Select value={formData.vehicleType} onValueChange={(value) => handleChange('vehicleType', value)}>
                                        <SelectTrigger><SelectValue placeholder='Chọn loại xe' /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='car'>Ô tô con</SelectItem>
                                            <SelectItem value='truck'>Xe tải</SelectItem>
                                            <SelectItem value='motorcycle'>Xe máy</SelectItem>
                                            <SelectItem value='bus'>Xe buýt</SelectItem>
                                            <SelectItem value='van'>Xe van</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='color'>Màu sắc</Label>
                                    <Input id='color' value={formData.color} onChange={(e) => handleChange('color', e.target.value)} placeholder='Đen' />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='year'>Năm sản xuất</Label>
                                    <Input id='year' type='number' value={formData.year} onChange={(e) => handleChange('year', parseInt(e.target.value))} min={1990} max={new Date().getFullYear() + 1} />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='status'>Trạng thái</Label>
                                    <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                                        <SelectTrigger><SelectValue placeholder='Chọn trạng thái' /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='active'>Hoạt động</SelectItem>
                                            <SelectItem value='inactive'>Không hoạt động</SelectItem>
                                            <SelectItem value='maintenance'>Bảo trì</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='notes'>Ghi chú</Label>
                                <Textarea id='notes' value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder='Nhập ghi chú cho phương tiện...' rows={3} />
                            </div>
                            <div className='flex gap-4 pt-4'>
                                <Button type='submit' disabled={mutation.isPending}>
                                    {mutation.isPending && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}
                                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                                <Link href='/dashboard/vehicles'>
                                    <Button type='button' variant='outline'>Hủy</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </PageContainer>
    );
}
