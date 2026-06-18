import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearError, login, superAdminLogin } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import toast from '../../utils/toast';

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error: serverError, isLoggedIn, user } = useAppSelector((s) => s.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const successMessage = localStorage.getItem('post_registration_success_message');
    if (successMessage) {
      toast.success(successMessage);
      localStorage.removeItem('post_registration_success_message');
    }

    const forcedLogoutMessage = sessionStorage.getItem('auth_forced_logout_message');
    if (forcedLogoutMessage) {
      setAuthError(forcedLogoutMessage);
      sessionStorage.removeItem('auth_forced_logout_message');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && user) {
      if (user.isEmailVerified === false || user.subscriptionStatus === 'PENDING_PAYMENT') {
        localStorage.removeItem('user');
        return;
      }
      if (user.accessMode === 'NO_ACCESS') {
        navigate('/subscription-inactive');
        return;
      }
      if (user.accessMode === 'BILLING_ONLY') {
        if (user.roles?.includes('ROLE_STORE_ADMIN')) {
          navigate('/settings');
        } else {
          navigate('/subscription-inactive');
        }
        return;
      }
      if (user.roles?.includes('ROLE_SUPER_ADMIN') || user.isSuperAdmin) {
        navigate('/superadmin/dashboard');
      } else if (user.roles?.includes('ROLE_CASHIER')) {
        navigate('/cashier/pos');
      } else if (user.roles?.includes('ROLE_BRANCH_MANAGER')) {
        navigate('/manager/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isLoggedIn, user, navigate]);

  // ==========================
  // LOCK COUNTDOWN TIMER
  // ==========================
  useEffect(() => {
    if (!isLocked || lockoutSeconds <= 0) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;

          setIsLocked(false);
          setAuthError(null);
          dispatch(clearError());

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLocked]);

  // ==========================
  // FORM VALIDATION
  // ==========================
  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    const email = formData.email.trim();

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (email.length > 254) {
      newErrors.email = 'Email address is too long';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================
  // ERROR MAPPER
  // ==========================
  const extractLockSeconds = (message?: string): number => {
    const match = message?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const extractAuthMessage = (payload: any, fallbackMessage = ''): string => {
    if (typeof payload === 'string') {
      return payload;
    }

    const message = payload?.message || payload?.error || fallbackMessage;
    return String(message || '');
  };

  const isTenantDeactivatedError = (message?: string): boolean => {
    const normalized = (message || '').toLowerCase();
    return (
      normalized.includes('deactivated by superadmin') ||
      normalized.includes('tenant_deactivated') ||
      (normalized.includes('tenant') && (normalized.includes('inactive') || normalized.includes('deactivated')))
    );
  };

  const shouldAttemptSuperAdminFallback = (email: string, message?: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@possaas.com')) {
      return false;
    }

    const normalized = (message || '').toLowerCase();
    return (
      normalized.includes('invalid credential') ||
      normalized.includes('bad credential') ||
      normalized.includes('invalid password') ||
      normalized.includes('user not found') ||
      normalized.includes('authentication failed')
    );
  };

  const shouldPreserveRegularLoginError = (message?: string): boolean => {
    const normalized = (message || '').toLowerCase();
    return (
      !normalized ||
      normalized.includes('superadmin not found') ||
      normalized.includes('invalid credential') ||
      normalized.includes('bad credential')
    );
  };

  const mapAuthError = (message?: string): string => {
    const normalized = (message || '').toLowerCase();
    const trimmed = (message || '').trim();

    if (normalized.includes('locked')) {
      const seconds = extractLockSeconds(message);
      return seconds > 0
        ? `Account locked due to multiple failed attempts. Try again in ${seconds} seconds`
        : 'Account locked. Please try again later.';
    }

    if (isTenantDeactivatedError(message)) {
      if (trimmed && trimmed.toLowerCase() !== 'tenant_deactivated' && trimmed.toLowerCase() !== 'authentication failed') {
        return trimmed;
      }
      return 'Your account has been deactivated by superadmin. For more information, contact superadmin at superadmin@possaas.com.';
    }

    if (normalized.includes('account is inactive')) {
      return 'This account is inactive. Please contact support.';
    }

    if (normalized.includes('email is not verified') || normalized.includes('verify your email')) {
      return 'Please verify your email and complete payment before signing in.';
    }

    if (normalized.includes('subscription payment is pending') || normalized.includes('complete payment before signing in')) {
      return 'Payment is pending for this account. Complete payment first, then sign in.';
    }

    if (normalized.includes('branch') && normalized.includes('inactive')) {
      return 'Your branch is currently inactive. Please contact support.';
    }

    if (
      normalized.includes('invalid credential') ||
      normalized.includes('bad credential') ||
      normalized.includes('invalid password')
    ) {
      return 'Invalid credentials';
    }

    return 'Invalid credentials';
  };

  // ==========================
  // LOGIN SUBMIT
  // ==========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked || lockoutSeconds > 0) return;

    setAuthError(null);
    dispatch(clearError());

    if (!validate()) return;

    const email = formData.email.trim();
    const isSuperAdminDomain = email.toLowerCase().endsWith('@possaas.com');

    // 1️⃣ Smart Routing: If it's a known SuperAdmin domain, skip regular login to avoid 401 console error
    if (isSuperAdminDomain) {
      const superAdminAction = await dispatch(
        superAdminLogin({ email, password: formData.password })
      );

      if (superAdminLogin.rejected.match(superAdminAction)) {
        const superPayload = superAdminAction.payload as any;
        const errorMsg = extractAuthMessage(superPayload, superAdminAction.error?.message || '');

        if (errorMsg.toLowerCase().includes('locked')) {
          const seconds = superPayload?.remainingSeconds || extractLockSeconds(errorMsg);
          if (seconds > 0) setLockoutSeconds(seconds);
          setIsLocked(true);
        }
        const mapped = mapAuthError(errorMsg); setAuthError(mapped);
      }
      return;
    }

    // 2️⃣ Regular Login Attempt
    const resultAction = await dispatch(
      login({ email, password: formData.password })
    );

    if (login.rejected.match(resultAction)) {
      const payload = resultAction.payload as any;
      const loginError = extractAuthMessage(payload, resultAction.error?.message || '');

      if (typeof payload?.remainingSeconds === 'number' && payload.remainingSeconds > 0) {
        setLockoutSeconds(payload.remainingSeconds);
        setIsLocked(true);
      }

      const normalized = loginError.toLowerCase();

      // If account is locked or tenant is deactivated, show error immediately
      if (normalized.includes('locked') || isTenantDeactivatedError(loginError)) {
        const seconds = payload?.remainingSeconds || extractLockSeconds(loginError);
        if (seconds > 0) setLockoutSeconds(seconds);
        if (normalized.includes('locked')) setIsLocked(true);
        
        const mapped = mapAuthError(loginError); 
        setAuthError(mapped);
        return;
      }

      if (!shouldAttemptSuperAdminFallback(email, loginError)) {
        const mapped = mapAuthError(loginError);
        setAuthError(mapped);
        return;
      }

      // 3️⃣ Deferred Fallback: Try SuperAdmin login WITHOUT showing "Invalid credentials" yet
      const superAdminAction = await dispatch(
        superAdminLogin({ email, password: formData.password })
      );

      if (superAdminLogin.rejected.match(superAdminAction)) {
        const superPayload = superAdminAction.payload as any;
        const superError = extractAuthMessage(superPayload, superAdminAction.error?.message || '');
        const errorMsg = shouldPreserveRegularLoginError(superError) ? loginError : superError;

        if (errorMsg.toLowerCase().includes('locked')) {
          const seconds = superPayload?.remainingSeconds || extractLockSeconds(errorMsg);
          if (seconds > 0) setLockoutSeconds(seconds);
          setIsLocked(true);
        }

        // ONLY NOW show the error, after both attempts failed
        const mapped = mapAuthError(errorMsg); setAuthError(mapped);
      }
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Access your unified terminal dashboard."
      mode="auth"
    >
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed top-5 left-5 z-20 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <AnimatePresence mode="wait">
        {(authError || serverError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-xl overflow-hidden"
          >
            {isLocked && lockoutSeconds > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div>Account locked due to multiple failed attempts.</div>
                <div className="text-lg font-black">
                  Try again in {lockoutSeconds} seconds
                </div>
              </div>
            ) : (authError || serverError)}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-4">

        {/* EMAIL */}
        <div className="space-y-1">
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
            Email Address
          </label>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Mail size={16} />
            </div>

            <input
              type="email"
              value={formData.email}
              disabled={isLocked}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.email)}
              className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-4 text-sm font-semibold outline-none transition-colors ${errors.email ? 'border-red-400 bg-red-50/10' : 'focus:border-slate-300'
                }`}
              placeholder="admin@enterprise.com"
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[10px] text-red-500 font-bold mt-1 ml-1 overflow-hidden"
              >
                {errors.email}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* PASSWORD */}
        <div className="space-y-1">
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
            Password
          </label>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={16} />
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              disabled={isLocked}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.password)}
              className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-12 text-sm font-semibold outline-none transition-colors ${errors.password ? 'border-red-400 bg-red-50/10' : 'focus:border-slate-300'
                }`}
              placeholder="••••••••"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[10px] text-red-500 font-bold mt-1 ml-1 overflow-hidden"
              >
                {errors.password}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* BUTTON */}
        <motion.button
          disabled={loading || isLocked}
          type="submit"
          className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : isLocked ? (
            <span>Account Locked</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={18} className="text-emerald-400" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-6 text-center text-slate-500 text-xs font-bold">
        Don&apos;t have an account?
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="ml-2 text-emerald-600 font-black hover:text-emerald-700 transition-colors underline decoration-emerald-100 underline-offset-4"
        >
          Create Account
        </button>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;





