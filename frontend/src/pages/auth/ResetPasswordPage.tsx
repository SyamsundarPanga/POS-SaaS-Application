import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight, Loader2, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import authService from '../../services/authService';
import AuthLayout from '../../components/auth/AuthLayout';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const resetToken = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const isTokenMissing = !email || !resetToken;

  const validate = (): boolean => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!passwordRegex.test(newPassword)) {
      newErrors.newPassword = 'Password must be 8-64 chars, include uppercase, lowercase, number, and special character';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authService.resetPassword(email, resetToken, newPassword, confirmPassword);
      setSuccess(response?.message || 'Password reset successful.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isTokenMissing) {
    return (
      <AuthLayout
        title="Invalid Link"
        subtitle="This reset link is invalid or incomplete."
        mode="security"
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              <ShieldAlert size={32} />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-bold px-4">
            The security token provided in your URL is missing or has expired. Please verify your OTP again.
          </p>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/forgot-password')}
            className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl hover:bg-black transition-all"
          >
            Request New OTP
          </motion.button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Create a strong, unique password for your account."
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
            <CheckCircle2 size={14} className="shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
        <div className="space-y-1 group">
          <label className={`block text-[9px] font-black uppercase tracking-widest transition-colors ml-1 ${errors.newPassword ? 'text-red-500' : 'text-slate-400 group-focus-within:text-emerald-600'}`}>
            New Password
          </label>
          <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.newPassword ? 'text-red-400' : 'text-slate-400 group-focus-within:text-emerald-500'}`}>
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
              }}
              className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-12 text-sm font-semibold outline-none transition-all ${errors.newPassword
                ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/5'
                : 'border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5'
                }`}
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <AnimatePresence>
            {errors.newPassword && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[9px] text-red-500 font-bold ml-1"
              >
                {errors.newPassword}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1 group">
          <label className={`block text-[9px] font-black uppercase tracking-widest transition-colors ml-1 ${errors.confirmPassword ? 'text-red-500' : 'text-slate-400 group-focus-within:text-emerald-600'}`}>
            Confirm Password
          </label>
          <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.confirmPassword ? 'text-red-400' : 'text-slate-400 group-focus-within:text-emerald-500'}`}>
              <ShieldCheck size={16} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-12 text-sm font-semibold outline-none transition-all ${errors.confirmPassword
                ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/5'
                : 'border-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5'
                }`}
              placeholder="Re-enter new password"
            />
          </div>
          <AnimatePresence>
            {errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[9px] text-red-500 font-bold ml-1"
              >
                {errors.confirmPassword}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={loading}
          type="submit"
          className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;

