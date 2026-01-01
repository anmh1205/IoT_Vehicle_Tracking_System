import { http } from "./http";
import { API } from "./endpoints";

export const authServices = {
  login: async (username: string, passwordHash: string) => {
    return http.post<{
      user: {
        id: string;
        username: string;
        fullName?: string;
        role: string;
      };
      session: {
        token: string;
        expiresAt: string;
      };
    }>(API.AUTH.LOGIN, {
      username,
      password: passwordHash,
    });
  },
  register: async (data: {
    username: string;
    password: string;
    fullName?: string;
  }) => {
    return http.post(API.AUTH.REGISTER, data);
  },
  logout: async () => {
    return http.post(API.AUTH.LOGOUT);
  },
};

