import React from 'react';
import { Database, Shield, Zap, Globe, Server, Layers, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

const MultiTenant: React.FC = () => {
  return (
    <section id="MultiTenant" className="pt-16 pb-0 bg-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-slate-50 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        {/* CENTERED HEADING SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold mb-6"
          >
            <Layers size={14} />
            <span>Infrastructure Design</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-4 leading-tight whitespace-nowrap"
          >
            Multi-Tenant <span className="text-emerald-500 italic">Architecture</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-slate-600 text-xl leading-relaxed"
          >
            Built from the ground up for enterprise retailers. Manage multiple store locations
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-2 items-center">

          {/* Left: Features Matter */}
          <div className="space-y-0">
            {[
              {
                icon: Database,
                title: 'Data Isolation',
                description: 'Each tenant\'s data is completely isolated with dedicated database partitions and enterprise-grade encryption.'
              },
              {
                icon: Shield,
                title: 'Security First',
                description: 'Bank-grade encryption, role-based access control (RBAC), and comprehensive audit trails for full compliance.'
              },
              {
                icon: Zap,
                title: 'Instant Scaling',
                description: 'Our horizontal scaling automatically handles thousands of concurrent transactions across all global locations.'
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-6 group"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-emerald-200">
                    <Icon className="w-7 h-7 text-emerald-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold text-2xl mb-2">{feature.title}</h4>
                    <p className="text-slate-500 text-lg leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right: Enhanced 3D Visual Animation */}
          <div className="relative h-[650px] flex items-center justify-center">
            <div className="relative w-full max-w-lg" style={{ perspective: '2000px' }}>

              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotateY: [-15, 15, -15],
                  rotateX: [5, -5, 5]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-20 flex flex-col items-center"
              >

                {/* TENANT LAYER 1 (Top) */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="w-56 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-emerald-100 mb-[-30px] z-40 relative transform rotate-12"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                      <Globe size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-800 tracking-tight">TENANT_ALPHA</span>
                  </div>
                </motion.div>

                {/* TENANT LAYER 2 (Middle Float) */}
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-60 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100 mb-[-30px] z-35 relative ml-20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white">
                      <Cpu size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-800 tracking-tight">TENANT_BETA</span>
                  </div>
                </motion.div>

                {/* CORE ARCHITECTURE */}
                <div className="w-80 bg-slate-900 p-8 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] relative z-30 overflow-hidden border border-white/10">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Server className="text-emerald-400 w-32 h-32" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]" />
                      <span className="text-emerald-400 font-mono text-[10px] tracking-[0.2em] uppercase">Hyper-Scale Core</span>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                          <span>Data Load</span>
                          <span className="text-emerald-400">Isolated</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            animate={{ width: ['20%', '85%', '20%'] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                          <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Encrypted</p>
                          <p className="text-white font-mono text-sm uppercase">AES-256</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                          <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Response</p>
                          <p className="text-emerald-400 font-mono text-sm">9ms</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-64 h-12 bg-emerald-500/20 blur-[60px] rounded-full mt-4" />
              </motion.div>

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-10 border border-slate-200/50 rounded-full scale-[1.4]"
              >
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-2xl shadow-xl border border-slate-50">
                  <Shield size={22} className="text-emerald-500" />
                </div>
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-2xl shadow-xl border border-slate-50">
                  <Database size={22} className="text-slate-400" />
                </div>
              </motion.div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default MultiTenant;
