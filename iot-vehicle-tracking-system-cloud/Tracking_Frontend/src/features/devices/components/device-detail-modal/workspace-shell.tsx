'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  CarFront,
  Database,
  LayoutDashboard,
  MapPinned,
  RefreshCw,
  Settings2,
  TerminalSquare,
  TriangleAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportModal } from '@/features/devices/components/export-modal';
import { DeviceDetailSkeleton } from '@/features/devices/components/device-skeletons';
import { ErrorBox } from '@/features/devices/components/error-box';
import { useRoleAccess } from '@/hooks/use-role-access';
import { formatRelative } from '@/lib/utils/date/format';
import { cn } from '@/lib/utils';
import { useDeviceDetailModal } from './modal-context';
import { DeviceWorkspaceCanvas } from './workspace-canvas';
import { WorkspaceOverviewQuickStats } from './workspace-overview-quick-stats';
import { resolveWorkspaceLaunchState, type DeviceWorkspaceActions, type DeviceWorkspaceFallbackPaths, type DeviceWorkspaceSection } from './workspace-types';
import type { MapInspectPanelPayload, MapInspectPanelTarget } from '@/features/map/types';

const SECTION_ITEMS = [
  { value: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { value: 'vehicle', label: 'Xe', icon: CarFront },
  { value: 'alerts', label: 'Cảnh báo', icon: TriangleAlert },
  { value: 'errors', label: 'Lỗi', icon: Activity },
  { value: 'runtime', label: 'Runtime', icon: Activity },
  { value: 'route', label: 'Lộ trình', icon: MapPinned },
  { value: 'commands', label: 'Lệnh', icon: TerminalSquare },
  { value: 'raw', label: 'Raw data', icon: Database },
  { value: 'zones', label: 'Vùng', icon: MapPinned },
  { value: 'settings', label: 'Cài đặt', icon: Settings2 },
] as const satisfies Array<{ value: DeviceWorkspaceSection; label: string; icon: React.ComponentType<{ className?: string }> }>;

export const DeviceWorkspaceShell = ({
  fallbackPaths,
  launchPayload,
  launchRequestKey = 0,
  launchTarget = 'overview',
  onOpenChange,
  workspaceActions,
}: {
  fallbackPaths: DeviceWorkspaceFallbackPaths;
  launchPayload?: MapInspectPanelPayload | null;
  launchRequestKey?: number;
  launchTarget?: MapInspectPanelTarget;
  onOpenChange: (open: boolean) => void;
  workspaceActions?: DeviceWorkspaceActions;
}) => {
  const [activeSection, setActiveSection] = useState<DeviceWorkspaceSection>('overview');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ section: DeviceWorkspaceSection; highlight: string | null }>>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initialLaunchRef = useRef(false);
  const lastLaunchSignatureRef = useRef('');
  const { canEditDevice } = useRoleAccess();
  const { device, loading, error, onRefresh } = useDeviceDetailModal();

  const sections = useMemo(
    () => SECTION_ITEMS.filter((item) => (item.value === 'settings' ? canEditDevice : true)),
    [canEditDevice],
  );

  const launchSignature = `${launchRequestKey}:${launchTarget}:${launchPayload?.highlight ?? ''}:${launchPayload?.linkedEntityType ?? ''}:${launchPayload?.linkedEntityId ?? ''}:${launchPayload?.linkedEntityKey ?? ''}`;

  useEffect(() => {
    const next = resolveWorkspaceLaunchState(launchTarget, launchPayload);

    if (!initialLaunchRef.current) {
      initialLaunchRef.current = true;
      lastLaunchSignatureRef.current = launchSignature;
      setActiveSection(next.section);
      setHighlight(next.highlight);
      return;
    }

    if (lastLaunchSignatureRef.current === launchSignature) {
      return;
    }

    lastLaunchSignatureRef.current = launchSignature;
    setHistory((previous) =>
      activeSection === next.section && highlight === next.highlight
        ? previous
        : [...previous.slice(-5), { section: activeSection, highlight }],
    );
    setActiveSection(next.section);
    setHighlight(next.highlight);
  }, [activeSection, highlight, launchPayload, launchSignature, launchTarget]);

  const setSection = (section: DeviceWorkspaceSection) => {
    if (section === activeSection) {
      return;
    }

    setHistory((previous) => [...previous.slice(-5), { section: activeSection, highlight }]);
    setActiveSection(section);
    setHighlight(null);
  };

  const handleBack = () => {
    const previous = history.at(-1);
    if (!previous) {
      return;
    }

    setHistory((current) => current.slice(0, -1));
    setActiveSection(previous.section);
    setHighlight(previous.highlight);
  };

  return (
    <DialogContent
      showCloseButton={false}
      className="!inset-0 !left-0 !top-0 !grid !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex flex-col overflow-hidden rounded-none border-0 p-0"
    >
      <DialogTitle className="sr-only">{device?.deviceName ?? 'Workspace thiết bị'}</DialogTitle>
      <DialogDescription className="sr-only">Workspace vận hành thiết bị gồm thiết bị, xe, cảnh báo, vùng và dữ liệu runtime trong cùng một modal toàn màn hình.</DialogDescription>

      <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_32%)]">
        <header className="border-b border-border/70 bg-background/88 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-xl font-semibold">{device?.vehiclePlate ?? device?.deviceName ?? 'Workspace thiết bị'}</p>
                {device?.currentStatus ? <Badge variant="outline">{device.currentStatus}</Badge> : null}
                {device?.lastSeenAt ? <Badge variant="secondary">Cập nhật {formatRelative(device.lastSeenAt)}</Badge> : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">{device?.deviceName ?? '-'} · {device?.deviceId ?? '-'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.length > 0 ? <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Button> : null}
              <Button variant="outline" onClick={() => setExportOpen(true)}>Xuất dữ liệu</Button>
              <Button variant="outline" disabled={isRefreshing} onClick={async () => { setIsRefreshing(true); try { await onRefresh(); } finally { setIsRefreshing(false); } }}>
                <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Đang làm mới...' : 'Làm mới'}
              </Button>
              <Button onClick={() => onOpenChange(false)}>Đóng</Button>
            </div>
          </div>
        </header>

        <div className="border-b border-border/60 bg-background/72 px-4 py-3 backdrop-blur sm:px-6 xl:hidden">
          <WorkspaceOverviewQuickStats variant="compact" />
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[17rem] shrink-0 border-r border-border/70 bg-background/72 p-3 backdrop-blur-lg md:flex md:flex-col">
            <div className="space-y-2">
              {sections.map((item) => {
                const Icon = item.icon;
                return (
                  <Button key={item.value} variant={activeSection === item.value ? 'default' : 'ghost'} className="h-11 w-full justify-start rounded-2xl" onClick={() => setSection(item.value)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </aside>

          <main className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border/60 bg-background/72 px-4 py-3 backdrop-blur md:hidden">
              <Select value={activeSection} onValueChange={(value) => setSection(value as DeviceWorkspaceSection)}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="Chọn phần hiển thị" /></SelectTrigger>
                <SelectContent>{sections.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6', activeSection === 'route' || activeSection === 'raw' ? 'overflow-hidden' : '')}>
              {loading ? <DeviceDetailSkeleton /> : error ? <ErrorBox description={error.message} /> : <DeviceWorkspaceCanvas activeSection={activeSection} fallbackPaths={fallbackPaths} highlight={highlight} workspaceActions={workspaceActions} />}
            </div>
          </main>

          <aside className="hidden w-[22rem] shrink-0 border-l border-border/70 bg-background/72 p-4 backdrop-blur-lg xl:flex xl:flex-col">
              <div className="space-y-4">
                <WorkspaceOverviewQuickStats />

                <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
                  <p className="text-sm font-semibold">Liên kết nhanh</p>
                  <div className="mt-3 grid gap-2">
                    {fallbackPaths.vehicleDetailPath ? <Button asChild variant="outline"><Link href={fallbackPaths.vehicleDetailPath}>Hồ sơ xe <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button> : null}
                    {fallbackPaths.alertsPath ? <Button asChild variant="outline"><Link href={fallbackPaths.alertsPath}>Queue cảnh báo <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button> : null}
                    <Button asChild variant="outline"><Link href={fallbackPaths.geofencesPath}>Trang vùng <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
                  </div>
                </div>
              </div>
          </aside>
        </div>
      </div>

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} deviceId={device?.deviceId} />
    </DialogContent>
  );
};
