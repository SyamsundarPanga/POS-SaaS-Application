import React from 'react';
import { CreditCard, Lock, Zap, ShieldCheck, Wallet, CheckCircle2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

const Payment: React.FC = () => {
  return (
    <section id="payment" className="py-4 bg-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-purple-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-slate-50 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        {/* CENTERED HEADING SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-xs font-bold mb-4"
          >
            <ShieldCheck size={12} />
            <span>Secure Gateway Tier</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-4 leading-tight whitespace-nowrap"
          >
            Flexible <span className="text-purple-600 italic">Payment</span> Processing
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto"
          >
            Accept all payment methods with industry-leading security. Support credit cards, digital wallets, UPIs, and offline transactions with instant settlement.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: Content Matters */}
          <div className="space-y-6 order-2 lg:order-1">
            {[
              {
                icon: CreditCard,
                title: 'Multiple Methods',
                description: 'Support for Global Credit/Debit cards, Digital wallets, UPI, QR codes, and offline cash reconciliation.'
              },
              {
                icon: Lock,
                title: 'PCI DSS Compliant',
                description: 'End-to-end encryption and tokenization ensures compliance with global payment security standards.'
              },
              {
                icon: Zap,
                title: 'Instant Settlement',
                description: 'Payments settled to your enterprise account within 24 hours with detailed automated reconciliation.'
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-5 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-purple-600 group-hover:border-purple-600 transition-all duration-300 group-hover:shadow-md group-hover:shadow-purple-200">
                    <Icon className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold text-xl mb-1">{feature.title}</h4>
                    <p className="text-slate-500 text-base leading-snug">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right: 3D Payment Animation */}
          <div className="relative h-[500px] flex items-center justify-center order-1 lg:order-2">
            <div className="relative w-full max-w-sm" style={{ perspective: '1500px' }}>

              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotateY: [15, -15, 15],
                  rotateX: [10, -10, 10]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-20 flex flex-col items-center"
              >

                {/* 3D CREDIT CARD */}
                <motion.div
                  whileHover={{ rotateY: 20, translateZ: 50 }}
                  className="w-64 h-40 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-900 rounded-2xl shadow-[0_30px_60px_rgba(88,28,135,0.4)] p-6 text-white mb-[-60px] z-40 relative overflow-hidden border border-white/20"
                >
                  <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-10 h-8 bg-amber-400/80 rounded-md backdrop-blur-sm" />
                    <DollarSign size={24} className="text-purple-200/50" />
                  </div>
                  <p className="font-mono tracking-[0.2em] text-sm mb-4">•••• •••• •••• 8824</p>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-purple-200">PAYPOINT ENTERPRISE</span>
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-red-500/80" />
                      <div className="w-6 h-6 rounded-full bg-orange-500/80" />
                    </div>
                  </div>
                </motion.div>

                {/* TRANSACTION MODULE */}
                <div className="w-72 bg-slate-900 p-6 pt-16 rounded-[2.5rem] shadow-2xl relative z-30 border border-white/10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Authorized</span>
                      </div>
                      <span className="text-emerald-400 font-mono text-xs">+$2,499.00</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                        <span>Encryption</span>
                        <span className="text-purple-400">Active</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="h-full w-1/2 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Fee</p>
                        <p className="text-white font-mono text-xs">0.2%</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Speed</p>
                        <p className="text-purple-400 font-mono text-xs">Instant</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ground Security Halo */}
                <div className="w-48 h-8 bg-purple-500/20 blur-[40px] rounded-full mt-2 animate-pulse" />
              </motion.div>

              {/* Orbiting Elements */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-10 border border-purple-100 rounded-full scale-[1.3]"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-lg border border-purple-50">
                  <Wallet size={18} className="text-purple-500" />
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-white p-2 rounded-xl shadow-lg border border-purple-50">
                  <Lock size={18} className="text-slate-400" />
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Payment;