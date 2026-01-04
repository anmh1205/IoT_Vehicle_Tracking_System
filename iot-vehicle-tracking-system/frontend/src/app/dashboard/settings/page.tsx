'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { useAuthStore } from '@/lib/store/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { IconUser, IconBell, IconPalette, IconShield, IconServer } from '@tabler/icons-react';

export default function SettingsPage() {
    const { user } = useAuthStore();

    return (
        <PageContainer scrollable>
            <div className='space-y-6'>
                <Heading title='Cài đặt' description='Quản lý cài đặt hệ thống và tài khoản' />

                <div className='grid gap-6 md:grid-cols-3'>
                    <div className='md:col-span-2 space-y-6'>
                        {/* Profile */}
                        <Card>
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <IconUser className='h-5 w-5 text-primary' />
                                    <CardTitle>Thông tin cá nhân</CardTitle>
                                </div>
                                <CardDescription>Cập nhật thông tin tài khoản của bạn</CardDescription>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                <div className='flex items-center gap-4'>
                                    <Avatar className='h-16 w-16'>
                                        <AvatarFallback className='text-lg bg-primary text-primary-foreground'>
                                            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Button variant='outline'>Đổi ảnh đại diện</Button>
                                </div>
                                <Separator />
                                <div className='grid gap-4 md:grid-cols-2'>
                                    <div className='space-y-2'>
                                        <Label>Họ tên</Label>
                                        <Input value={user?.fullName || ''} disabled />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label>Tên đăng nhập</Label>
                                        <Input value={user?.username || ''} disabled />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label>Email</Label>
                                        <Input value={user?.email || ''} disabled />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label>Vai trò</Label>
                                        <Input value={user?.role || ''} disabled />
                                    </div>
                                </div>
                                <Button>Lưu thay đổi</Button>
                            </CardContent>
                        </Card>

                        {/* Notifications */}
                        <Card>
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <IconBell className='h-5 w-5 text-yellow-500' />
                                    <CardTitle>Thông báo</CardTitle>
                                </div>
                                <CardDescription>Cấu hình cách nhận thông báo</CardDescription>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <p className='font-medium'>Thông báo Email</p>
                                        <p className='text-sm text-muted-foreground'>Nhận cảnh báo qua email</p>
                                    </div>
                                    <Switch />
                                </div>
                                <Separator />
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <p className='font-medium'>Thông báo Telegram</p>
                                        <p className='text-sm text-muted-foreground'>Nhận cảnh báo qua Telegram bot</p>
                                    </div>
                                    <Switch />
                                </div>
                                <Separator />
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <p className='font-medium'>Cảnh báo nghiêm trọng</p>
                                        <p className='text-sm text-muted-foreground'>Nhận ngay lập tức qua SMS</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className='space-y-6'>
                        <Card>
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <IconPalette className='h-5 w-5 text-purple-500' />
                                    <CardTitle className='text-base'>Giao diện</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className='text-sm text-muted-foreground mb-4'>Chọn chế độ hiển thị</p>
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button variant='outline' className='justify-start'>Sáng</Button>
                                    <Button variant='outline' className='justify-start'>Tối</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <IconShield className='h-5 w-5 text-green-500' />
                                    <CardTitle className='text-base'>Bảo mật</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className='space-y-2'>
                                <Button variant='outline' className='w-full justify-start'>Đổi mật khẩu</Button>
                                <Button variant='outline' className='w-full justify-start'>Phiên đăng nhập</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <IconServer className='h-5 w-5 text-blue-500' />
                                    <CardTitle className='text-base'>Hệ thống</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className='text-xs text-muted-foreground'>Phiên bản: 1.0.0</p>
                                <p className='text-xs text-muted-foreground'>API: v1</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
