// Browser desktop notification utility using the Notification API
// Shows native OS notifications for alerts when the tab is not focused

let permissionGranted = false;

/** Request notification permission on first call */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
};

/** Show a browser desktop notification */
export const showBrowserNotification = (title: string, options?: NotificationOptions): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Only show when tab is not focused to avoid duplicates with in-app toasts
  if (document.hasFocus()) return;

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Silent fail — notifications not supported in this context
  }
};

/** Severity-based notification helper for alerts */
export const showAlertNotification = (payload: {
  title?: string;
  severity?: string;
  vehicleId?: string;
  alertType?: string;
}): void => {
  const severityLabels: Record<string, string> = {
    critical: '🔴 Nghiêm trọng',
    high: '🟠 Cao',
    medium: '🟡 Trung bình',
    low: '🟢 Thấp',
  };

  const severity = severityLabels[payload.severity ?? 'medium'] ?? 'Cảnh báo';
  const title = `${severity}: ${payload.title ?? payload.alertType ?? 'Cảnh báo mới'}`;
  const body = payload.vehicleId ? `Phương tiện: ${payload.vehicleId}` : undefined;

  showBrowserNotification(title, { body, tag: 'alert' });
};
