'use client';

import { ActionImpl } from 'kbar';

interface ResultItemProps {
  action: ActionImpl;
  active: boolean;
  currentRootActionId: string;
}

export default function ResultItem({ action, active }: ResultItemProps) {
  return (
    <div
      className={`flex items-center justify-between border-b px-4 py-3 text-sm ${active ? 'bg-muted' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{action.name}</div>
        {action.subtitle ? <div className="truncate text-xs text-muted-foreground">{action.subtitle}</div> : null}
      </div>
      {action.shortcut?.length ? (
        <div className="ml-2 flex gap-1">
          {action.shortcut.map((key) => (
            <kbd key={key} className="rounded border bg-background px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              {key}
            </kbd>
          ))}
        </div>
      ) : null}
    </div>
  );
}
