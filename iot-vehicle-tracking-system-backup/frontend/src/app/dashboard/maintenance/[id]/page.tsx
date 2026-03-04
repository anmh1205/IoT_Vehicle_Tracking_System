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

interface MaintenanceFormProps {
    params: Promise<{ id: string }>;
}

export default function MaintenanceFormPage({ params }: MaintenanceFormProps) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';
    const maintenanceId = isEdit ? parseInt(id) : null;

    const [formData, setFormData] = useState({
        vehicleId: '',
        maintenanceType: 'oil_change',
        description: '',
        cost: '',
        mileageKm: '',
        performedBy: '',
        notes: '',
    });

    const { data: vehiclesData } = useQuery<any>({
        queryKey: ['vehicles-list'],
        queryFn: () => api.get('/vehicles?limit=100'),
    });

    const { isLoading: loading } = useQuery({
        queryKey: ['maintenance-record', maintenanceId],
        queryFn: () => api.get(`/maintenance/${maintenanceId}`),
        enabled: isEdit && !!maintenanceId,
    });

    const mutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                vehicleId: parseInt(data.vehicleId),
                cost: parseFloat(data.cost) || 0,
                mileageKm: parseInt(data.mileageKm) || 0,
            };
            if (isEdit) {
                return api.put(`/maintenance/${maintenanceId}`, payload);
            }
            return api.post('/maintenance', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success(isEdit ? 'Cập nhật bảo trì thành công!' : 'Thêm bảo trì mới thành công!');
            router.push('/dashboard/maintenance');
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

    const maintenanceTypes = [
        { value: 'oil_change', label: 'Thay dầu' },
        { value: 'tire_rotation', label: 'Đảo lốp' },
        { value: 'brake_service', label: 'Bảo dưỡng phanh' },
        { value: 'engine_tune', label: 'Bảo dưỡng động cơ' },
        { value: 'battery_replacement', label: 'Thay ắc quy' },
        { value: 'inspection', label: 'Kiểm tra định kỳ' },
        { value: 'repair', label: 'Sửa chữa' },
        { value: 'other', label: 'Khác' },
    ];

    if (isEdit && loading) {
        return <PageContainer><div className='flex items-center justify-center py-20'><IconLoader2 className='h-8 w-8 animate-spin' /></div></PageContainer>;
    }

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center gap-4'>
                    <Link href='/dashboard/maintenance'><Button variant='outline' size='icon'><IconArrowLeft className='h-4 w-4' /></Button></Link>
                    <Heading title={isEdit ? 'Chỉnh sửa bảo trì' : 'Thêm lịch bảo trì mới'} />
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader><CardTitle>Thông tin bảo trì</CardTitle></CardHeader>
                        <CardContent className='space-y-6'>
                            <div className='grid gap-6 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='vehicleId'>Phương tiện *</Label>
                                    <Select value={formData.vehicleId} onValueChange={(value) => handleChange('vehicleId', value)}>
                                        <SelectTrigger><SelectValue placeholder='Chọn phương tiện' /></SelectTrigger>
                                        <SelectContent>
                                            {vehiclesData?.data?.map((v: any) => (
                                                <SelectItem key={v.id} value={v.id.toString()}>{v.plateNumber} - {v.brand} {v.model}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='maintenanceType'>Loại bảo trì *</Label>
                                    <Select value={formData.maintenanceType} onValueChange={(value) => handleChange('maintenanceType', value)}>
                                        <SelectTrigger><SelectValue placeholder='Chọn loại bảo trì' /></SelectTrigger>
                                        <SelectContent>
                                            {maintenanceTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='cost'>Chi phí (VNĐ)</Label>
                                    <Input id='cost' type='number' value={formData.cost} onChange={(e) => handleChange('cost', e.target.value)} placeholder='500000' />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='mileageKm'>Số km hiện tại</Label>
                                    <Input id='mileageKm' type='number' value={formData.mileageKm} onChange={(e) => handleChange('mileageKm', e.target.value)} placeholder='50000' />
                                </div>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label htmlFor='performedBy'>Người thực hiện</Label>
                                    <Input id='performedBy' value={formData.performedBy} onChange={(e) => handleChange('performedBy', e.target.value)} placeholder='Garage ABC' />
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='description'>Mô tả công việc</Label>
                                <Textarea id='description' value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder='Mô tả chi tiết công việc bảo trì...' rows={3} />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='notes'>Ghi chú</Label>
                                <Textarea id='notes' value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder='Ghi chú thêm...' rows={2} />
                            </div>
                            <div className='flex gap-4 pt-4'>
                                <Button type='submit' disabled={mutation.isPending}>
                                    {mutation.isPending && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}
                                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                                <Link href='/dashboard/maintenance'><Button type='button' variant='outline'>Hủy</Button></Link>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </PageContainer>
    );
}
