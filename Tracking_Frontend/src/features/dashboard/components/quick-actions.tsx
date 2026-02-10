'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  return <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/dashboard/map">Xem bản đồ</Link></Button><Button asChild variant="outline"><Link href="/dashboard/vehicles">Thêm phương tiện</Link></Button><Button asChild><Link href="/dashboard/alerts">Xem cảnh báo</Link></Button></div>;
}

