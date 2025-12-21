'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { notificationUtils } from '@/lib/notification';
import { SettingsHeader } from './components/SettingsHeader';
import { SettingsSidebar } from './components/SettingsSidebar';
import { GeneralSettingsTab } from './components/GeneralSettingsTab';
import { NotificationsSettingsTab } from './components/NotificationsSettingsTab';
import { AppearanceSettingsTab } from './components/AppearanceSettingsTab';
import { SecuritySettingsTab } from './components/SecuritySettingsTab';
import { SystemSettingsTab } from './components/SystemSettingsTab';

type SettingsState = {
  autoRefresh: boolean;
  refreshInterval: number;
  language: string;
  timezone: string;
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
  alertLevels: string[];
  theme: string;
  compactMode: boolean;
  showAnimations: boolean;
  sessionTimeout: number;
  requirePasswordChange: boolean;
  twoFactorAuth: boolean;
  logLevel: string;
  maxLogSize: number;
  backupEnabled: boolean;
};

const defaultSettings: SettingsState = {
  autoRefresh: true,
  refreshInterval: 10,
  language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  emailAlerts: true,
  smsAlerts: false,
  pushNotifications: true,
  alertLevels: ['error', 'warning'],
  theme: 'light',
  compactMode: false,
  showAnimations: true,
  sessionTimeout: 30,
  requirePasswordChange: false,
  twoFactorAuth: false,
  logLevel: 'info',
  maxLogSize: 100,
  backupEnabled: true
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [activeTab, setActiveTab] = useState<
    'general' | 'notifications' | 'appearance' | 'security' | 'system'
  >('general');
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<SettingsState>) => setSettings((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    notificationUtils.success('Đã lưu cài đặt');
  };

  const resetAll = () => {
    setSettings(defaultSettings);
    notificationUtils.success('Đã khôi phục mặc định');
  };

  return (
    <PageContainer pageTitle='Cài đặt' pageDescription='Cấu hình hệ thống và ứng dụng' scrollable>
      <SettingsHeader saving={saving} onSave={handleSave} onReset={resetAll} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <TabsContent value='general' className='mt-4'>
          <GeneralSettingsTab
            settings={{
              autoRefresh: settings.autoRefresh,
              refreshInterval: settings.refreshInterval,
              language: settings.language,
              timezone: settings.timezone
            }}
            onSettingsChange={update}
          />
        </TabsContent>

        <TabsContent value='notifications' className='mt-4'>
          <NotificationsSettingsTab
            settings={{
              emailAlerts: settings.emailAlerts,
              smsAlerts: settings.smsAlerts,
              pushNotifications: settings.pushNotifications,
              alertLevels: settings.alertLevels
            }}
            onSettingsChange={update}
          />
        </TabsContent>

        <TabsContent value='appearance' className='mt-4'>
          <AppearanceSettingsTab
            settings={{
              theme: settings.theme,
              compactMode: settings.compactMode,
              showAnimations: settings.showAnimations
            }}
            onSettingsChange={update}
          />
        </TabsContent>

        <TabsContent value='security' className='mt-4'>
          <SecuritySettingsTab
            settings={{
              sessionTimeout: settings.sessionTimeout,
              requirePasswordChange: settings.requirePasswordChange,
              twoFactorAuth: settings.twoFactorAuth
            }}
            onSettingsChange={update}
          />
        </TabsContent>

        <TabsContent value='system' className='mt-4'>
          <SystemSettingsTab
            settings={{
              logLevel: settings.logLevel,
              maxLogSize: settings.maxLogSize,
              backupEnabled: settings.backupEnabled
            }}
            onSettingsChange={update}
            saving={saving}
            onSave={handleSave}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
