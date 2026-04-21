'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useActivateSystemSetting,
  useCreateSystemSetting,
  useDeleteSystemSetting,
  useRollbackSystemSetting,
  useSystemAdminSettings,
  useSystemSettingRevisions,
  useUpdateSystemSetting,
  useValidateSystemSetting,
} from '@/features/system-admin/hooks/use-system-admin';
import { systemAdminServices } from '@/lib/api/system-admin';
import { useRoleAccess } from '@/hooks/use-role-access';
import { formatDateTime } from '@/lib/utils/date/format';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import {
  formatSettingValue,
  inferVmSettingResource,
  isVictoriaMetricsSetting,
  parseSettingValue,
  VICTORIA_METRICS_GROUP,
} from './victoria-metrics-settings.utils';

export const VictoriaMetricsSettingsPanel = () => {
  const access = useRoleAccess();
  const settingsQuery = useSystemAdminSettings(true);
  const createSetting = useCreateSystemSetting();
  const updateSetting = useUpdateSystemSetting();
  const deleteSetting = useDeleteSystemSetting();
  const validateSetting = useValidateSystemSetting();
  const activateSetting = useActivateSystemSetting();
  const rollbackSetting = useRollbackSystemSetting();

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingRevision, setEditingRevision] = useState<number | undefined>(undefined);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [selectedRevisionKey, setSelectedRevisionKey] = useState<string | null>(null);

  const revisionsQuery = useSystemSettingRevisions(selectedRevisionKey, 20);
  const selectedRevisions = useMemo(
    () => (revisionsQuery.data ?? []).filter((item) => item.settingKey === selectedRevisionKey),
    [revisionsQuery.data, selectedRevisionKey],
  );

  const getLoadedLatestRevision = (key: string): number | undefined =>
    selectedRevisionKey === key ? selectedRevisions[0]?.revision : undefined;

  const getConflictAwareMessage = (error: unknown, fallback: string): string => {
    const message = getApiErrorMessage(error, fallback);
    if (message.toLowerCase().includes('stale revision')) {
      return 'Conflict stale revision. Vui lòng tải revision mới nhất rồi thử lại.';
    }
    return message;
  };

  const ensureLatestRevision = async (key: string): Promise<number> => {
    const loadedRevision = getLoadedLatestRevision(key);
    if (loadedRevision) {
      return loadedRevision;
    }

    setSelectedRevisionKey(key);
    const payload = await systemAdminServices.listSettingRevisions(key, { limit: 1 });
    const latest = payload.revisions[0]?.revision;
    if (!latest) {
      throw new Error('Chưa có revision khả dụng cho cấu hình này.');
    }
    return latest;
  };

  useEffect(() => {
    if (!editingKey) {
      return;
    }
    const latestRevision = selectedRevisions[0]?.revision;
    if (latestRevision) {
      setEditingRevision(latestRevision);
    }
  }, [editingKey, selectedRevisions]);

  const settings = useMemo(
    () => (settingsQuery.data ?? []).filter(isVictoriaMetricsSetting),
    [settingsQuery.data],
  );

  const createIdempotencyKey = (scope: string) => {
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
      return `${scope}:${globalThis.crypto.randomUUID()}`;
    }
    return `${scope}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  };

  const handleCreate = () => {
    const key = newKey.trim();
    if (!key) {
      notificationUtils.error('Thiếu khóa cấu hình', 'Vui lòng nhập key cho cấu hình VictoriaMetrics.');
      return;
    }

    createSetting.mutate(
      {
        key,
        value: parseSettingValue(newValue),
        description: newDescription.trim() || undefined,
        groupName: VICTORIA_METRICS_GROUP,
        resource: inferVmSettingResource(key),
        idempotencyKey: createIdempotencyKey(`${key}:create`),
      },
      {
        onSuccess: () => {
          notificationUtils.success('Đã tạo cấu hình VictoriaMetrics');
          setNewKey('');
          setNewValue('');
          setNewDescription('');
        },
        onError: (error) => {
          notificationUtils.error(
            'Tạo cấu hình thất bại',
            getApiErrorMessage(error, 'Không thể tạo cấu hình mới.'),
          );
        },
      },
    );
  };

  const handleUpdate = () => {
    if (!editingKey) {
      return;
    }

    if (!editingRevision) {
      notificationUtils.error('Thiếu revision', 'Vui lòng chọn lại cấu hình sau khi revision đã tải xong.');
      return;
    }

    updateSetting.mutate(
      {
        key: editingKey,
        payload: {
          value: parseSettingValue(editingValue),
          expectedRevision: editingRevision,
          resource: inferVmSettingResource(editingKey),
          idempotencyKey: createIdempotencyKey(`${editingKey}:update`),
        },
      },
      {
        onSuccess: () => {
          notificationUtils.success('Đã cập nhật cấu hình');
          setEditingKey(null);
          setEditingValue('');
          setEditingRevision(undefined);
        },
        onError: (error) => {
          notificationUtils.error(
            'Cập nhật cấu hình thất bại',
            getConflictAwareMessage(error, 'Không thể cập nhật cấu hình đã chọn.'),
          );
        },
      },
    );
  };

  const handleValidate = (key: string) => {
    validateSetting.mutate(
      { key, resource: inferVmSettingResource(key) },
      {
        onSuccess: (result) => {
          if (result.valid) {
            notificationUtils.success(
              'Validate thành công',
              `Blast radius: ${result.blastRadius.affectsTenants} tenant, ${result.blastRadius.affectedRulePacks} rule packs.`,
            );
          } else {
            notificationUtils.error('Validate thất bại', result.errors.join(' | '));
          }
        },
        onError: (error) => {
          notificationUtils.error(
            'Validate thất bại',
            getApiErrorMessage(error, 'Không thể validate cấu hình đã chọn.'),
          );
        },
      },
    );
  };

  const handleActivate = async (key: string) => {
    let expectedRevision: number;
    try {
      expectedRevision = await ensureLatestRevision(key);
    } catch (error) {
      notificationUtils.error(
        'Thiếu revision',
        getApiErrorMessage(error, 'Vui lòng tải revision trước khi activate.'),
      );
      return;
    }

    activateSetting.mutate(
      {
        key,
        payload: {
          expectedRevision,
          resource: inferVmSettingResource(key),
          idempotencyKey: createIdempotencyKey(`${key}:activate:${expectedRevision}`),
        },
      },
      {
        onSuccess: () => {
          notificationUtils.success('Đã activate cấu hình');
        },
        onError: (error) => {
          notificationUtils.error(
            'Activate thất bại',
            getConflictAwareMessage(error, 'Không thể activate cấu hình đã chọn.'),
          );
        },
      },
    );
  };

  const handleRollback = async (key: string, targetRevision: number) => {
    let expectedRevision: number;
    try {
      expectedRevision = await ensureLatestRevision(key);
    } catch (error) {
      notificationUtils.error(
        'Thiếu revision',
        getApiErrorMessage(error, 'Vui lòng tải revision trước khi rollback.'),
      );
      return;
    }

    rollbackSetting.mutate(
      {
        key,
        payload: {
          targetRevision,
          expectedRevision,
          idempotencyKey: createIdempotencyKey(`${key}:rollback:${targetRevision}:${expectedRevision}`),
        },
      },
      {
        onSuccess: () => {
          notificationUtils.success('Rollback thành công');
        },
        onError: (error) => {
          notificationUtils.error(
            'Rollback thất bại',
            getConflictAwareMessage(error, 'Không thể rollback cấu hình đã chọn.'),
          );
        },
      },
    );
  };

  const handleDelete = async () => {
    if (!deletingKey) {
      return;
    }

    let expectedRevision: number;
    try {
      expectedRevision = await ensureLatestRevision(deletingKey);
    } catch (error) {
      notificationUtils.error(
        'Thiếu revision',
        getApiErrorMessage(error, 'Vui lòng tải revision trước khi xóa.'),
      );
      return;
    }

    deleteSetting.mutate(
      {
        key: deletingKey,
        expectedRevision,
        resource: inferVmSettingResource(deletingKey),
        idempotencyKey: createIdempotencyKey(`${deletingKey}:delete:${expectedRevision}`),
      },
      {
        onSuccess: () => {
          notificationUtils.success('Đã xóa cấu hình');
          setDeletingKey(null);
        },
        onError: (error) => {
          notificationUtils.error(
            'Xóa cấu hình thất bại',
            getConflictAwareMessage(error, 'Không thể xóa cấu hình đã chọn.'),
          );
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình VictoriaMetrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[220px_1fr]">
          <Input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="key (vd: victoriametrics.url)" />
          <Textarea value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder='value (JSON hoặc text, vd: "http://tracking-victoria-metrics:8428")' className="min-h-[100px]" />
          <Input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Mô tả cấu hình (không bắt buộc)" className="lg:col-span-2" />
          <Button
            onClick={handleCreate}
            disabled={createSetting.isPending || !access.canSystemAdminManage}
            className="w-fit lg:col-span-2"
          >
            {createSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Tạo cấu hình
          </Button>
        </CardContent>
      </Card>

      {editingKey ? (
        <Card>
          <CardHeader>
            <CardTitle>Chỉnh sửa: {editingKey}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={editingValue} onChange={(event) => setEditingValue(event.target.value)} className="min-h-[120px]" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleUpdate} disabled={updateSetting.isPending || !access.canSystemAdminManage}>
                {updateSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingKey(null);
                  setEditingRevision(undefined);
                }}
                disabled={updateSetting.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Hủy
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Revision history
              </p>
              {revisionsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Đang tải revision...</p>
              ) : selectedRevisions.length > 0 ? (
                <div className="space-y-2">
                  {selectedRevisions.map((revision) => (
                    <div key={revision.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1">
                      <span className="text-xs">
                        r{revision.revision} · {revision.action} · {formatDateTime(revision.createdAt)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void handleRollback(revision.settingKey, revision.revision);
                        }}
                        disabled={rollbackSetting.isPending || !access.canSystemAdminRollback}
                      >
                        Rollback
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Chưa có revision.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách cấu hình hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {settingsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải cấu hình VictoriaMetrics...</div>
          ) : settings.length > 0 ? (
            settings.map((setting) => (
              <div key={setting.key} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{setting.key}</p>
                    <p className="text-xs text-muted-foreground">
                      Cập nhật: {setting.updatedAt ? formatDateTime(setting.updatedAt) : 'Chưa có dữ liệu'}
                    </p>
                    {setting.description ? (
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingKey(setting.key);
                        setEditingValue(formatSettingValue(setting.value));
                        setSelectedRevisionKey(setting.key);
                        setEditingRevision(undefined);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleValidate(setting.key)}
                      disabled={validateSetting.isPending || !access.canSystemAdminManage}
                    >
                      Validate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleActivate(setting.key);
                      }}
                      disabled={activateSetting.isPending || !access.canSystemAdminActivate}
                    >
                      Activate
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedRevisionKey(setting.key);
                        setDeletingKey(setting.key);
                      }}
                      disabled={!access.canSystemAdminDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xóa
                    </Button>
                  </div>
                </div>
                <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
                  {formatSettingValue(setting.value)}
                </pre>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Chưa có cấu hình VictoriaMetrics trong `system_settings`.
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deletingKey)}
        onCancel={() => setDeletingKey(null)}
        onConfirm={() => {
          void handleDelete();
        }}
        title="Xóa cấu hình"
        description={`Bạn có chắc muốn xóa cấu hình ${deletingKey ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteSetting.isPending}
      />
    </div>
  );
};
