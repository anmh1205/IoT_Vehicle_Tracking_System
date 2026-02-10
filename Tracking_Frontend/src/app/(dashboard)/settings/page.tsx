'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Settings as SettingsIcon, User, Lock, Loader2, Check } from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: (data: { fullName: string; email: string }) =>
      apiClient.patch('/auth/me', data),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, fullName, email: email || null });
      }
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.put('/auth/me/password', data),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    profileMutation.mutate({ fullName, email });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    passwordMutation.mutate({ currentPassword, newPassword });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Section */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-card-foreground">
            <User className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Profile</h2>
          </div>
          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="settings-username" className="mb-1 block text-xs font-medium text-muted-foreground">Username</label>
              <input
                id="settings-username"
                value={user?.username ?? ''}
                disabled
                className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label htmlFor="settings-fullname" className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                id="settings-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="settings-email" className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              {profileMutation.isSuccess && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
              <button
                type="submit"
                disabled={profileMutation.isPending}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {profileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
            {profileMutation.isError && (
              <p className="text-sm text-destructive">Failed to update profile.</p>
            )}
          </form>
        </div>

        {/* Password Section */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-card-foreground">
            <Lock className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="settings-curpwd" className="mb-1 block text-xs font-medium text-muted-foreground">Current Password</label>
              <input
                id="settings-curpwd"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="settings-newpwd" className="mb-1 block text-xs font-medium text-muted-foreground">New Password</label>
              <input
                id="settings-newpwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="settings-confirmpwd" className="mb-1 block text-xs font-medium text-muted-foreground">Confirm New Password</label>
              <input
                id="settings-confirmpwd"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={cn(
                  'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1',
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-destructive focus:border-destructive focus:ring-destructive'
                    : 'border-border focus:border-primary focus:ring-primary'
                )}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              {passwordMutation.isSuccess && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> Updated
                </span>
              )}
              <button
                type="submit"
                disabled={passwordMutation.isPending || (!!confirmPassword && newPassword !== confirmPassword)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </div>
            {passwordMutation.isError && (
              <p className="text-sm text-destructive">Failed to update password. Check your current password.</p>
            )}
          </form>
        </div>
      </div>

      {/* Preferences Placeholder */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-card-foreground">
          <SettingsIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Preferences</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Additional preferences and notification settings will be available in a future update.
        </p>
      </div>
    </div>
  );
}
