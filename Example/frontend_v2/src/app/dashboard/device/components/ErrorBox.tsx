'use client';

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'>
      {message}
    </div>
  );
}

