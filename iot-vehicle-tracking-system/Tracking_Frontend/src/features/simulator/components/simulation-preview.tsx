'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SimulatorPayload } from '@/features/simulator/hooks/use-simulator';

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

export const SimulationPreview = ({
  preview,
  history,
}: {
  preview: SimulatorPayload | null;
  history: SimulatorPayload[];
}) => {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Xem trước payload kế tiếp</CardTitle>
        </CardHeader>
        <CardContent>
          {preview ? (
            <pre className="overflow-auto rounded bg-muted p-3 text-xs">{prettyJson(preview)}</pre>
          ) : (
            <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
              Chưa có payload để xem trước.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lịch sử đã gửi</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-2">
              {history.map((item, index) => (
                <div
                  key={`${item.deviceId}-${item.timestamp}-${index}`}
                  className="rounded border bg-muted/20 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.deviceId}</span>
                    <span>{new Date(item.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                  <pre className="overflow-auto text-xs">{prettyJson(item)}</pre>
                </div>
              ))}
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa gửi payload nào.</p>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
