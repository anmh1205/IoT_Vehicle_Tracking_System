'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Car,
    Users,
    Route,
    Bell,
    AlertTriangle,
    MapPin,
    Wrench,
    Cpu,
    Settings,
    Map,
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Bản đồ', href: '/dashboard/map', icon: Map },
    { name: 'Phương tiện', href: '/dashboard/vehicles', icon: Car },
    { name: 'Khách hàng', href: '/dashboard/customers', icon: Users },
    { name: 'Chuyến đi', href: '/dashboard/trips', icon: Route },
    { name: 'Cảnh báo', href: '/dashboard/alerts', icon: Bell },
    { name: 'Vi phạm', href: '/dashboard/violations', icon: AlertTriangle },
    { name: 'Vùng địa lý', href: '/dashboard/geofences', icon: MapPin },
    { name: 'Thiết bị', href: '/dashboard/devices', icon: Cpu },
    { name: 'Bảo trì', href: '/dashboard/maintenance', icon: Wrench },
    { name: 'Cài đặt', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-card border-r flex flex-col">
            <div className="p-4 border-b">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg">IoT Tracking</span>
                </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
