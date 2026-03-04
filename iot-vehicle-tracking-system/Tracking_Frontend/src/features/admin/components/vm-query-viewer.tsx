'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
export const VMQueryViewer = ({
  data,
  onRun,
}: {
  data: unknown;
  onRun: (query: string) => void;
}) => {
  const [query, setQuery] = useState('up');
  return (
    <div className="space-y-2">
      <Textarea value={query} onChange={(e) => setQuery(e.target.value)} />
      <Button onClick={() => onRun(query)}>Chạy truy vấn</Button>
      <pre className="max-h-[360px] overflow-auto rounded border p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
