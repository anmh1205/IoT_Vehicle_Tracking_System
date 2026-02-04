'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store/auth-store';
import { authApi } from '@/lib/api/auth';
import { toast } from 'sonner';
import { IconCar, IconLoader2 } from '@tabler/icons-react';

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authApi.login({ email, password });
            login(response);
            toast.success('Đăng nhập thành công!');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error('Đăng nhập thất bại', {
                description: error.message || 'Email hoặc mật khẩu không đúng',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen flex'>
            {/* Left side - Branding */}
            <div className='hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between'>
                <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center'>
                        <IconCar className='w-6 h-6 text-white' />
                    </div>
                    <span className='text-white text-xl font-bold'>IoT Vehicle Tracking</span>
                </div>
                <div>
                    <h1 className='text-4xl font-bold text-white mb-4'>
                        Hệ thống giám sát và quản lý phương tiện thông minh
                    </h1>
                    <p className='text-white/80 text-lg'>
                        Theo dõi vị trí realtime, quản lý cảnh báo, phân tích hành trình và nhiều tính năng khác.
                    </p>
                </div>
                <div className='text-white/60 text-sm'>
                    © 2024 IoT Vehicle Tracking System. All rights reserved.
                </div>
            </div>

            {/* Right side - Login form */}
            <div className='flex-1 flex items-center justify-center p-8 bg-background'>
                <div className='w-full max-w-md'>
                    <div className='lg:hidden flex items-center gap-3 mb-8 justify-center'>
                        <div className='w-10 h-10 rounded-xl bg-primary flex items-center justify-center'>
                            <IconCar className='w-6 h-6 text-primary-foreground' />
                        </div>
                        <span className='text-xl font-bold'>IoT Vehicle Tracking</span>
                    </div>

                    <Card>
                        <CardHeader className='text-center'>
                            <CardTitle className='text-2xl font-bold'>Đăng nhập</CardTitle>
                            <CardDescription>Nhập thông tin để truy cập hệ thống</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='email'>Email</Label>
                                    <Input
                                        id='email'
                                        type='email'
                                        placeholder='admin@example.com'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete='email'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='password'>Mật khẩu</Label>
                                    <Input
                                        id='password'
                                        type='password'
                                        placeholder='••••••••'
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete='current-password'
                                    />
                                </div>
                                <Button type='submit' className='w-full' disabled={loading}>
                                    {loading ? (
                                        <>
                                            <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
                                            Đang đăng nhập...
                                        </>
                                    ) : (
                                        'Đăng nhập'
                                    )}
                                </Button>
                            </form>
                            <div className='mt-6 p-4 rounded-lg bg-muted'>
                                <p className='text-sm text-muted-foreground text-center'>
                                    <span className='font-medium'>Demo account:</span>
                                    <br />
                                    Email: admin@example.com
                                    <br />
                                    Password: admin123
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
