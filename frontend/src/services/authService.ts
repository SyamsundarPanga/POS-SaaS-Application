import api from './api';

export interface PendingRegistrationSession {
  sessionToken: string;
  storeName: string;
  adminEmail: string;
  plan: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  emailVerified: boolean;
  paymentStatus?: 'CREATED' | 'SUCCESS' | 'FAILED' | null;
  completed: boolean;
  message?: string;
}

const PENDING_REGISTRATION_KEY = 'pending_registration_session';
const PENDING_REGISTRATION_CREDENTIALS_KEY = 'pending_registration_credentials';

const savePendingRegistrationSession = (session: PendingRegistrationSession) => {
  localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(session));
};

const getPendingRegistrationSession = (): PendingRegistrationSession | null => {
  const raw = localStorage.getItem(PENDING_REGISTRATION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingRegistrationSession;
  } catch {
    localStorage.removeItem(PENDING_REGISTRATION_KEY);
    return null;
  }
};

const clearPendingRegistrationSession = () => {
  localStorage.removeItem(PENDING_REGISTRATION_KEY);
};

const savePendingRegistrationCredentials = (email: string, password: string) => {
  sessionStorage.setItem(
    PENDING_REGISTRATION_CREDENTIALS_KEY,
    JSON.stringify({ email, password }),
  );
};

const getPendingRegistrationCredentials = (): { email: string; password: string } | null => {
  const raw = sessionStorage.getItem(PENDING_REGISTRATION_CREDENTIALS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { email: string; password: string };
  } catch {
    sessionStorage.removeItem(PENDING_REGISTRATION_CREDENTIALS_KEY);
    return null;
  }
};

const clearPendingRegistrationCredentials = () => {
  sessionStorage.removeItem(PENDING_REGISTRATION_CREDENTIALS_KEY);
};

const register = async (
  storeName: string,
  adminUsername: string,
  adminEmail: string,
  adminPassword: string,
  plan: string,
) => {
  const response = await api.post('/auth/register', {
    storeName,
    adminUsername,
    adminEmail,
    adminPassword,
    plan,
  });
  if (response.data?.sessionToken) {
    savePendingRegistrationSession(response.data);
    savePendingRegistrationCredentials(adminEmail, adminPassword);
  }
  return response.data;
};

const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken || response.data.token) {
      clearPendingRegistrationSession();
      clearPendingRegistrationCredentials();
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...response.data,
          token: response.data.token || response.data.accessToken,
          accessToken: response.data.accessToken || response.data.token,
        }),
      );
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Login failed';
    if (errorMessage.includes('unique result') || errorMessage.includes('did not return')) {
      throw new Error(
        'Database error: Multiple accounts detected. Please contact system administrator to resolve this issue.',
      );
    }
    throw error;
  }
};

const superAdminLogin = async (email: string, password: string) => {
  const response = await api.post('/superadmin/login', { email, password });
  if (response.data.accessToken || response.data.token) {
    const userData = {
      ...response.data,
      token: response.data.token || response.data.accessToken,
      accessToken: response.data.accessToken || response.data.token,
      tenantId: 'SUPERADMIN',
      isSuperAdmin: true,
      roles: ['ROLE_SUPER_ADMIN'],
    };
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  }
  return response.data;
};

// --- EMAIL VERIFICATION METHOD ---
const verifyEmail = async (token: string) => {
  // Use a POST request for better backend compatibility
  try {
    const response = await api.post('/auth/verify-email', { token });
    if (response.data?.sessionToken) {
      savePendingRegistrationSession(response.data);
    }
    return response.data;
  } catch (error: any) {
    console.error('Verification failed:', error);
    throw error;
  }
};

const getPendingRegistrationStatus = async () => {
  const session = getPendingRegistrationSession();
  if (!session?.sessionToken) {
    throw new Error('Pending registration session not found');
  }

  const response = await api.get('/auth/pending-registration/status', {
    params: { sessionToken: session.sessionToken },
  });

  if (response.data?.sessionToken) {
    savePendingRegistrationSession(response.data);
  }

  return response.data as PendingRegistrationSession;
};

const createPendingRegistrationPaymentOrder = async (billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY') => {
  const session = getPendingRegistrationSession();
  if (!session?.sessionToken) {
    throw new Error('Pending registration session not found');
  }

  const response = await api.post('/auth/pending-registration/create-order', {
    sessionToken: session.sessionToken,
    billingCycle,
  });
  return response.data;
};

const verifyPendingRegistrationPayment = async (payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) => {
  const session = getPendingRegistrationSession();
  if (!session?.sessionToken) {
    throw new Error('Pending registration session not found');
  }

  const response = await api.post('/auth/pending-registration/verify-payment', {
    sessionToken: session.sessionToken,
    ...payload,
  });

  if (response.data?.sessionToken) {
    savePendingRegistrationSession(response.data);
  }

  return response.data as PendingRegistrationSession;
};

const getEmailVerificationStatus = async (): Promise<{ verified: boolean; email: string }> => {
  const response = await api.get('/auth/email-verification-status');
  return response.data;
};

const requestPasswordResetLink = async (email: string) => {
  const response = await api.post('/auth/forgot-password/request-link', { email });
  return response.data;
};

const resetPassword = async (
  email: string,
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
) => {
  const response = await api.post('/auth/forgot-password/reset', {
    email,
    resetToken,
    newPassword,
    confirmPassword,
  });
  return response.data;
};

const logout = async () => {
  const userStr = localStorage.getItem('user');

  if (userStr) {
    try {
      const userData = JSON.parse(userStr);
      if (userData?.refreshToken) {
        await api.post('/auth/logout', { refreshToken: userData.refreshToken });
      }
    } catch (error) {
      console.warn('Logout API call failed, clearing local session anyway', error);
    }
  }

  localStorage.removeItem('user');
};

const checkSubscription = async (email: string) => {
  const response = await api.get(`/subscription/check-status`, { params: { email } });
  return response.data.active;
};

const authService = {
  register,
  login,
  superAdminLogin,
  verifyEmail, // Added here to fix TS2339
  getEmailVerificationStatus,
  getPendingRegistrationStatus,
  createPendingRegistrationPaymentOrder,
  verifyPendingRegistrationPayment,
  getPendingRegistrationSession,
  clearPendingRegistrationSession,
  getPendingRegistrationCredentials,
  clearPendingRegistrationCredentials,
  requestPasswordResetLink,
  resetPassword,
  logout,
  // checkEmailVerified, // Removed, no longer used
  checkSubscription,
};

export default authService;
