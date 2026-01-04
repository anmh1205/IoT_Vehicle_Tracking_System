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
import { Switch } from '@/components/ui/switch';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { toast } from 'sonner';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import Link from 'next/link';

interface GeofenceFormProps {
    params: Promise<{ id: string }>;
}

export default function GeofenceFormPage({ params }: GeofenceFormProps) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';
    const geofenceId = isEdit ? parseInt(id) : null;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        geofenceType: 'circle',
        latitude: '',
        longitude: '',
        radiusMeters: 500,
        alertOnEntry: true,
        alertOnExit: true,
        enabled: true,
    });

    const { isLoading: loading } = useQuery({
        queryKey: ['geofence', geofenceId],
        queryFn: () => api.get(`/geofences/${geofenceId}`),
        enabled: isEdit && !!geofenceId,
    });

    const mutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                centerLatitude: parseFloat(data.latitude),
                centerLongitude: parseFloat(data.longitude),
            };
            if (isEdit) {
                return api.put(`/geofences/${geofenceId}`, payload);
            }
            return api.post('/geofences', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geofences'] });
            toast.success(isEdit ? 'Cập nhật vùng thành công!' : 'Thêm vùng mới thành công!');
            router.push('/dashboard/geofences');
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

    if (isEdit && loading) {
        return <PageContainer><div className='flex items-center justify-center py-20'><IconLoader2 className='h-8 w-8 animate-spin' /></div></PageContainer>;
    }

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <div className='flex items-center gap-4'>
                    <Link href='/dashboard/geofences'><Button variant='outline' size='icon'><IconArrowLeft className='h-4 w-4' /></Button></Link>
                    <Heading title={isEdit ? 'Chỉnh sửa vùng địa lý' : 'Thêm vùng địa lý mới'} />
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader><CardTitle>Thông tin vùng địa lý</CardTitle></CardHeader>
                        <CardContent className='space-y-6'>
                            <div className='grid gap-6 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='name'>Tên vùng *</Label>
                                    <Input id='name' value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder='Khu vực văn phòng' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='geofenceType'>Loại vùng</Label>
                                    <Select value={formData.geofenceType} onValueChange={(value) => handleChange('geofenceType', value)}>
                                        <SelectTrigger><SelectValue placeholder='Chọn loại' /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='circle'>Hình tròn</SelectItem>
                                            <SelectItem value='polygon'>Đa giác</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='latitude'>Vĩ độ (Latitude) *</Label>
                                    <Input id='latitude' type='number' step='any' value={formData.latitude} onChange={(e) => handleChange('latitude', e.target.value)} placeholder='10.762622' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='longitude'>Kinh độ (Longitude) *</Label>
                                    <Input id='longitude' type='number' step='any' value={formData.longitude} onChange={(e) => handleChange('longitude', e.target.value)} placeholder='106.660172' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='radiusMeters'>Bán kính (mét)</Label>
                                    <Input id='radiusMeters' type='number' value={formData.radiusMeters} onChange={(e) => handleChange('radiusMeters', parseInt(e.target.value))} min={10} max={50000} />
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='description'>Mô tả</Label>
                                <Textarea id='description' value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder='Mô tả vùng địa lý...' rows={2} />
                            </div>
                            <div className='grid gap-6 md:grid-cols-3'>
                                <div className='flex items-center justify-between rounded-lg border p-4'>
                                    <div><Label>Cảnh báo khi vào vùng</Label><p className='text-xs text-muted-foreground'>Nhận thông báo khi xe đi vào</p></div>
                                    <Switch checked={formData.alertOnEntry} onCheckedChange={(checked) => handleChange('alertOnEntry', checked)} />
                                </div>
                                <div className='flex items-center justify-between rounded-lg border p-4'>
                                    <div><Label>Cảnh báo khi ra khỏi vùng</Label><p className='text-xs text-muted-foreground'>Nhận thông báo khi xe đi ra</p></div>
                                    <Switch checked={formData.alertOnExit} onCheckedChange={(checked) => handleChange('alertOnExit', checked)} />
                                </div>
                                <div className='flex items-center justify-between rounded-lg border p-4'>
                                    <div><Label>Kích hoạt</Label><p className='text-xs text-muted-foreground'>Bật/tắt giám sát vùng này</p></div>
                                    <Switch checked={formData.enabled} onCheckedChange={(checked) => handleChange('enabled', checked)} />
                                </div>
                            </div>
                            <div className='flex gap-4 pt-4'>
                                <Button type='submit' disabled={mutation.isPending}>
                                    {mutation.isPending && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}
                                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                                <Link href='/dashboard/geofences'><Button type='button' variant='outline'>Hủy</Button></Link>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </PageContainer>
    );
}
