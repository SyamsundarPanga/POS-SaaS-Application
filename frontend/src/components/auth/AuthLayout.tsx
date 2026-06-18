import React from 'react';
import { motion } from 'framer-motion';
import AuthGraphic from './AuthGraphic';

interface AuthLayoutProps {
    children: React.ReactNode;
    mode?: 'auth' | 'security';
    title: string;
    subtitle: string;
    hideIcon?: boolean;
    hideScrollbar?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
    children,
    mode = 'auth',
    title,
    subtitle,
    hideIcon = false,
    hideScrollbar = false
}) => {
    return (
        <div className="h-screen w-full flex bg-white font-sans selection:bg-emerald-100 overflow-hidden relative">
            {/* LEFT SIDE (Graphic) */}
            <AuthGraphic mode={mode} />

            {/* RIGHT SIDE (Form) */}
            <div className={`w-full lg:w-1/2 flex items-center justify-center z-10 overflow-y-auto bg-white ${hideScrollbar ? 'scrollbar-hide' : ''}`}
                style={hideScrollbar ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : {}}>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-full max-w-md px-6 py-12"
                >
                    <div className="mb-8">
                        {!hideIcon && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/10"
                            >
                                <div className="w-4 h-4 bg-emerald-500 rotate-45" />
                            </motion.div>
                        )}
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                        <p className="text-slate-500 text-sm font-bold mt-1 opacity-80">{subtitle}</p>
                    </div>

                    {children}
                </motion.div>
            </div>
        </div>
    );
};

export default AuthLayout;
