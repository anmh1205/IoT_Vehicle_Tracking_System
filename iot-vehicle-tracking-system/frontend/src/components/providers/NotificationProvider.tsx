"use client";

import { Toaster } from "@/components/ui/sonner";

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

