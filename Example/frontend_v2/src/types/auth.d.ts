namespace Auth {
    export interface LoginRequest {
        username: string;
        password: string;
    }

    export interface LoginResponse {
        data: {
            user: {
                id: string;
                username: string;
                full_name: string;
                role: 'root' | 'admin' | 'user';
            };
            session: {
                token: string;
            };
        };
        success: boolean;
        message?: string;
    }
}

