import { authServices } from '@/lib/api/auth';
import { clearNativeAuthToken } from '@/lib/native-auth';
import { unregisterNativePushToken } from '@/lib/native-push';
import { useAuthStore } from '@/lib/stores/auth-store';

export type SignOutReason =
  | 'signed-out'
  | 'server-revocation-unconfirmed'
  | 'native-credential-clear-unconfirmed'
  | 'logout-incomplete';

/**
 * Always clear web auth state, even when the server or secure storage cannot
 * be reached. Report incomplete revocation/deletion instead of claiming that
 * the session was fully terminated.
 */
export const signOutSession = async (): Promise<SignOutReason> => {
  try {
    await unregisterNativePushToken();
  } catch {
    // Push cleanup is independent of authentication revocation.
  }

  const [server, native] = await Promise.allSettled([
    authServices.logout(),
    clearNativeAuthToken(),
  ]);
  useAuthStore.getState().clearAuth();

  if (server.status === 'rejected' && native.status === 'rejected') return 'logout-incomplete';
  if (server.status === 'rejected') return 'server-revocation-unconfirmed';
  if (native.status === 'rejected') return 'native-credential-clear-unconfirmed';
  return 'signed-out';
};
