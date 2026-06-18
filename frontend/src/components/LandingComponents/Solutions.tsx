import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  Layout,
  CheckCircle2,
  Zap,
  ShieldCheck,
  BarChart3
} from 'lucide-react';

const Solutions: React.FC = () => {
  const [activeTier, setActiveTier] = useState<number>(0);

  const tiers = [
    {
      title: 'Cashier Terminal',
      shortTitle: 'Cashier',
      subtitle: 'FRONT-LINE TRANSACTIONS',
      icon: <Smartphone className="w-6 h-6" />,
      description: 'Fast, efficient transaction processing for customer checkouts with barcode scanning and instant receipt generation.',
      features: ['Barcode Integration', 'Quick-Pay Keys', 'Offline Mode'],
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-500'
    },
    {
      title: 'Branch Manager',
      shortTitle: 'Manager',
      subtitle: 'LOCAL OPERATIONS',
      icon: <Layout className="w-6 h-6" />,
      description: 'Real-time oversight of your specific store. Track live sales, manage local inventory, and monitor staff performance.',
      features: ['Shift Analytics', 'Inventory Alerts', 'Staff Scheduling'],
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-500'
    },
    {
      title: 'Store Admin Panel',
      shortTitle: 'Store Admin',
      subtitle: 'ENTERPRISE CONTROL',
      icon: <Monitor className="w-6 h-6" />,
      description: 'The master command center. Manage product catalogs, customer loyalty, and financial reports across all global locations.',
      features: ['Global Catalog', 'Tax Logic engine', 'Cross-store Reports'],
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-500'
    }
  ];

  return (
    <section id="solutions" className="pt-12 pb-24 bg-slate-50 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-white -skew-x-12 -translate-x-32 z-0" />

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4"
          >
            <Zap size={14} /> Unified Commerce Platform
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-6">
            Three-Tier <span className="text-emerald-500">User Interfaces</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Role-specific interfaces optimized for different business functions,
            perfectly synchronized in real-time across your entire retail empire.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT: DYNAMIC 3D VISUALIZATION */}
          <div className="relative h-[600px] flex items-center justify-center order-2 lg:order-1">

            <div className="relative z-10 w-full max-w-md transform perspective-1000 rotate-x-12 rotate-y-12">

              <div className="space-y-[-120px] pt-20">
                {tiers.map((tier, idx) => (
                  <motion.div
                    key={idx}
                    initial={false}
                    animate={{
                      y: activeTier === idx ? -60 : 0,
                      x: activeTier === idx ? -30 : 0,
                      rotateX: 45,
                      rotateZ: 45,
                      scale: activeTier === idx ? 1.05 : 1,
                      opacity: activeTier === idx ? 1 : 0.35
                    }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                    className={`relative w-full aspect-[16/10] rounded-2xl border-4 border-white ${tier.color} flex flex-col p-6 overflow-visible`}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* DYNAMIC FLOATING LABEL */}
                    <AnimatePresence>
                      {activeTier === idx && (
                        <motion.div
                          initial={{ opacity: 0, x: -20, rotateZ: -45 }}
                          animate={{ opacity: 1, x: -50, rotateZ: -45 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="absolute -left-12 top-0 bg-white px-4 py-2 rounded-lg border border-slate-100 z-50"
                        >
                          <span className={`text-sm font-black uppercase tracking-tighter ${tier.textColor}`}>
                            {tier.shortTitle}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Mock Interface Content */}
                    <div className="w-full flex justify-between items-center mb-4">
                      <div className="w-12 h-2.5 bg-white/40 rounded-full" />
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-white/60" />
                        <div className="w-3 h-3 rounded-full bg-white/60" />
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="w-full h-1.5 bg-white/20 rounded-full" />
                      <div className="w-3/4 h-1.5 bg-white/20 rounded-full" />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-auto">
                      <div className="h-16 bg-white/15 rounded-xl backdrop-blur-sm border border-white/10" />
                      <div className="h-16 bg-white/25 rounded-xl backdrop-blur-sm border border-white/10" />
                      <div className="h-16 bg-white/15 rounded-xl backdrop-blur-sm border border-white/10" />
                    </div>

                    {/* Background Subtle Watermark */}
                    <div className="absolute bottom-4 right-6 text-[40px] font-black text-white/10 select-none leading-none">
                      0{idx + 1}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* ORBITING ELEMENTS */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full scale-[1.4] z-0 pointer-events-none"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white p-2.5 rounded-xl border border-slate-50">
                  <ShieldCheck className="text-emerald-500 w-6 h-6" />
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white p-2.5 rounded-xl border border-slate-50">
                  <BarChart3 className="text-blue-500 w-6 h-6" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE CONTENT CARDS */}
          <div className="space-y-4 order-1 lg:order-2">
            {tiers.map((tier, idx) => (
              <motion.div
                key={idx}
                onMouseEnter={() => setActiveTier(idx)}
                onViewportEnter={() => setActiveTier(idx)}
                viewport={{ amount: 0.6 }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${activeTier === idx
                  ? `bg-white ${tier.borderColor} scale-[1.02] z-20`
                  : 'bg-transparent border-transparent grayscale opacity-50 hover:opacity-80'
                  }`}
              >
                {/* Active Indicator Bar */}
                {activeTier === idx && (
                  <motion.div
                    layoutId="activeBar"
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${tier.color}`}
                  />
                )}

                <div className="flex gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${tier.color} text-white`}>
                    {tier.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                        {tier.subtitle}
                      </span>
                      {activeTier === idx && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.lightColor} ${tier.textColor}`}
                        >
                          Live View
                        </motion.span>
                      )}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">{tier.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      {tier.description}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {tier.features.map((f, i) => (
                        <span key={i} className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-colors ${activeTier === idx ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <CheckCircle2 size={12} className={activeTier === idx ? 'text-emerald-400' : 'text-slate-400'} /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Solutions;