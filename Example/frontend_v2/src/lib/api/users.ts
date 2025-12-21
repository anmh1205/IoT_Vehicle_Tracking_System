import { http } from './http';

// Helper function to hash password using SHA-256
const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const userServices = {
    list: () => http.get<{ users: User.UserDto[] }>('/auth/users').then(r => r.users),
    create: async (params: User.CreateUserRequest) => {
        const hashedPassword = await hashPassword(params.password);
        return http.post<unknown>('/auth/users', {
            ...params,
            password: hashedPassword,
            fullName: params.full_name // Backend expects fullName, not full_name
        });
    },
    update: async (id: string, params: User.UpdateUserRequest & { username?: string }) => {
        const updatePayload: any = { ...params };
        if (params.password) {
            updatePayload.password = await hashPassword(params.password);
        }
        if (params.full_name !== undefined) {
            updatePayload.fullName = params.full_name;
            delete updatePayload.full_name;
        }
        // username is passed as-is if provided
        return http.put<unknown>(`/auth/users/${encodeURIComponent(id)}`, updatePayload);
    },
    delete: (id: string) => http.delete<unknown>(`/auth/users/${encodeURIComponent(id)}`),
    getDeviceAccess: (id: string) =>
        http.get<{ mode: 'all' | 'custom'; deviceIds: string[] }>(
            `/auth/users/${encodeURIComponent(id)}/device-access`
        ),
    updateDeviceAccess: (id: string, payload: { mode: 'all' | 'custom'; deviceIds?: string[] }) =>
        http.put<{ mode: 'all' | 'custom'; deviceIds: string[] }>(
            `/auth/users/${encodeURIComponent(id)}/device-access`,
            payload
        ),
};
