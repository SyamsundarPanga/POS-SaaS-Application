import React from 'react';
import { Gift, Heart, Sparkles, Star, Award, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

const Loyalty: React.FC = () => {
  return (
    <section id="loyalty" className="py-4 bg-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-pink-50 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        {/* CENTERED HEADING SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-pink-600 text-xs font-bold mb-4"
          >
            <Star size={12} />
            <span>Retention Engine</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-4 leading-tight whitespace-nowrap"
          >
            Customer <span className="text-pink-500 italic">Loyalty</span> Programs
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto"
          >
            Increase customer retention and lifetime value with powerful, flexible loyalty programs. Manage store locations, teams, and operations from a single unified platform.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: Features List (Now Order 1) */}
          <div className="space-y-6 order-2 lg:order-1">
            {[
              {
                icon: Gift,
                title: 'Flexible Rewards',
                description: 'Design custom loyalty programs with points, cashback, or hybrid models that fit your brand identity.'
              },
              {
                icon: Heart,
                title: 'Customer Engagement',
                description: 'Drive repeat purchases with personalized automated offers and special birthday milestones.'
              },
              {
                icon: Sparkles,
                title: 'Tier-Based Programs',
                description: 'Create multi-level VIP tiers with escalating benefits to gamify the shopping experience.'
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-pink-500 group-hover:border-pink-500 transition-all duration-300 group-hover:shadow-md group-hover:shadow-pink-200">
                    <Icon className="w-6 h-6 text-pink-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold text-xl mb-1">{feature.title}</h4>
                    <p className="text-slate-500 text-base leading-snug">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right: 3D Loyalty Visual (Now Order 2) */}
          <div className="relative h-[480px] flex items-center justify-center order-1 lg:order-2">
            <div className="relative w-full max-w-sm flex items-center justify-center" style={{ perspective: '1500px' }}>

              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotateY: [10, -10, 10], // Adjusted rotation for right-side placement
                  rotateX: [5, -5, 5]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-20 flex flex-col items-center"
              >

                {/* VIP TIER CARD (Top Float) */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="w-56 bg-gradient-to-br from-pink-500 to-rose-600 p-4 rounded-xl shadow-2xl border border-white/20 mb-[-40px] z-40 relative transform rotate-6 translate-x-8"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                      <Trophy size={16} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black text-white/80 uppercase">Platinum Tier</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-black text-lg tracking-tight">24,500 PTS</p>
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-[85%]" />
                    </div>
                  </div>
                </motion.div>

                {/* REWARD VAULT (Base Module) */}
                <div className="w-80 bg-slate-900 p-8 pt-16 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] relative z-30 border border-white/10 overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Gift className="text-pink-400 w-24 h-24" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
                      <span className="text-pink-400 font-mono text-[9px] tracking-[0.2em] uppercase">Reward Core Active</span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                          <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Redeemed</p>
                          <p className="text-white font-mono text-sm">₹14.2K</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                          <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Active</p>
                          <p className="text-pink-400 font-mono text-sm">4.8K Users</p>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <Heart size={14} className="text-pink-400" />
                        </div>
                        <div className="flex-1">
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 3, repeat: Infinity }}
                              className="h-full w-1/2 bg-pink-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ground Glow */}
                <div className="w-48 h-8 bg-pink-500/20 blur-[40px] rounded-full mt-2" />
              </motion.div>

              {/* Orbiting HUD Elements */}
              <motion.div
                animate={{ rotate: -360 }} // Reversed rotation for visual balance
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-10 border border-pink-100/50 rounded-full scale-[1.3]"
              >
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 bg-white p-2.5 rounded-xl shadow-lg border border-pink-50">
                  <Award size={18} className="text-pink-500" />
                </div>
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 bg-white p-2.5 rounded-xl shadow-lg border border-pink-50">
                  <Gift size={18} className="text-slate-400" />
                </div>
              </motion.div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Loyalty;