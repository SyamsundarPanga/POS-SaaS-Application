import React, { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import authService from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SubscriptionPlanType } from '../../services/subscriptionService';
import {
  Building2,
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import toast from '../../utils/toast';
import {
  formatMonthlyPlanPrice,
  getPlanDisplayName,
  getPlanSubtitle,
} from '../../utils/subscriptionPlans';

type PlanType = 'Basic' | 'Pro' | 'Advanced';

interface FormState {
  storeName: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  selectedPlan: PlanType;
}

interface FormErrors {
  storeName?: string;
  adminUsername?: string;
  adminEmail?: string;
  adminPassword?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const storeNameRegex = /^[a-zA-Z0-9\s-_]+$/;
const usernameRegex = /^[a-zA-Z0-9_-]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/;

const parseBackendFieldErrors = (message: string): Partial<Record<keyof FormErrors, string>> => {
  const normalized = message.trim();
  if (!normalized.startsWith('{') || !normalized.endsWith('}')) {
    return {};
  }

  const content = normalized.slice(1, -1).trim();
  if (!content) {
    return {};
  }

  const fieldMap: Record<string, keyof FormErrors> = {
    storeName: 'storeName',
    adminUsername: 'adminUsername',
    adminEmail: 'adminEmail',
    adminPassword: 'adminPassword',
  };

  const parsedErrors: Partial<Record<keyof FormErrors, string>> = {};
  const matches = content.match(/([a-zA-Z]+)=([^,}]+(?:,[^,}=]+)*)/g) || [];

  matches.forEach((entry) => {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex === -1) return;

    const rawField = entry.slice(0, separatorIndex).trim();
    const rawMessage = entry.slice(separatorIndex + 1).trim();
    const field = fieldMap[rawField];

    if (field && rawMessage) {
      parsedErrors[field] = rawMessage;
    }
  });

  return parsedErrors;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { loading, error: serverError } = useAppSelector((s) => s.auth);

  const [formData, setFormData] = useState<FormState>({
    storeName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    selectedPlan: 'Basic',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const storeName = formData.storeName.trim();
    const adminUsername = formData.adminUsername.trim();
    const adminEmail = formData.adminEmail.trim();
    const adminPassword = formData.adminPassword;

    if (!storeName) {
      newErrors.storeName = 'Store name is required';
    } else if (storeName.length < 3 || storeName.length > 100) {
      newErrors.storeName = 'Store name must be between 3 and 100 characters';
    } else if (!storeNameRegex.test(storeName)) {
      newErrors.storeName = 'Store name can only contain letters, numbers, spaces, hyphens and underscores';
    }

    if (!adminUsername) {
      newErrors.adminUsername = 'Admin username is required';
    } else if (adminUsername.length < 3 || adminUsername.length > 50) {
      newErrors.adminUsername = 'Username must be between 3 and 50 characters';
    } else if (!usernameRegex.test(adminUsername)) {
      newErrors.adminUsername = 'Username can only contain letters, numbers, hyphens and underscores';
    }

    if (!adminEmail) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (adminEmail.length > 100) {
      newErrors.adminEmail = 'Email must not exceed 100 characters';
    } else if (!emailRegex.test(adminEmail)) {
      newErrors.adminEmail = 'Please provide a valid email address';
    }

    if (!adminPassword) {
      newErrors.adminPassword = 'Admin password is required';
    } else if (adminPassword.length < 8 || adminPassword.length > 100) {
      newErrors.adminPassword = 'Password must be between 8 and 100 characters';
    } else if (!/[A-Z]/.test(adminPassword)) {
      newErrors.adminPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(adminPassword)) {
      newErrors.adminPassword = 'Password must contain at least one lowercase letter';
    } else if (!/\d/.test(adminPassword)) {
      newErrors.adminPassword = 'Password must contain at least one number';
    } else if (!/[@$!%*?&#]/.test(adminPassword)) {
      newErrors.adminPassword = 'Password must contain at least one special character (@$!%*?&#)';
    } else if (!passwordRegex.test(adminPassword)) {
      newErrors.adminPassword = 'Password can only include letters, numbers, and these special characters: @$!%*?&#';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    const storeName = formData.storeName.trim();
    const adminUsername = formData.adminUsername.trim();
    const adminEmail = formData.adminEmail.trim();

    const selectedPlanMap: Record<PlanType, SubscriptionPlanType> = {
      Basic: 'BASIC',
      Pro: 'PRO',
      Advanced: 'ADVANCE',
    };

    const selectedPlan = selectedPlanMap[formData.selectedPlan];

    try {
      await authService.register(
        storeName,
        adminUsername,
        adminEmail,
        formData.adminPassword,
        selectedPlan,
      );

      toast.success('Registration started. Verify your email to continue to payment.');
      navigate('/pending-verification');
    } catch (err: any) {
      const message: string =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        '';
      const parsedFieldErrors = parseBackendFieldErrors(message);

      if (Object.keys(parsedFieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...parsedFieldErrors }));
        return;
      }

      const messageLower = message.toLowerCase();

      if (messageLower.includes('email')) {
        setErrors((prev) => ({ ...prev, adminEmail: message }));
      } else if (messageLower.includes('username')) {
        setErrors((prev) => ({ ...prev, adminUsername: message }));
      } else if (messageLower.includes('password')) {
        setErrors((prev) => ({ ...prev, adminPassword: message }));
      } else if (messageLower.includes('store name') || messageLower.includes('store')) {
        setErrors((prev) => ({ ...prev, storeName: message }));
      } else {
        toast.error(message || 'Failed to create account. Please try again.');
      }
    }
  };

  const plans: { id: PlanType; price: string; desc: string }[] = [
    { id: 'Basic', price: formatMonthlyPlanPrice(1299), desc: getPlanSubtitle('BASIC') },
    { id: 'Pro', price: formatMonthlyPlanPrice(2999), desc: getPlanSubtitle('PRO') },
    { id: 'Advanced', price: formatMonthlyPlanPrice(4999), desc: getPlanSubtitle('ADVANCE') },
  ];

  return (
    <AuthLayout
      title="Join PayPoint"
      subtitle="Create your enterprise account."
      mode="auth"
      hideIcon={true}
      hideScrollbar={true}
    >
      <AnimatePresence mode="wait">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-xl overflow-hidden"
          >
            {serverError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-3.5">
        <InputField
          label="Store Name"
          icon={<Building2 size={16} />}
          placeholder="Global Retail Inc."
          value={formData.storeName}
          error={errors.storeName}
          onChange={(v) => {
            setFormData({ ...formData, storeName: v });
            if (errors.storeName) setErrors({ ...errors, storeName: undefined });
          }}
        />
        <InputField
          label="Admin Username"
          icon={<User size={16} />}
          placeholder="johndoe"
          value={formData.adminUsername}
          error={errors.adminUsername}
          onChange={(v) => {
            setFormData({ ...formData, adminUsername: v });
            if (errors.adminUsername) setErrors({ ...errors, adminUsername: undefined });
          }}
        />
        <InputField
          label="Enterprise Email"
          type="email"
          icon={<Mail size={16} />}
          placeholder="admin@enterprise.com"
          value={formData.adminEmail}
          error={errors.adminEmail}
          onChange={(v) => {
            setFormData({ ...formData, adminEmail: v });
            if (errors.adminEmail) setErrors({ ...errors, adminEmail: undefined });
          }}
        />
        <InputField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={<Lock size={16} />}
          placeholder="********"
          value={formData.adminPassword}
          error={errors.adminPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          showPassword={showPassword}
          isPassword={true}
          onChange={(v) => {
            setFormData({ ...formData, adminPassword: v });
            if (errors.adminPassword) setErrors({ ...errors, adminPassword: undefined });
          }}
        />

        <div className="space-y-2 pt-1">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
            Select Subscription
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setFormData({ ...formData, selectedPlan: plan.id })}
                className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col text-left ${
                  formData.selectedPlan === plan.id
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                    : 'border-slate-100 bg-slate-50 hover:border-emerald-100'
                }`}
              >
                {formData.selectedPlan === plan.id && (
                  <CheckCircle2 className="absolute top-2 right-2 text-emerald-600" size={14} />
                )}
                <span
                  className={`text-[11px] font-black tracking-tight ${
                    formData.selectedPlan === plan.id ? 'text-emerald-700' : 'text-slate-900'
                  }`}
                >
                  {getPlanDisplayName(plan.id === 'Basic' ? 'BASIC' : plan.id === 'Pro' ? 'PRO' : 'ADVANCE')}
                </span>
                <span className="text-[10px] font-bold text-slate-500">{plan.price}</span>
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={loading}
          type="submit"
          className="w-full py-4 rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 bg-emerald-500 text-black shadow-emerald-200 hover:bg-emerald-600"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <span>Create Account & Continue</span>
              <ArrowRight size={18} className="text-black" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-8 text-center text-slate-500 text-xs font-bold">
        Already have an account ?
        <button
          onClick={() => navigate('/login')}
          className="ml-2 text-emerald-600 font-black hover:text-emerald-700 transition-colors underline decoration-emerald-100 underline-offset-4"
        >
          Sign in
        </button>
      </div>
    </AuthLayout>
  );
};

const InputField: React.FC<{
  label: string;
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  error?: string;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  onChange: (v: string) => void;
}> = ({
  label,
  icon,
  type = 'text',
  placeholder,
  value,
  error,
  isPassword,
  showPassword,
  onTogglePassword,
  onChange,
}) => (
  <div className="space-y-1 group">
    <label
      className={`block text-[9px] font-black uppercase tracking-widest transition-colors ml-1 ${
        error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-emerald-600'
      }`}
    >
      {label}
    </label>
    <div className="relative">
      <div
        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
          error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-emerald-500'
        }`}
      >
        {icon}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border rounded-xl py-2.5 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-semibold ${
          error
            ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/5'
            : 'border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5'
        }`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[9px] text-red-500 font-bold ml-1"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

export default RegisterPage;
