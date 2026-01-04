'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { IconMap, IconMapPin } from '@tabler/icons-react';

export default function MapPage() {
    return (
        <PageContainer scrollable={false}>
            <div className='h-full flex flex-col gap-6'>
                <div className='flex items-center justify-between'>
                    <Heading title='Bản đồ theo dõi' description='Vị trí realtime của tất cả phương tiện' />
                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                            <span className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
                            5 xe đang di chuyển
                        </span>
                    </div>
                </div>

                <Card className='flex-1 min-h-[500px]'>
                    <CardContent className='h-full flex items-center justify-center p-0'>
                        <div className='text-center p-8'>
                            <div className='w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4'>
                                <IconMap className='w-10 h-10 text-primary' />
                            </div>
                            <h3 className='text-lg font-semibold mb-2'>Bản đồ Leaflet</h3>
                            <p className='text-muted-foreground max-w-md'>
                                Bản đồ react-leaflet sẽ được tích hợp tại đây để hiển thị vị trí realtime của các phương tiện.
                            </p>
                            <div className='mt-6 grid grid-cols-3 gap-4 text-center'>
                                <div className='p-3 rounded-lg bg-muted'>
                                    <div className='text-2xl font-bold text-green-500'>5</div>
                                    <div className='text-xs text-muted-foreground'>Đang di chuyển</div>
                                </div>
                                <div className='p-3 rounded-lg bg-muted'>
                                    <div className='text-2xl font-bold text-yellow-500'>3</div>
                                    <div className='text-xs text-muted-foreground'>Dừng xe</div>
                                </div>
                                <div className='p-3 rounded-lg bg-muted'>
                                    <div className='text-2xl font-bold text-red-500'>2</div>
                                    <div className='text-xs text-muted-foreground'>Ngoài vùng</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
