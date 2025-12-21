// API base URL lấy trực tiếp từ biến môi trường NEXT_PUBLIC_API_BASE_URL
// Bỏ cơ chế rewrite: FE gọi thẳng sang BE qua absolute URL
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();

import { useAuthStore } from '@/lib/store/authStore';
import { notificationUtils } from '@/lib/notification';

let sessionExpiredNotified = false;
let sessionNotifyTimer: ReturnType<typeof setTimeout> | null = null;

const notifySessionExpired = () => {
    if (sessionExpiredNotified) return;
    sessionExpiredNotified = true;
    notificationUtils.error('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại');
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
        // Network errors like ECONNRESET, ECONNREFUSED
        const message = error.message?.toLowerCase() || '';
        return (
            message.includes('failed to fetch') ||
            message.includes('networkerror') ||
            message.includes('econnreset') ||
            message.includes('econnrefused') ||
            message.includes('socket hang up')
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
            // Only retry on network errors, not on HTTP errors (4xx, 5xx)
            if (!isRetryableError(error) || attempt === maxRetries) {
                throw error;
            }
            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, attempt);
            await sleep(delay);
        }
    }
    throw lastError;
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return retryRequest(async () => {
        const token = typeof window !== 'undefined' ? useAuthStore.getState().token : null;
        
        // Add timeout to prevent hanging requests (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(options.headers || {})
                },
                ...options,
                credentials: 'include',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                if (res.status === 401) {
                    notifySessionExpired();
                    try {
                        useAuthStore.getState().logout();
                    } catch { }
                } else if (res.status >= 500) {
                    notificationUtils.error('Lỗi máy chủ', 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
                } else if (res.status === 408) {
                    notificationUtils.error('Hết thời gian chờ', 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.');
                }
                throw new Error(`HTTP ${res.status}`);
            }
            // Handle 204 No Content (mainly for CORS preflight OPTIONS requests)
            // All API endpoints now return 200 OK with response body
            if (res.status === 204 || res.status === 205) {
                return null as T;
            }

            // Parse JSON response
            try {
                const text = await res.text();
                if (!text || text.trim().length === 0) {
                    return null as T;
                }
                return JSON.parse(text) as T;
            } catch (e) {
                // If parsing fails, return null instead of throwing
                if (e instanceof SyntaxError) {
                    return null as T;
                }
                // Re-throw other errors (network errors, etc.)
                throw e;
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new TypeError('Request timeout');
            }
            throw error;
        }
    });
}

// Specialized helper for multipart/form-data (e.g. FormData uploads)
async function requestForm<T>(endpoint: string, formData: FormData): Promise<T> {
    return retryRequest(async () => {
        const token = typeof window !== 'undefined' ? useAuthStore.getState().token : null;
        
        // Add timeout to prevent hanging requests (60 seconds for file uploads)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    // Do NOT set Content-Type here; browser will set correct multipart boundary
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
                credentials: 'include',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 401) {
                    notifySessionExpired();
                    try {
                        useAuthStore.getState().logout();
                    } catch { }
                } else if (res.status >= 500) {
                    notificationUtils.error('Lỗi máy chủ', 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
                } else if (res.status === 408) {
                    notificationUtils.error('Hết thời gian chờ', 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.');
                }
                throw new Error(`HTTP ${res.status}`);
            }

            // Backend always returns JSON
            return res.json() as Promise<T>;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new TypeError('Request timeout');
            }
            throw error;
        }
    }, 2); // Only retry 2 times for file uploads
}

async function requestBlob(endpoint: string, options: RequestInit = {}): Promise<{ blob: Blob; headers: Headers }> {
    return retryRequest(async () => {
        const token = typeof window !== 'undefined' ? useAuthStore.getState().token : null;
        
        // Add timeout to prevent hanging requests (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(options.headers || {})
                },
                ...options,
                credentials: 'include',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                if (res.status === 401) {
                    notifySessionExpired();
                    try {
                        useAuthStore.getState().logout();
                    } catch { }
                } else if (res.status >= 500) {
                    notificationUtils.error('Lỗi máy chủ', 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
                } else if (res.status === 408) {
                    notificationUtils.error('Hết thời gian chờ', 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.');
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const blob = await res.blob();
            return { blob, headers: res.headers };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new TypeError('Request timeout');
            }
            throw error;
        }
    });
}

async function requestText(endpoint: string, options: RequestInit = {}): Promise<string> {
    return retryRequest(async () => {
        const token = typeof window !== 'undefined' ? useAuthStore.getState().token : null;
        
        // Add timeout to prevent hanging requests (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(options.headers || {})
                },
                ...options,
                credentials: 'include',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                if (res.status === 401) {
                    notifySessionExpired();
                    try {
                        useAuthStore.getState().logout();
                    } catch { }
                } else if (res.status >= 500) {
                    notificationUtils.error('Lỗi máy chủ', 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
                } else if (res.status === 408) {
                    notificationUtils.error('Hết thời gian chờ', 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.');
                }
                throw new Error(`HTTP ${res.status}`);
            }
            return res.text();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new TypeError('Request timeout');
            }
            throw error;
        }
    });
}

export const http = {
    get: <T>(endpoint: string) => request<T>(endpoint),
    post: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    put: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
    delete: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
    getBlob: (endpoint: string) => requestBlob(endpoint),
    getText: (endpoint: string) => requestText(endpoint),
    postForm: <T>(endpoint: string, formData: FormData) => requestForm<T>(endpoint, formData),
};
