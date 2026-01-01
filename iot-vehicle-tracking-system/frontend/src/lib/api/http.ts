// API base URL lấy trực tiếp từ biến môi trường NEXT_PUBLIC_API_BASE_URL
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

import { useAuthStore } from "@/lib/store/authStore";
import { notificationUtils } from "@/lib/notification";

let sessionExpiredNotified = false;
let sessionNotifyTimer: ReturnType<typeof setTimeout> | null = null;

const notifySessionExpired = () => {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  notificationUtils.error("Session expired", "Please login again");
  if (sessionNotifyTimer) {
    clearTimeout(sessionNotifyTimer);
  }
  sessionNotifyTimer = setTimeout(() => {
    sessionExpiredNotified = false;
    sessionNotifyTimer = null;
  }, 3000);
};

// Check if error is a network/connection error that should be retried
const isRetryableError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    const message = error.message?.toLowerCase() || "";
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("econnreset") ||
      message.includes("econnrefused")
    );
  }
  return false;
};

// Retry with exponential backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw lastError;
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return retryRequest(async () => {
    const token =
      typeof window !== "undefined" ? useAuthStore.getState().token : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const error = errorData.error || {};

        if (res.status === 401) {
          notifySessionExpired();
          useAuthStore.getState().logout();
          throw new Error("Unauthorized");
        } else if (res.status >= 500) {
          notificationUtils.error(
            "Server error",
            "Server is experiencing issues. Please try again later."
          );
        } else if (res.status === 408) {
          notificationUtils.error(
            "Request timeout",
            "Request took too long. Please try again."
          );
        } else if (error.message) {
          notificationUtils.error("Error", error.message);
        }

        throw new Error(error.message || `HTTP ${res.status}`);
      }

      if (res.status === 204 || res.status === 205) {
        return null as T;
      }

      try {
        const text = await res.text();
        if (!text || text.trim().length === 0) {
          return null as T;
        }
        return JSON.parse(text) as T;
      } catch (e) {
        if (e instanceof SyntaxError) {
          return null as T;
        }
        throw e;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new TypeError("Request timeout");
      }
      throw error;
    }
  });
}

async function requestForm<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  return retryRequest(async () => {
    const token =
      typeof window !== "undefined" ? useAuthStore.getState().token : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const error = errorData.error || {};

        if (res.status === 401) {
          notifySessionExpired();
          useAuthStore.getState().logout();
        } else if (error.message) {
          notificationUtils.error("Error", error.message);
        }

        throw new Error(error.message || `HTTP ${res.status}`);
      }

      return res.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new TypeError("Request timeout");
      }
      throw error;
    }
  }, 2);
}

export const http = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  postForm: <T>(endpoint: string, formData: FormData) =>
    requestForm<T>(endpoint, formData),
};

