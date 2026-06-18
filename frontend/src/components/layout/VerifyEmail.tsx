import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import authService from '../../services/authService';
import AuthLayout from '../auth/AuthLayout';

const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    
    // 1. Extract the token from the URL
    const token = searchParams.get('token');

    useEffect(() => {
        const performVerification = async () => {
            // If no token is present, show error immediately
            if (!token) {
                setStatus('error');
                return;
            }

            try {
                // 2. Call the backend via authService
                const result = await authService.verifyEmail(token);
                localStorage.setItem('email_verification_completed', 'true');
                localStorage.setItem('email_verification_completed_at', String(Date.now()));
                
                setStatus('success');

                // Try to find and focus the pending-verification tab
                setTimeout(() => {
                    if (result?.completed && !result?.sessionToken) {
                        window.location.href = '/login';
                        return;
                    }

                    // Broadcast to all tabs
                    localStorage.setItem('email_verified_trigger', String(Date.now()));
                    
                    // Check if there's a pending-verification tab open
                    const hasPendingTab = sessionStorage.getItem('is_pending_verification_tab') === 'true';
                    
                    if (hasPendingTab) {
                        // This is the same tab, just reload
                        window.location.href = '/pending-verification';
                    } else {
                        // This is a new tab from email, try to close and redirect original
                        try {
                            // Try to close this tab (works if opened by user click)
                            window.close();
                            
                            // If close didn't work (tab still open), redirect
                            setTimeout(() => {
                                if (!window.closed) {
                                    window.location.href = '/pending-verification';
                                }
                            }, 500);
                        } catch (e) {
                            // Fallback: just redirect
                            window.location.href = '/pending-verification';
                        }
                    }
                }, 1500);
            } catch (error) {
                console.error("Verification failed:", error);
                setStatus('error');
            }
        };

        performVerification();
    }, [token]);

    return (
        <AuthLayout 
            title="Email Verification" 
            subtitle="Finalizing your account setup." 
            mode="auth" 
            hideIcon={true}
        >
            <div className="flex flex-col items-center py-12 text-center">
                {/* Loading State */}
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <Loader2 size={48} className="animate-spin text-emerald-500 mb-4" />
                        <p className="text-slate-600 font-bold">Verifying your link...</p>
                        <p className="text-slate-400 text-xs mt-2">Please do not close this window.</p>
                    </div>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                        </div>
                        <p className="text-emerald-600 font-black text-xl">Verified Successfully!</p>
                        <p className="text-slate-500 text-sm mt-2">
                            Taking you back to complete your setup...
                        </p>
                        <p className="text-xs text-slate-400 mt-4">
                            You can close this tab if it doesn't close automatically.
                        </p>
                    </motion.div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <XCircle size={48} className="text-red-500" />
                        </div>
                        <p className="text-red-600 font-black text-xl">Verification Failed</p>
                        <p className="text-slate-500 text-sm mt-2 px-6">
                            The link may be expired, already used, or invalid.
                        </p>
                    </motion.div>
                )}
            </div>
        </AuthLayout>
    );
};

export default VerifyEmail;
