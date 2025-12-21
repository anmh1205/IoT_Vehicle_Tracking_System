'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsSidebarProps {
  activeTab: 'general' | 'notifications' | 'appearance' | 'security' | 'system';
  onTabChange: (tab: 'general' | 'notifications' | 'appearance' | 'security' | 'system') => void;
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <TabsList className='flex flex-wrap'>
      <TabsTrigger value='general' onClick={() => onTabChange('general')}>
        Chung
      </TabsTrigger>
      <TabsTrigger value='notifications' onClick={() => onTabChange('notifications')}>
        Thông báo
      </TabsTrigger>
      <TabsTrigger value='appearance' onClick={() => onTabChange('appearance')}>
        Giao diện
      </TabsTrigger>
      <TabsTrigger value='security' onClick={() => onTabChange('security')}>
        Bảo mật
      </TabsTrigger>
      <TabsTrigger value='system' onClick={() => onTabChange('system')}>
        Hệ thống
      </TabsTrigger>
    </TabsList>
  );
}

