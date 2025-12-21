namespace User {
    export interface UserDto {
        id: string;
        username: string;
        full_name: string;
        role: 'root' | 'admin' | 'user';
        // Optional device access mode for display purposes
        device_access_mode?: 'all' | 'custom' | null;
        created_at: string;
    }

    export interface CreateUserRequest {
        username: string;
        password: string;
        full_name: string;
        role: 'root' | 'admin' | 'user';
    }

    export interface UpdateUserRequest {
        full_name?: string;
        role?: 'root' | 'admin' | 'user';
        password?: string;
    }
}

