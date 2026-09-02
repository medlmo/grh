import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Never intercept auth endpoints — let the caller handle their errors directly
    const isAuthEndpoint = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/me'].some((path) =>
      originalRequest?.url?.includes(path),
    );
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const response = await axios.post('/api/auth/refresh', undefined, { withCredentials: true });
        return api(originalRequest);
      } catch (refreshError) {
        // Avoid redirect loop if already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
