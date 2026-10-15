/**
 * Native credential persistence for the trusted Flutter WebView shell.
 * Ordinary browsers have no native bridge and use the existing web session.
 * A detected native shell must acknowledge storage writes/deletes: the UI must
 * not silently claim that native credentials were saved or removed on failure.
 */
export interface NativeAuthBridge {
  isNativeApp?: () => boolean;
  saveToken?: (token: string) => Promise<unknown>;
  logout?: () => Promise<unknown>;
}

const getBridge = (): NativeAuthBridge | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { NativeBridge?: NativeAuthBridge }).NativeBridge;
};

const hasNativeShell = (bridge: NativeAuthBridge | undefined): boolean =>
  bridge?.isNativeApp?.() === true;

export const saveNativeAuthToken = async (
  token: string,
  bridge: NativeAuthBridge | undefined = getBridge(),
): Promise<void> => {
  if (!hasNativeShell(bridge)) return;
  if (typeof bridge?.saveToken !== 'function') {
    throw new Error('Native credential storage is unavailable');
  }
  await bridge.saveToken(token);
};

export const clearNativeAuthToken = async (
  bridge: NativeAuthBridge | undefined = getBridge(),
): Promise<void> => {
  if (!hasNativeShell(bridge)) return;
  if (typeof bridge?.logout !== 'function') {
    throw new Error('Native credential deletion is unavailable');
  }
  await bridge.logout();
};
