import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { User } from '@/lib/stores/auth-store';
import type { ApiEnvelope } from '@/types';

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;
    const requestUrl = String(originalRequest?.url ?? '');
    const requestPath = requestUrl.split('?')[0] ?? '';
    const isRefreshRequest = requestPath.endsWith('/auth/refresh');
    const isLoginRequest = requestPath.endsWith('/auth/login');

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      isRefreshRequest ||
      isLoginRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = apiClient
        .post('/auth/refresh')
        .then((response) => {
          const payload = unwrap<{ user: User; token: string | null }>(response.data);
          useAuthStore.getState().setAuth(payload.user, payload.token);
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      const token = useAuthStore.getState().token;
      if (token && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      return apiClient(originalRequest);
    } catch {
      useAuthStore.getState().clearAuth();

      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.pathname !== '/login') {
          const searchParams = new URLSearchParams({
            redirect: `${currentUrl.pathname}${currentUrl.search}`,
            reason: 'session-expired',
          });
          window.location.assign(`/login?${searchParams.toString()}`);
        }
      }

      return Promise.reject(error);
    }
  },
);

export const unwrap = <T>(payload: ApiEnvelope<T> | T): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    'requestId' in payload &&
    typeof (payload as { requestId?: unknown }).requestId === 'string' &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};
