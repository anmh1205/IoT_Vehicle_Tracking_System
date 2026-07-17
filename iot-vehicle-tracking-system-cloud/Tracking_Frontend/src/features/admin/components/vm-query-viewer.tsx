'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const prettyJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

export const VMQueryViewer = ({
  data,
  onRun,
}: {
  data: unknown;
  onRun: (query: string) => void;
}) => {
  const [query, setQuery] = useState('up');

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Truy vấn VictoriaMetrics</p>
        <Textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ví dụ: avg_over_time(tracker_telemetry_speed[15m])"
          spellCheck={false}
        />
      </div>
      <Button onClick={() => onRun(query)}>Chạy truy vấn</Button>
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Kết quả trả về</p>
          <p className="text-xs text-muted-foreground">Hiển thị JSON đã format</p>
        </div>
        <pre className="max-h-[360px] overflow-auto rounded bg-background p-3 text-xs">
          {prettyJson(data)}
        </pre>
      </div>
    </div>
  );
};
