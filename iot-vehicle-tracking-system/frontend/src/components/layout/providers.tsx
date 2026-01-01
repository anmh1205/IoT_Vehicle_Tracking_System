"use client";
import React from "react";
import QueryProvider from "@/components/providers/QueryProvider";
import RealtimeProvider from "@/components/providers/RealtimeProvider";
import NotificationProvider from "@/components/providers/NotificationProvider";

export default function Providers({
  activeThemeValue,
  children,
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <RealtimeProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </RealtimeProvider>
    </QueryProvider>
  );
}

