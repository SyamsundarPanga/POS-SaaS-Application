import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8082/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const decodeJwtPayload = (token?: string | null): { exp?: number } | null => {
  try {
    if (!token || typeof token !== 'string') return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
};

const isAccessTokenExpired = (token: string, skewSeconds = 10): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000 - skewSeconds * 1000;
};

const isAuthRoute = (url: string): boolean =>
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/verify-email') ||
  url.includes('/auth/pending-registration') ||
  url.includes('/auth/refresh-token');

const processRefreshQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach((request) => {
    if (error) {
      request.reject(error);
      return;
    }
    if (token) {
      request.resolve(token);
    }
  });
  refreshQueue = [];
};

const clearUserSession = () => {
  localStorage.removeItem('user');
};

const getErrorMessage = (error: any): string =>
  String(error?.response?.data?.message || error?.message || '');

const isTenantInactiveMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes('tenant') && (normalized.includes('inactive') || normalized.includes('deactivated'));
};

const isBillingOnlyMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes('billing-only');
};

const isSubscriptionNoAccessMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes('subscription is cancelled') && normalized.includes('no access');
};

const isActivationPendingMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes('verify your email') && normalized.includes('before signing in')) ||
    (normalized.includes('email is not verified')) ||
    (normalized.includes('subscription payment is pending')) ||
    (normalized.includes('complete payment before signing in'))
  );
};

const updateStoredAccessMode = (accessMode: 'FULL_ACCESS' | 'BILLING_ONLY' | 'NO_ACCESS', subscriptionStatus?: string) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return;

  try {
    const userData = JSON.parse(userStr);
    localStorage.setItem('user', JSON.stringify({
      ...userData,
      accessMode,
      ...(subscriptionStatus ? { subscriptionStatus } : {}),
    }));
  } catch {
    // Ignore storage parsing issues and fall back to redirect only.
  }
};

const handleForcedLogout = (message: string) => {
  clearUserSession();
  if (message) {
    sessionStorage.setItem('auth_forced_logout_message', message);
  }

  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

const handleSubscriptionAccessRestriction = (message: string) => {
  const userStr = localStorage.getItem('user');
  let isStoreAdmin = false;

  if (userStr) {
    try {
      const userData = JSON.parse(userStr);
      isStoreAdmin = !!(userData.roles?.includes?.('ROLE_STORE_ADMIN') || userData.role === 'ROLE_STORE_ADMIN');
    } catch {
      // Ignore and fall back to redirect.
    }
  }

  if (isStoreAdmin && isBillingOnlyMessage(message)) {
    updateStoredAccessMode('BILLING_ONLY', 'CANCELLED');
    if (!window.location.pathname.includes('/settings')) {
      window.location.href = '/settings';
    }
    return;
  }

  updateStoredAccessMode('NO_ACCESS', 'CANCELLED');
  if (!window.location.pathname.includes('/subscription-inactive')) {
    window.location.href = '/subscription-inactive';
  }
};

api.interceptors.request.use(async (config) => {
  const requestUrl: string = config.url || '';
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const userData = JSON.parse(userStr);
    let token = userData.token || userData.accessToken;
    const refreshToken = userData.refreshToken;

    if (token && refreshToken && !isAuthRoute(requestUrl) && isAccessTokenExpired(token)) {
      if (isRefreshing) {
        token = await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
      } else {
        isRefreshing = true;
        try {
          const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const newAccessToken = refreshResponse.data?.accessToken;
          if (!newAccessToken) {
            throw new Error('No access token received during refresh');
          }

          const updatedUser = {
            ...userData,
            accessToken: newAccessToken,
            token: newAccessToken,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          processRefreshQueue(null, newAccessToken);
          token = newAccessToken;
        } catch (refreshError) {
          const refreshMessage = getErrorMessage(refreshError);
          if (isTenantInactiveMessage(refreshMessage)) {
            handleForcedLogout(refreshMessage);
          }
          processRefreshQueue(refreshError, null);
          clearUserSession();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    const isSuperAdmin = !!(userData.isSuperAdmin || userData.roles?.includes?.('ROLE_SUPER_ADMIN') || userData.role === 'ROLE_SUPER_ADMIN');
    const tenantId = userData.tenantId || userData.user?.tenantId || (isSuperAdmin ? 'SUPERADMIN' : undefined);

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    } else if (!isSuperAdmin) {
      console.warn('API Interceptor: No Tenant ID found in localStorage!');
    }
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const statusCode = error?.response?.status;
    const requestUrl: string = originalRequest?.url || '';
    const responseMessage = getErrorMessage(error);

    const originalRequestAny = originalRequest as any;

    if (isTenantInactiveMessage(responseMessage)) {
      handleForcedLogout(responseMessage);
      return Promise.reject(error);
    }

    if (isActivationPendingMessage(responseMessage)) {
      handleForcedLogout(responseMessage);
      return Promise.reject(error);
    }

    if (isBillingOnlyMessage(responseMessage) || isSubscriptionNoAccessMessage(responseMessage)) {
      handleSubscriptionAccessRestriction(responseMessage);
      return Promise.reject(error);
    }

    // 403 Forbidden shouldn't trigger refresh loop. 401 is token expiration.
    const isAuthExpiredStatus = statusCode === 401;

    if (
      !isAuthExpiredStatus ||
      !originalRequest ||
      originalRequestAny._retry ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/verify-email') ||
      requestUrl.includes('/auth/pending-registration') ||
      requestUrl.includes('/auth/logout') ||
      requestUrl.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return Promise.reject(error);
    }

    const userData = JSON.parse(userStr);
    const currentRefreshToken = userData.refreshToken;
    if (!currentRefreshToken) {
      clearUserSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (newToken: string) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequestAny._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
        refreshToken: currentRefreshToken,
      });

      const newAccessToken = refreshResponse.data?.accessToken;
      if (!newAccessToken) {
        throw new Error('No access token received during refresh');
      }

      const updatedUser = {
        ...userData,
        accessToken: newAccessToken,
        token: newAccessToken,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      processRefreshQueue(null, newAccessToken);
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      const refreshMessage = getErrorMessage(refreshError);
      if (isTenantInactiveMessage(refreshMessage)) {
        handleForcedLogout(refreshMessage);
      }
      processRefreshQueue(refreshError, null);
      clearUserSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
