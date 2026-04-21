'use client';

import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { NotificationSettings } from '@/lib/api/auth';

const trimValue = (value: string | null | undefined) => value?.trim() ?? '';
const emphasisSwitchClassName =
  'data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-300 dark:data-[state=checked]:bg-emerald-500 dark:data-[state=unchecked]:bg-slate-700';

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

  const discordWebhook = trimValue(value.channels.discord.webhookUrl);
  const telegramBotToken = trimValue(value.channels.telegram.botToken);
  const telegramChatId = trimValue(value.channels.telegram.chatId);
  const discordInvalid = value.channels.discord.enabled && discordWebhook.length === 0;
  const telegramInvalid =
    value.channels.telegram.enabled && (telegramBotToken.length === 0 || telegramChatId.length === 0);
  const hasValidationError = discordInvalid || telegramInvalid;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">Cảnh báo email</p>
              <p className="text-sm text-muted-foreground">
                Nhận tóm tắt và cảnh báo qua email cho các sự kiện quan trọng.
              </p>
            </div>
            <Switch
              aria-label="Bật cảnh báo email"
              className={emphasisSwitchClassName}
              checked={value.emailAlerts}
              onCheckedChange={(checked) => onChange({ ...value, emailAlerts: checked })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">Cảnh báo đẩy</p>
              <p className="text-sm text-muted-foreground">
                Bật thông báo thời gian thực trong giao diện vận hành.
              </p>
            </div>
            <Switch
              aria-label="Bật cảnh báo đẩy"
              className={emphasisSwitchClassName}
              checked={value.pushAlerts}
              onCheckedChange={(checked) => onChange({ ...value, pushAlerts: checked })}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section
          className={`rounded-2xl border p-4 transition-colors ${
            discordInvalid ? 'border-destructive/60 bg-destructive/5' : 'border-border/60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">Discord</p>
                <Badge variant={value.channels.discord.enabled ? 'default' : 'outline'}>
                  {value.channels.discord.enabled ? 'Đang bật' : 'Đang tắt'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Kết nối webhook để đẩy cảnh báo vào kênh Discord của đội vận hành.
              </p>
            </div>
            <Switch
              aria-label="Bật thông báo Discord"
              className={emphasisSwitchClassName}
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

          {value.channels.discord.enabled ? (
            <div className="mt-4 space-y-3">
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
                />
                <p className="text-xs text-muted-foreground">
                  Bắt buộc. Hệ thống sẽ dùng webhook này để gửi alert sau khi đã lưu cấu hình.
                </p>
                {discordInvalid ? (
                  <p className="text-xs font-medium text-destructive">
                    Discord đang bật nên webhook URL không được để trống.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Bật kênh này để hiện form cấu hình webhook theo đúng yêu cầu vận hành.
            </p>
          )}
        </section>

        <section
          className={`rounded-2xl border p-4 transition-colors ${
            telegramInvalid ? 'border-destructive/60 bg-destructive/5' : 'border-border/60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">Telegram bot</p>
                <Badge variant={value.channels.telegram.enabled ? 'default' : 'outline'}>
                  {value.channels.telegram.enabled ? 'Đang bật' : 'Đang tắt'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Gửi thông báo qua bot Telegram và chat riêng của nhóm vận hành.
              </p>
            </div>
            <Switch
              aria-label="Bật thông báo Telegram bot"
              className={emphasisSwitchClassName}
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

          {value.channels.telegram.enabled ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
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
                />
                <p className="text-xs text-muted-foreground">Bắt buộc để Telegram bot có thể gửi bản tin.</p>
              </div>

              <div className="space-y-2 sm:col-span-2">
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
                />
                <p className="text-xs text-muted-foreground">Bắt buộc. Có thể là chat cá nhân, group hoặc channel.</p>
              </div>

              {telegramInvalid ? (
                <p className="sm:col-span-2 text-xs font-medium text-destructive">
                  Telegram đang bật nên bot token và chat ID phải được nhập đầy đủ.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Bật kênh này để hiện form token bot và chat ID thay vì chỉ lưu một toggle rỗng.
            </p>
          )}
        </section>
      </div>

      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
      {hasValidationError ? (
        <p className="text-sm font-medium text-destructive">
          Hoàn thiện cấu hình các kênh đang bật trước khi lưu.
        </p>
      ) : null}

      <Button onClick={onSubmit} disabled={isPending || hasValidationError}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Lưu tùy chọn thông báo
      </Button>
    </div>
  );
};
