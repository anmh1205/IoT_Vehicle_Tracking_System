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

interface CustomerFormProps {
    params: Promise<{ id: string }>;
}

export default function CustomerFormPage({ params }: CustomerFormProps) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';
    const customerId = isEdit ? parseInt(id) : null;

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        status: 'active',
        notes: '',
    });

    const { isLoading: loadingCustomer } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: () => api.get(`/customers/${customerId}`),
        enabled: isEdit && !!customerId,
    });

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (isEdit) {
                return api.put(`/customers/${customerId}`, data);
            }
            return api.post('/customers', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success(isEdit ? 'Cập nhật khách hàng thành công!' : 'Thêm khách hàng mới thành công!');
            router.push('/dashboard/customers');
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

    if (isEdit && loadingCustomer) {
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
                    <Link href='/dashboard/customers'>
                        <Button variant='outline' size='icon'>
                            <IconArrowLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <Heading title={isEdit ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'} />
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin khách hàng</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-6'>
                            <div className='grid gap-6 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='fullName'>Họ tên *</Label>
                                    <Input id='fullName' value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder='Nguyễn Văn A' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='email'>Email *</Label>
                                    <Input id='email' type='email' value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder='email@example.com' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='phone'>Số điện thoại *</Label>
                                    <Input id='phone' value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder='0901234567' required />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='company'>Công ty</Label>
                                    <Input id='company' value={formData.company} onChange={(e) => handleChange('company', e.target.value)} placeholder='Tên công ty' />
                                </div>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label htmlFor='address'>Địa chỉ</Label>
                                    <Input id='address' value={formData.address} onChange={(e) => handleChange('address', e.target.value)} placeholder='Địa chỉ' />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='status'>Trạng thái</Label>
                                    <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder='Chọn trạng thái' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='active'>Hoạt động</SelectItem>
                                            <SelectItem value='inactive'>Không hoạt động</SelectItem>
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
                                <Link href='/dashboard/customers'>
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
