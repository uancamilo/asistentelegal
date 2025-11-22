import axios from 'axios';

/**
 * SECURITY FIX (P3.2): Explicit error if API URL not configured
 *
 * Removed insecure HTTP fallback. Application should fail explicitly
 * if NEXT_PUBLIC_API_URL is not set rather than defaulting to HTTP.
 */
if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not configured. ' +
    'Please set this environment variable in .env.local file. ' +
    'Example: NEXT_PUBLIC_API_URL=http://localhost:8080/api'
  );
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // SECURITY FIX P3.2: No HTTP fallback
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Incluir cookies automáticamente en todas las peticiones
});

/**
 * SECURITY FIX (P2.2): Prevent race condition in token refresh
 *
 * Problem: If multiple requests fail with 401 simultaneously, they all try to refresh
 * the token in parallel, causing unnecessary calls and potential token invalidation.
 *
 * Solution: Use a flag and queue to ensure only one refresh happens at a time.
 * All pending requests wait for the first refresh to complete.
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor para manejar errores globales
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el token expiró, intentar refrescar SOLO si no es una ruta de auth
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/')) {
      
      if (isRefreshing) {
        // Si ya hay un refresh en progreso, agregar esta petición a la cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Intentar refrescar el token (refresh token en cookie)
        // SECURITY FIX P3.2: Use configured API URL (validated above)
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { 
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        // Refresh exitoso - procesar todas las peticiones en cola
        processQueue();
        isRefreshing = false;

        // Reintentar la petición original
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh falló - rechazar todas las peticiones en cola
        processQueue(refreshError);
        isRefreshing = false;

        // Limpiar cookies y redirigir al login
        if (typeof window !== 'undefined') {
          // Limpiar todas las cookies de autenticación
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Si es un 401 en rutas de auth (login, refresh), no intentar refresh
    if (error.response?.status === 401 && originalRequest.url?.includes('/auth/')) {
      // Limpiar cookies inválidas
      if (typeof window !== 'undefined') {
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
