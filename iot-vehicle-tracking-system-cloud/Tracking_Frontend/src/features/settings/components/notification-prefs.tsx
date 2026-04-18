'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { NotificationSettings } from '@/lib/api/auth';

export const NotificationPrefs = ({
  value,
  onChange,
  isLoading,
  isPending,
  statusMessage,
  onSubmit,
}: {
  value: NotificationSettings;
  onChange: (next: NotificationSettings) => void;
  isLoading?: boolean;
  isPending?: boolean;
  statusMessage?: string | null;
  onSubmit: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải tùy chọn thông báo...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
          <div className="space-y-1">
            <p className="font-medium">Cảnh báo email</p>
            <p className="text-sm text-muted-foreground">
              Nhận tóm tắt và cảnh báo qua email cho các sự kiện quan trọng.
            </p>
          </div>
          <Switch
            checked={value.emailAlerts}
            onCheckedChange={(checked) => onChange({ ...value, emailAlerts: checked })}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
          <div className="space-y-1">
            <p className="font-medium">Cảnh báo đẩy</p>
            <p className="text-sm text-muted-foreground">
              Bật thông báo thời gian thực trong giao diện vận hành.
            </p>
          </div>
          <Switch
            checked={value.pushAlerts}
            onCheckedChange={(checked) => onChange({ ...value, pushAlerts: checked })}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Discord</p>
              <p className="text-sm text-muted-foreground">Kết nối webhook để đẩy cảnh báo vào kênh Discord.</p>
            </div>
            <Switch
              checked={value.channels.discord.enabled}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  channels: {
                    ...value.channels,
                    discord: {
                      ...value.channels.discord,
                      enabled: checked,
                    },
                  },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-discord-webhook">Discord webhook URL</Label>
            <Input
              id="settings-discord-webhook"
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={value.channels.discord.webhookUrl ?? ''}
              onChange={(event) =>
                onChange({
                  ...value,
                  channels: {
                    ...value.channels,
                    discord: {
                      ...value.channels.discord,
                      webhookUrl: event.target.value,
                    },
                  },
                })
              }
              disabled={!value.channels.discord.enabled}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Telegram</p>
              <p className="text-sm text-muted-foreground">
                Gửi thông báo qua bot Telegram và chat riêng của nhóm vận hành.
              </p>
            </div>
            <Switch
              checked={value.channels.telegram.enabled}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  channels: {
                    ...value.channels,
                    telegram: {
                      ...value.channels.telegram,
                      enabled: checked,
                    },
                  },
                })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-telegram-bot-token">Telegram bot token</Label>
              <Input
                id="settings-telegram-bot-token"
                type="password"
                placeholder="123456789:AA..."
                value={value.channels.telegram.botToken ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    channels: {
                      ...value.channels,
                      telegram: {
                        ...value.channels.telegram,
                        botToken: event.target.value,
                      },
                    },
                  })
                }
                disabled={!value.channels.telegram.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-telegram-chat-id">Telegram chat ID</Label>
              <Input
                id="settings-telegram-chat-id"
                placeholder="-1001234567890"
                value={value.channels.telegram.chatId ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    channels: {
                      ...value.channels,
                      telegram: {
                        ...value.channels.telegram,
                        chatId: event.target.value,
                      },
                    },
                  })
                }
                disabled={!value.channels.telegram.enabled}
              />
            </div>
          </div>
        </div>
      </div>

      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}

      <Button onClick={onSubmit} disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Lưu tùy chọn thông báo
      </Button>
    </div>
  );
};
