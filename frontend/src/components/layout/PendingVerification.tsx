import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import authService from '../../services/authService';

const PendingVerification: React.FC = () => {
  const paymentLockKey = 'subscription_payment_lock';
  const tabIdRef = useRef<string>('');
  const navigate = useNavigate();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [currentPlanType, setCurrentPlanType] = useState<string>('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('your registered email');
  const [isPaying, setIsPaying] = useState(false);

  const isPaymentWindowOpen = useRef(false);

  const completeRegistration = async (message?: string) => {
    localStorage.removeItem('email_verification_completed');
    localStorage.removeItem(paymentLockKey);

    if (message) {
      localStorage.setItem('post_registration_success_message', message);
    }

    const credentials = authService.getPendingRegistrationCredentials();

    if (credentials?.email && credentials?.password) {
      try {
        await authService.login(credentials.email, credentials.password);
        window.location.assign('/dashboard');
        return;
      } catch (error) {
        console.warn('Automatic login after registration failed, redirecting to sign in.', error);
      }
    }

    authService.clearPendingRegistrationSession();
    authService.clearPendingRegistrationCredentials();
    window.location.assign('/login');
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );
      if (existing) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlanPayment = async () => {
    if (!currentPlanType) {
      setStatusError('Selected plan is missing. Please register again.');
      return;
    }

    const currentLock = localStorage.getItem(paymentLockKey);
    if (currentLock && currentLock !== tabIdRef.current) {
      setStatusError('Payment is already active in another tab. Continue there only.');
      return;
    }

    localStorage.setItem(paymentLockKey, tabIdRef.current);
    isPaymentWindowOpen.current = true;
    setIsPaying(true);
    setStatusError(`Initializing secure payment for ${currentPlanType}...`);

    try {
      const order = await authService.createPendingRegistrationPaymentOrder('MONTHLY');
      const razorpayLoaded = await loadRazorpayScript();

      if (!razorpayLoaded) {
        throw new Error('Payment gateway failed to load.');
      }

      const rz = new (window as any).Razorpay({
        key: order.keyId,
        amount: Number(order.amount) * 100,
        currency: order.currency,
        name: 'PayPoint',
        description: `${currentPlanType} Subscription`,
        order_id: order.id,
        handler: async (response: any) => {
          setStatusError('Verifying transaction...');
          const result = await authService.verifyPendingRegistrationPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          await completeRegistration(result.message || 'Account created successfully.');
        },
        modal: {
          ondismiss: () => {
            isPaymentWindowOpen.current = false;
            setIsPaying(false);
            localStorage.removeItem(paymentLockKey);
            setStatusError('An active paid subscription is required to proceed.');
          },
        },
      });
      rz.open();
    } catch (error: any) {
      setStatusError(error?.message || 'Could not open payment window.');
      isPaymentWindowOpen.current = false;
      setIsPaying(false);
      localStorage.removeItem(paymentLockKey);
    }
  };

  useEffect(() => {
    tabIdRef.current = sessionStorage.getItem('pending_tab_id') || crypto.randomUUID();
    sessionStorage.setItem('pending_tab_id', tabIdRef.current);
    sessionStorage.setItem('is_pending_verification_tab', 'true');
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkRegistrationStatus = async () => {
      if (isPaymentWindowOpen.current) return;

      if (!authService.getPendingRegistrationSession()) {
        setStatusError('Registration session not found. Please create your account again.');
        return;
      }

      setCheckingStatus(true);
      try {
        const registrationStatus = await authService.getPendingRegistrationStatus();

        setVerifiedEmail(registrationStatus.adminEmail || 'your registered email');
        setIsEmailVerified(Boolean(registrationStatus.emailVerified));
        setCurrentPlanType(registrationStatus.plan?.toUpperCase?.() || '');

        if (registrationStatus.completed || registrationStatus.paymentStatus === 'SUCCESS') {
          clearInterval(interval);
          await completeRegistration(registrationStatus.message || 'Account created successfully.');
          return;
        }

        if (!registrationStatus.emailVerified) {
          setStatusError('Please verify your email to continue.');
          return;
        }

        setStatusError(null);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'We could not confirm your account status yet. Please try again.';

        if (
          message.toLowerCase().includes('not found') ||
          message.toLowerCase().includes('expired') ||
          message.toLowerCase().includes('register again')
        ) {
          authService.clearPendingRegistrationSession();
        }

        setStatusError(message);
      } finally {
        setCheckingStatus(false);
      }
    };

    interval = setInterval(checkRegistrationStatus, 5000);
    checkRegistrationStatus();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'email_verification_completed' && event.newValue === 'true') {
        setIsEmailVerified(true);
        setStatusError(null);
      }

      if (event.key === paymentLockKey && event.newValue && event.newValue !== tabIdRef.current) {
        setIsPaying(false);
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'EMAIL_VERIFIED') {
        setIsEmailVerified(true);
        setStatusError(null);
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);

    return () => {
      const currentLock = localStorage.getItem(paymentLockKey);
      if (currentLock === tabIdRef.current) {
        localStorage.removeItem(paymentLockKey);
      }
      sessionStorage.removeItem('is_pending_verification_tab');
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return (
    <AuthLayout
      title="Verify Your Account"
      subtitle="Almost there! Please verify your email and complete payment."
    >
      <div className="flex flex-col items-center py-6 text-center">
        {checkingStatus && !statusError && (
          <div className="text-xs text-emerald-600 font-bold mb-2">
            Checking activation status...
          </div>
        )}

        {statusError && (
          <div className="text-xs text-red-600 font-bold mb-4 px-4 py-2 bg-red-50 rounded-lg">
            {statusError}
          </div>
        )}

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500 shadow-inner">
            <Mail size={42} strokeWidth={1.5} />
          </div>
        </motion.div>

        <div className="space-y-4 mb-10">
          <p className="text-slate-600 text-sm">
            We sent a verification link to <br />
            <span className="text-slate-900 font-black">{verifiedEmail}</span>
          </p>
        </div>

        <div className="w-full space-y-3">
          <a
            href="https://mail.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-emerald-500 text-black font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
          >
            Open Gmail <ExternalLink size={16} />
          </a>

          <button
            onClick={handlePlanPayment}
            disabled={!isEmailVerified || isPaying || !currentPlanType}
            className="w-full py-4 rounded-2xl font-bold text-xs bg-emerald-500 text-black transition-all hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPaying ? 'Processing Payment...' : 'Continue to Payment'}
          </button>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mt-10 flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </button>
      </div>
    </AuthLayout>
  );
};

export default PendingVerification;
