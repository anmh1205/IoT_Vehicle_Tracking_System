"use client";
import React from "react";
import QueryProvider from "@/components/providers/QueryProvider";
import RealtimeProvider from "@/components/providers/RealtimeProvider";
import NotificationProvider from "@/components/providers/NotificationProvider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default function Providers({
  activeThemeValue,
  children,
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RealtimeProvider>
          <NotificationProvider>
            {children}
            <Toaster position="top-right" richColors />
          </NotificationProvider>
        </RealtimeProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

