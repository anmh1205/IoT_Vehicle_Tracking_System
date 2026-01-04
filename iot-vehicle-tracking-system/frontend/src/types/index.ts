export interface NavItem {
    title: string;
    url: string;
    icon?: string;
    isActive?: boolean;
    shortcut?: string[];
    items?: NavItem[];
}

export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
