'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageContainer, Heading } from '@/components/layout/page-container';
import { api } from '@/lib/api/http';
import { IconSearch, IconRefresh, IconMapPin, IconCar, IconLoader2 } from '@tabler/icons-react';
import type { VehicleLocation, GeofenceData } from '@/components/map/vehicle-map';

// Dynamically import map to avoid SSR issues
const VehicleMap = dynamic(() => import('@/components/map/vehicle-map'), {
    ssr: false,
    loading: () => (
        <div className='h-full flex items-center justify-center bg-muted rounded-lg'>
            <IconLoader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
    ),
});

// Mock data for demonstration
const mockVehicles: VehicleLocation[] = [
    {
        id: 1,
        vehicleId: 'VH-001',
        plateNumber: '51A-12345',
        latitude: 10.762622,
        longitude: 106.660172,
        speed: 45,
        heading: 90,
        status: 'moving',
        lastUpdated: new Date().toISOString(),
        driver: 'Nguyễn Văn A',
    },
    {
        id: 2,
        vehicleId: 'VH-002',
        plateNumber: '51B-67890',
        latitude: 10.772622,
        longitude: 106.680172,
        speed: 0,
        heading: 0,
        status: 'stopped',
        lastUpdated: new Date().toISOString(),
        driver: 'Trần Văn B',
    },
    {
        id: 3,
        vehicleId: 'VH-003',
        plateNumber: '51C-11111',
        latitude: 10.752622,
        longitude: 106.640172,
        speed: 60,
        heading: 180,
        status: 'moving',
        lastUpdated: new Date().toISOString(),
        driver: 'Lê Văn C',
    },
    {
        id: 4,
        vehicleId: 'VH-004',
        plateNumber: '51D-22222',
        latitude: 10.782622,
        longitude: 106.700172,
        speed: 0,
        heading: 0,
        status: 'offline',
        lastUpdated: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 5,
        vehicleId: 'VH-005',
        plateNumber: '51E-33333',
        latitude: 10.742622,
        longitude: 106.620172,
        speed: 85,
        heading: 45,
        status: 'alert',
        lastUpdated: new Date().toISOString(),
        driver: 'Phạm Văn D',
    },
];

const mockGeofences: GeofenceData[] = [
    {
        id: 1,
        name: 'Khu vực văn phòng',
        type: 'circle',
        center: { lat: 10.762622, lng: 106.660172 },
        radius: 500,
        color: '#3b82f6',
    },
    {
        id: 2,
        name: 'Kho hàng',
        type: 'circle',
        center: { lat: 10.772622, lng: 106.680172 },
        radius: 300,
        color: '#22c55e',
    },
];

export default function MapPage() {
    const [search, setSearch] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
    const [vehicles, setVehicles] = useState<VehicleLocation[]>(mockVehicles);

    // Fetch real vehicles data
    const { data: vehiclesData, refetch, isLoading } = useQuery<any>({
        queryKey: ['vehicles-locations'],
        queryFn: () => api.get('/vehicles?limit=100'),
        refetchInterval: 30000, // Auto refresh every 30s
    });

    // Fetch geofences
    const { data: geofencesData } = useQuery<any>({
        queryKey: ['geofences-map'],
        queryFn: () => api.get('/geofences?limit=50'),
    });

    // Convert real data to map format when available
    useEffect(() => {
        if (vehiclesData?.data?.length) {
            const realVehicles: VehicleLocation[] = vehiclesData.data.map((v: any, idx: number) => ({
                id: v.id,
                vehicleId: v.vehicleId,
                plateNumber: v.plateNumber,
                latitude: 10.762622 + (Math.random() - 0.5) * 0.05, // Random position for demo
                longitude: 106.660172 + (Math.random() - 0.5) * 0.05,
                speed: Math.floor(Math.random() * 80),
                heading: Math.floor(Math.random() * 360),
                status: v.status === 'active' ? (Math.random() > 0.3 ? 'moving' : 'stopped') : 'offline',
                lastUpdated: new Date().toISOString(),
            }));
            setVehicles(realVehicles.length ? realVehicles : mockVehicles);
        }
    }, [vehiclesData]);

    // Convert geofences to map format
    const geofences: GeofenceData[] = useMemo(() => {
        if (geofencesData?.data?.length) {
            return geofencesData.data.map((g: any) => ({
                id: g.id,
                name: g.name,
                type: g.geofenceType || 'circle',
                center: g.centerLatitude && g.centerLongitude ? { lat: g.centerLatitude, lng: g.centerLongitude } : undefined,
                radius: g.radiusMeters,
                color: '#3b82f6',
            }));
        }
        return mockGeofences;
    }, [geofencesData]);

    const filteredVehicles = vehicles.filter(
        (v) =>
            v.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
            v.vehicleId.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: vehicles.length,
        moving: vehicles.filter((v) => v.status === 'moving').length,
        stopped: vehicles.filter((v) => v.status === 'stopped').length,
        offline: vehicles.filter((v) => v.status === 'offline').length,
        alert: vehicles.filter((v) => v.status === 'alert').length,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'moving':
                return 'bg-green-500';
            case 'stopped':
                return 'bg-yellow-500';
            case 'alert':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'moving':
                return 'Di chuyển';
            case 'stopped':
                return 'Dừng';
            case 'alert':
                return 'Cảnh báo';
            default:
                return 'Offline';
        }
    };

    return (
        <PageContainer scrollable={false}>
            <div className='h-[calc(100vh-8rem)] flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                    <Heading title='Bản đồ theo dõi' description='Vị trí realtime của phương tiện' />
                    <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isLoading}>
                        <IconRefresh className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </Button>
                </div>

                {/* Stats */}
                <div className='grid grid-cols-5 gap-3'>
                    <Card className='p-3'>
                        <div className='flex items-center gap-2'>
                            <IconCar className='h-4 w-4 text-muted-foreground' />
                            <span className='text-sm text-muted-foreground'>Tổng</span>
                        </div>
                        <div className='text-2xl font-bold'>{stats.total}</div>
                    </Card>
                    <Card className='p-3'>
                        <div className='flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-green-500' />
                            <span className='text-sm text-muted-foreground'>Di chuyển</span>
                        </div>
                        <div className='text-2xl font-bold text-green-500'>{stats.moving}</div>
                    </Card>
                    <Card className='p-3'>
                        <div className='flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-yellow-500' />
                            <span className='text-sm text-muted-foreground'>Dừng</span>
                        </div>
                        <div className='text-2xl font-bold text-yellow-500'>{stats.stopped}</div>
                    </Card>
                    <Card className='p-3'>
                        <div className='flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-gray-500' />
                            <span className='text-sm text-muted-foreground'>Offline</span>
                        </div>
                        <div className='text-2xl font-bold text-gray-500'>{stats.offline}</div>
                    </Card>
                    <Card className='p-3'>
                        <div className='flex items-center gap-2'>
                            <span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
                            <span className='text-sm text-muted-foreground'>Cảnh báo</span>
                        </div>
                        <div className='text-2xl font-bold text-red-500'>{stats.alert}</div>
                    </Card>
                </div>

                {/* Map and sidebar */}
                <div className='flex-1 grid grid-cols-4 gap-4 min-h-0'>
                    {/* Vehicle list sidebar */}
                    <Card className='col-span-1 flex flex-col'>
                        <CardHeader className='pb-2'>
                            <CardTitle className='text-base'>Phương tiện</CardTitle>
                            <div className='relative'>
                                <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                <Input
                                    placeholder='Tìm kiếm...'
                                    className='pl-10 h-8'
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className='flex-1 p-0 min-h-0'>
                            <ScrollArea className='h-full'>
                                <div className='space-y-1 p-3'>
                                    {filteredVehicles.map((vehicle) => (
                                        <div
                                            key={vehicle.id}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedVehicle === vehicle.id
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'hover:bg-muted'
                                                }`}
                                            onClick={() => setSelectedVehicle(vehicle.id)}
                                        >
                                            <div className='flex items-center justify-between'>
                                                <span className='font-medium'>{vehicle.plateNumber}</span>
                                                <Badge className={`${getStatusColor(vehicle.status)} text-white text-[10px]`}>
                                                    {getStatusText(vehicle.status)}
                                                </Badge>
                                            </div>
                                            <div className='text-xs mt-1 opacity-70'>
                                                {vehicle.speed} km/h • {vehicle.driver || vehicle.vehicleId}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Map */}
                    <Card className='col-span-3 overflow-hidden'>
                        <VehicleMap
                            vehicles={vehicles}
                            geofences={geofences}
                            selectedVehicle={selectedVehicle}
                            onVehicleClick={(v) => setSelectedVehicle(v.id)}
                        />
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}
