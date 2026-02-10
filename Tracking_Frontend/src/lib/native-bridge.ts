/**
 * Native Bridge - Interface between the Next.js web app and the Flutter shell.
 *
 * When the app runs inside the Flutter WebView, `window.NativeBridge` is injected
 * by the Dart JS bridge. This module provides typed wrappers and web fallbacks
 * so the frontend code works identically in both browser and native contexts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NativeBridgeAPI {
  isNativeApp: () => boolean;
  showNotification: (title: string, body: string) => void;
  saveToken: (token: string) => void;
  getDeviceInfo: () => Promise<DeviceInfo>;
  logout: () => void;
  getCurrentLocation: () => Promise<LocationResult>;
  getFcmToken: () => Promise<string | null>;
}

interface DeviceInfo {
  platform: 'ios' | 'android';
  isNativeApp: boolean;
  appVersion: string;
}

interface LocationResult {
  latitude: number;
  longitude: number;
  available: boolean;
}

// Extend Window to include the bridge injected by Flutter
declare global {
  interface Window {
    NativeBridge?: NativeBridgeAPI;
    __NATIVE_AUTH_TOKEN__?: string;
  }
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Returns `true` when running inside the Flutter WebView shell. */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!window.NativeBridge?.isNativeApp();
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/** Pass the session token to the native shell for secure storage. */
export function registerNativeToken(token: string): void {
  if (!isNativeApp()) return;
  window.NativeBridge!.saveToken(token);
}

/** Read a token that the native shell injected on page load (if any). */
export function getNativeAuthToken(): string | undefined {
  return window.__NATIVE_AUTH_TOKEN__ ?? undefined;
}

// ---------------------------------------------------------------------------
// FCM
// ---------------------------------------------------------------------------

/** Retrieve the FCM push token stored by the native shell. */
export async function getFCMToken(): Promise<string | null> {
  if (!isNativeApp()) return null;
  return window.NativeBridge!.getFcmToken();
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * Show a notification via the native shell, falling back to the
 * Web Notification API when running in a regular browser.
 */
export function showNativeNotification(title: string, body: string): void {
  if (isNativeApp()) {
    window.NativeBridge!.showNotification(title, body);
    return;
  }

  // Web fallback
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// ---------------------------------------------------------------------------
// Device Info
// ---------------------------------------------------------------------------

/** Get device info from the native shell. Returns null in browser. */
export async function getDeviceInfo(): Promise<DeviceInfo | null> {
  if (!isNativeApp()) return null;
  return window.NativeBridge!.getDeviceInfo();
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

/** Request current GPS location from the native shell. */
export async function getCurrentLocation(): Promise<LocationResult | null> {
  if (!isNativeApp()) return null;
  return window.NativeBridge!.getCurrentLocation();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Trigger native logout (clears secure storage in the Flutter shell). */
export function nativeLogout(): void {
  if (!isNativeApp()) return;
  window.NativeBridge!.logout();
}

// ---------------------------------------------------------------------------
// Bridge Ready Event
// ---------------------------------------------------------------------------

/**
 * Register a callback that fires when the native bridge becomes available.
 * If the bridge is already present, the callback fires immediately.
 */
export function onNativeBridgeReady(callback: () => void): void {
  if (typeof window === 'undefined') return;

  if (window.NativeBridge) {
    callback();
    return;
  }

  window.addEventListener('NativeBridgeReady', callback, { once: true });
}
