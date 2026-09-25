import { notificationServices } from '@/lib/api/notifications';

interface NativeBridgeApi {
  getFcmToken?: () => Promise<string | null>;
  getDeviceInfo?: () => Promise<Record<string, unknown>>;
}

declare global {
  interface Window {
    NativeBridge?: NativeBridgeApi;
  }
}

const getNativeBridge = (): NativeBridgeApi | undefined =>
  typeof window === 'undefined' ? undefined : window.NativeBridge;

export const syncNativePushToken = async (tokenOverride?: string): Promise<void> => {
  const bridge = getNativeBridge();
  if (!bridge) return;

  const token = tokenOverride ?? (await bridge.getFcmToken?.());
  if (!token) return;

  const deviceInfo = (await bridge.getDeviceInfo?.()) ?? undefined;
  await notificationServices.registerPushToken(token, deviceInfo);
};

export const unregisterNativePushToken = async (): Promise<void> => {
  const bridge = getNativeBridge();
  const token = await bridge?.getFcmToken?.();
  if (!token) return;

  await notificationServices.unregisterPushToken(token);
};
