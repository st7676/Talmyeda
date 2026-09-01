import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.data?.error?.code === 'MUST_CHANGE_PASSWORD') {
      // Backend blocks every endpoint except /users/change-password until the
      // password is changed (mustChangePassword isn't in the JWT, so a stale
      // page reload after a temp-password login would otherwise show
      // confusing 403s everywhere instead of the change-password screen).
      if (window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.error?.message || err.message;
  }
  return String(err);
}
