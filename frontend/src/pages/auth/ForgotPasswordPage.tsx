
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import authService from '../../services/authService';
import AuthLayout from '../../components/auth/AuthLayout';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledEmail = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams]);
  const [email, setEmail] = useState(prefilledEmail);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateRequest = (): boolean => {
    const newErrors: { email?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestResetLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateRequest()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.requestPasswordResetLink(email.trim());
      setSuccess(
        response?.message || 'If an account exists for this email, a reset link has been sent.',
      );
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message || 'Failed to send reset link. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Securely recover your enterprise account."
      mode="security"
    >
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-xl flex items-center gap-2"
          >
            <ShieldAlert size={14} className="shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold rounded-xl flex items-center gap-2"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleRequestResetLink} autoComplete="off" className="space-y-4">
        <div className="space-y-1 group">
          <label
            className={`block text-[9px] font-black uppercase tracking-widest transition-colors ml-1 ${errors.email ? 'text-red-500' : 'text-slate-400 group-focus-within:text-emerald-600'}`}
          >
            Email Address
          </label>
          <div className="relative">
            <div
              className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-red-400' : 'text-slate-400 group-focus-within:text-emerald-500'}`}
            >
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              readOnly={!!prefilledEmail}
              className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-4 text-sm font-semibold outline-none transition-all ${
                errors.email
                  ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/5'
                  : 'border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5'
              }`}
              placeholder="admin@enterprise.com"
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[9px] text-red-500 font-bold ml-1"
              >
                {errors.email}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={loading}
          type="submit"
          className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight size={18} className="text-emerald-400" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-10 text-center">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to standard sign in
        </button>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
