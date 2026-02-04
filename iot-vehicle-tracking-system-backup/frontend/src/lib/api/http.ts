const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
}

class HttpClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getAuthHeader(): Record<string, string> {
        if (typeof window === 'undefined') return {};

        const stored = localStorage.getItem('auth-storage');
        if (stored) {
            const data = JSON.parse(stored);
            if (data.state?.accessToken) {
                return { Authorization: `Bearer ${data.state.accessToken}` };
            }
        }
        return {};
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...options.headers,
        };

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    get<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    post<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, { method: 'POST', body });
    }

    put<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, { method: 'PUT', body });
    }

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const api = new HttpClient(API_URL);
