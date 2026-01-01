/**
 * Navigation Configuration
 */
export interface NavItem {
  title: string;
  url: string;
  icon: string;
  isActive?: boolean;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: 'dashboard' },
  { title: 'Vehicles', url: '/dashboard/vehicles', icon: 'vehicles' },
  { title: 'Devices', url: '/dashboard/devices', icon: 'devices' },
  { title: 'Tracking', url: '/dashboard/tracking', icon: 'tracking' },
  { title: 'Trips', url: '/dashboard/trips', icon: 'trips' },
  { title: 'Alerts', url: '/dashboard/alerts', icon: 'alerts' },
  { title: 'Geofences', url: '/dashboard/geofences', icon: 'geofences' },
  { title: 'Customers', url: '/dashboard/customers', icon: 'customers' },
  { title: 'Maintenance', url: '/dashboard/maintenance', icon: 'maintenance' },
  { title: 'Commands', url: '/dashboard/commands', icon: 'commands' },
  { title: 'Notifications', url: '/dashboard/notifications', icon: 'notifications' },
  { title: 'Settings', url: '/dashboard/settings', icon: 'settings' },
];

