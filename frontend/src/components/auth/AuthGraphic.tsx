import React from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, ShieldCheck, Lock, Fingerprint } from 'lucide-react';

interface AuthGraphicProps {
    mode: 'auth' | 'security';
}

const AuthGraphic: React.FC<AuthGraphicProps> = ({ mode }) => {
    return (
        <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center z-10 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-400/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-400/10 rounded-full blur-[120px]" />
            </div>

            <div
                className="relative flex items-center justify-center mt-12"
                style={{ perspective: '1200px' }}
            >
                {mode === 'auth' ? (
                    <>
                        {/* Auth Mode Graphic (Zap/Point) */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            className="absolute w-80 h-80 border-[3px] border-dashed border-emerald-500/20 rounded-full flex items-center justify-center"
                        >
                            <div className="absolute top-0 -translate-y-1/2 bg-white p-1.5 rounded-full shadow-lg border border-emerald-100">
                                <RefreshCw className="text-emerald-500 w-5 h-5" />
                            </div>
                            <div className="absolute bottom-0 translate-y-1/2 bg-white p-1.5 rounded-full shadow-lg border border-emerald-100">
                                <RefreshCw className="text-emerald-500 w-5 h-5 rotate-180" />
                            </div>
                        </motion.div>

                        <div className="flex items-start">
                            <div className="w-52 h-64 bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col p-8 border border-white/10 z-20">
                                <Zap className="text-emerald-400 mb-4" size={28} />
                                <div className="text-emerald-500 font-black text-5xl tracking-tighter mt-auto">
                                    PAY
                                </div>
                                <div className="text-[10px] text-slate-500 font-black tracking-[0.25em] mt-3 uppercase opacity-70">
                                    Secure Module
                                </div>
                            </div>

                            <motion.div
                                animate={{ y: [0, 15, 0], rotateY: [8, 0, 8], rotateX: [-5, -2, -5] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-52 h-64 bg-emerald-500 rounded-[2.5rem] shadow-2xl flex flex-col p-8 border border-black/5 mt-20 -ml-4"
                            >
                                <div className="w-10 h-10 rounded-full border-2 border-black/10 flex items-center justify-center mb-4">
                                    <div className="w-2.5 h-2.5 bg-black rounded-full" />
                                </div>
                                <div className="text-black font-black text-5xl tracking-tighter mt-auto">POINT</div>
                                <div className="text-[10px] text-emerald-900/60 font-black tracking-[0.25em] mt-3 uppercase">
                                    Terminal Node
                                </div>
                            </motion.div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Security Mode Graphic (Shield/Lock) */}
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                            className="absolute w-80 h-80 border-[3px] border-dashed border-emerald-500/20 rounded-full flex items-center justify-center"
                        >
                            <div className="absolute top-1/4 -left-3 bg-white p-1.5 rounded-full shadow-lg border border-emerald-100">
                                <Fingerprint className="text-emerald-500 w-5 h-5" />
                            </div>
                            <div className="absolute bottom-1/4 -right-3 bg-white p-1.5 rounded-full shadow-lg border border-emerald-100">
                                <Lock className="text-emerald-500 w-5 h-5" />
                            </div>
                        </motion.div>

                        <div className="flex items-start">
                            <div className="w-52 h-64 bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col p-8 border border-white/10 z-20">
                                <ShieldCheck className="text-emerald-400 mb-4" size={28} />
                                <div className="text-emerald-500 font-black text-5xl tracking-tighter mt-auto">
                                    SAFE
                                </div>
                                <div className="text-[10px] text-slate-500 font-black tracking-[0.25em] mt-3 uppercase opacity-70">
                                    Vault Kernel
                                </div>
                            </div>

                            <motion.div
                                animate={{ y: [0, -15, 0], rotateY: [-8, 0, -8], rotateX: [5, 2, 5] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-52 h-64 bg-emerald-500 rounded-[2.5rem] shadow-2xl flex flex-col p-8 border border-black/5 mt-20 -ml-4"
                            >
                                <div className="w-10 h-10 rounded-full border-2 border-black/10 flex items-center justify-center mb-4">
                                    <div className="w-4 h-1.5 bg-black rounded-full" />
                                </div>
                                <div className="text-black font-black text-5xl tracking-tighter mt-auto">GUARD</div>
                                <div className="text-[10px] text-emerald-900/60 font-black tracking-[0.25em] mt-3 uppercase">
                                    Identity Core
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </div>

            <div className="text-center mt-2 px-12 relative z-10 transition-all duration-700 ease-out">
                <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
                    {mode === 'auth' ? (
                        <>
                            Connect your commerce <br />
                            <span className="text-emerald-600 underline decoration-emerald-200 underline-offset-8 font-black">
                                effortlessly.
                            </span>
                        </>
                    ) : (
                        <>
                            Protecting your business <br />
                            <span className="text-emerald-600 underline decoration-emerald-200 underline-offset-8 font-black">
                                everywhere.
                            </span>
                        </>
                    )}
                </h2>
            </div>
        </div>
    );
};

export default AuthGraphic;
