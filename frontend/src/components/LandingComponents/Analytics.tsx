import React from 'react';
import { BarChart3, TrendingUp, Users, PieChart, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics: React.FC = () => {
  return (
    <section id="analytics" className="py-4 bg-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-50 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        {/* CENTERED HEADING SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold mb-4"
          >
            <Activity size={12} />
            <span>Intelligence Core</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-4 leading-tight whitespace-nowrap"
          >
            Advanced <span className="text-orange-500 italic">Analytics</span> & BI
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto"
          >
            Gain deep insights into your business performance. Real-time dashboards, customizable reports, and predictive analytics to drive informed decisions.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: 3D Analytic Cube Visual */}
          <div className="relative h-[500px] flex items-center justify-center order-2 lg:order-1">
            <div className="relative w-full max-w-sm flex items-center justify-center" style={{ perspective: '1200px' }}>

              {/* THE ANALYTIC CUBE */}
              <motion.div
                animate={{
                  rotateY: [0, 360],
                  rotateX: [0, 360],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-32 h-32 z-40"
              >
                {/* Cube Faces */}
                {[
                  { rotate: 'rotateY(0deg)', icon: <BarChart3 className="text-orange-500" /> },
                  { rotate: 'rotateY(90deg)', icon: <PieChart className="text-orange-400" /> },
                  { rotate: 'rotateY(180deg)', icon: <TrendingUp className="text-orange-600" /> },
                  { rotate: 'rotateY(-90deg)', icon: <Activity className="text-orange-500" /> },
                  { rotate: 'rotateX(90deg)', icon: <Zap className="text-orange-300" /> },
                  { rotate: 'rotateX(-90deg)', icon: <Users className="text-orange-500" /> },
                ].map((face, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 bg-white border-2 border-orange-100 flex items-center justify-center rounded-xl shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]"
                    style={{
                      transform: `${face.rotate} translateZ(64px)`,
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {face.icon}
                  </div>
                ))}
              </motion.div>

              {/* PREDICTIVE ENGINE BASE */}
              <div className="absolute w-80 bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl z-20 top-1/2 -translate-y-10 border border-white/10 overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                    <span className="text-orange-400 font-mono text-[9px] tracking-[0.2em] uppercase">Predictive Engine</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Daily Sales</p>
                      <p className="text-white font-mono text-xs font-bold">₹84,500</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Growth</p>
                      <p className="text-orange-400 font-mono text-xs font-bold">+23%</p>
                    </div>
                  </div>
                </div>
                {/* Decorative scanning line */}
                <motion.div
                  animate={{ left: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent skew-x-12"
                />
              </div>

              {/* Orbiting Activity Nodes */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-10 border border-orange-100 rounded-full scale-[1.3]"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-orange-50 text-[10px] font-bold text-slate-400">
                  Activity
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-orange-500 w-2 h-2 rounded-full shadow-[0_0_10px_#f97316]" />
              </motion.div>

              {/* Ground Glow */}
              <div className="absolute bottom-10 w-48 h-10 bg-orange-500/20 blur-[50px] rounded-full" />
            </div>
          </div>

          {/* Right: Features Matter */}
          <div className="space-y-6 order-1 lg:order-2">
            {[
              {
                icon: BarChart3,
                title: 'Real-Time Dashboards',
                description: 'Live insights into sales, revenue, and customer behavior metrics at a glance.'
              },
              {
                icon: TrendingUp,
                title: 'Sales Analytics',
                description: 'Detailed reports on top products, categories, and performance across all locations.'
              },
              {
                icon: Users,
                title: 'Customer Insights',
                description: 'Understand purchase patterns and lifetime value with AI-driven behavioral profiling.'
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-5 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-orange-500 group-hover:border-orange-500 transition-all duration-300 group-hover:shadow-md group-hover:shadow-orange-200">
                    <Icon className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold text-xl mb-1">{feature.title}</h4>
                    <p className="text-slate-500 text-base leading-snug">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Analytics;