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

interface DeviceFormProps {
    params: Promise<{ id: string }>;
}

export default function DeviceFormPage({ params }: DeviceFormProps) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';
    const deviceId = isEdit ? parseInt(id) : null;

    const [formData, setFormData] = useState({
        deviceId: '',
        imei: '',
        simNumber: '',
        firmwareVersion: '',
        deviceType: 'gps_tracker',
        status: 'active',
        notes: '',
    });

    const { isLoading: loadingDevice } = useQuery({
        queryKey: ['device', deviceId],
        queryFn: () => api.get(`/devices/${deviceId}`),
        enabled: isEdit && !!deviceId,
    });

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (isEdit) {
                return api.put(`/devices/${deviceId}`, data);
            }
            return api.post('/devices', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            toast.success(isEdit ? 'Cập nhật thiết bị thành công!' : 'Thêm thiết bị mới thành công!');
            router.push('/dashboard/devices');
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

    if (isEdit && loadingDevice) {
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
                    <Link href='/dashboard/devices'>
                        <Button variant='outline' size='icon'>
                            <IconArrowLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <Heading title={isEdit ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'} />
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin thiết bị IoT</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-6'>
                            <div className='grid gap-6 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='deviceId'>Mã thiết bị *</Label>
                                    <Input id='deviceId' value={formData.deviceId} onChange={(e) => handleChange('deviceId', e.target.value)} placeholder='DEV-001' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='imei'>IMEI *</Label>
                                    <Input id='imei' value={formData.imei} onChange={(e) => handleChange('imei', e.target.value)} placeholder='123456789012345' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='simNumber'>Số SIM</Label>
                                    <Input id='simNumber' value={formData.simNumber} onChange={(e) => handleChange('simNumber', e.target.value)} placeholder='0901234567' />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='firmwareVersion'>Phiên bản Firmware</Label>
                                    <Input id='firmwareVersion' value={formData.firmwareVersion} onChange={(e) => handleChange('firmwareVersion', e.target.value)} placeholder='v1.0.0' />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='deviceType'>Loại thiết bị</Label>
                                    <Select value={formData.deviceType} onValueChange={(value) => handleChange('deviceType', value)}>
                                        <SelectTrigger><SelectValue placeholder='Chọn loại thiết bị' /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='gps_tracker'>GPS Tracker</SelectItem>
                                            <SelectItem value='obd'>OBD-II</SelectItem>
                                            <SelectItem value='camera'>Camera hành trình</SelectItem>
                                            <SelectItem value='sensor'>Cảm biến</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='status'>Trạng thái</Label>
                                    <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                                        <SelectTrigger><SelectValue placeholder='Chọn trạng thái' /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='active'>Hoạt động</SelectItem>
                                            <SelectItem value='inactive'>Không hoạt động</SelectItem>
                                            <SelectItem value='pending'>Chờ kích hoạt</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='notes'>Ghi chú</Label>
                                <Textarea id='notes' value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder='Nhập ghi chú...' rows={3} />
                            </div>
                            <div className='flex gap-4 pt-4'>
                                <Button type='submit' disabled={mutation.isPending}>
                                    {mutation.isPending && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}
                                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                                <Link href='/dashboard/devices'>
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
