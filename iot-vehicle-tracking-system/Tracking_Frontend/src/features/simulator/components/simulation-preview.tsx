'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SimulatorPayload } from '@/features/simulator/hooks/use-simulator';
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
          <CardTitle className="text-sm">Next payload preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded bg-muted p-3 text-xs">
            {preview ? JSON.stringify(preview, null, 2) : 'No payload yet'}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sent history</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-2">
              {history.map((item, index) => (
                <pre
                  key={`${item.deviceId}-${item.timestamp}-${index}`}
                  className="rounded bg-muted p-2 text-xs"
                >
                  {JSON.stringify(item)}
                </pre>
              ))}
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payload sent yet.</p>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
