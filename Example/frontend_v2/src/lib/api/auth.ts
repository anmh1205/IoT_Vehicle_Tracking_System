import { http } from './http';
import { API } from './endpoints';

export const authServices = {
    login: (username: string, sha256Password: string) =>
        http.post<Auth.LoginResponse>(API.AUTH.LOGIN, { username, password: sha256Password }),
    logout: () => http.post(API.AUTH.LOGOUT),
};
