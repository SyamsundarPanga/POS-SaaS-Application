import React from 'react';
import { AlertCircle, TrendingUp, Package, BarChart3, Box, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const Inventory: React.FC = () => {
  return (
    <section id="inventory" className="py-4 bg-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        {/* CENTERED HEADING SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold mb-4"
          >
            <Box size={12} />
            <span>Supply Chain Intelligence</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-4 leading-tight whitespace-nowrap"
          >
            Real-Time <span className="text-blue-500 italic">Inventory</span> Management
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto"
          >
            Track stock levels across all locations in real-time. Automatic alerts for low inventory, intelligent restocking suggestions, and seamless supply chain integration.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: 3D Visual Animation (Order 1 on Desktop) */}
          <div className="relative h-[500px] flex items-center justify-center order-2 lg:order-1">
            <div className="relative w-full max-w-sm" style={{ perspective: '1500px' }}>

              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotateY: [10, -10, 10],
                  rotateX: [-5, 5, -5]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-20 flex flex-col items-center"
              >

                {/* FLOATING PRODUCT CARD 1 (Low Stock Alert) */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="w-52 bg-white p-3 rounded-xl shadow-xl border-l-4 border-l-amber-400 border border-slate-100 mb-[-20px] z-40 relative transform -rotate-6 -translate-x-12"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-800 tracking-tight">SKU: DENIM-32</span>
                    <AlertCircle size={14} className="text-amber-500 animate-pulse" />
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 w-[15%]" />
                  </div>
                  <div className="mt-2 text-[9px] font-bold text-amber-600 uppercase">Low Stock: 12 units</div>
                </motion.div>

                {/* CENTRAL INVENTORY CORE */}
                <div className="w-72 bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl relative z-30 overflow-hidden border border-white/10">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Package className="text-blue-400 w-24 h-24" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                      <span className="text-blue-400 font-mono text-[9px] tracking-[0.2em] uppercase">Live Sync Active</span>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[8px] text-slate-500 uppercase font-black">Total Stock</p>
                          <TrendingUp size={10} className="text-green-400" />
                        </div>
                        <p className="text-white font-mono text-lg tracking-tighter">1,284,092</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Warehouses</p>
                          <p className="text-white font-mono text-xs uppercase">14 Sites</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Status</p>
                          <p className="text-blue-400 font-mono text-xs">Optimized</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scanning Beam Animation */}
                  <motion.div
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent z-0 pointer-events-none"
                  />
                </div>

                {/* FLOATING PRODUCT CARD 2 (In Stock) */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="w-48 bg-white p-3 rounded-xl shadow-lg border border-slate-100 mt-[-20px] z-40 relative transform rotate-3 translate-x-16"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[10px] font-black text-slate-800 uppercase">Cotton T-Shirt</span>
                  </div>
                  <p className="text-[14px] font-mono text-slate-600">842 Units</p>
                </motion.div>

                {/* Ground Glow */}
                <div className="w-48 h-8 bg-blue-500/20 blur-[40px] rounded-full mt-2" />
              </motion.div>

              {/* Orbiting Statistics */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-10 border border-slate-200/50 rounded-full scale-[1.2]"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-lg border border-slate-50">
                  <BarChart3 size={18} className="text-blue-500" />
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-white p-2 rounded-xl shadow-lg border border-slate-50">
                  <Package size={18} className="text-slate-400" />
                </div>
              </motion.div>

            </div>
          </div>

          {/* Right: Features Matter (Order 2 on Desktop) */}
          <div className="space-y-6 order-1 lg:order-2">
            {[
              {
                icon: AlertCircle,
                title: 'Smart Alerts',
                description: 'Get instant notifications when stock levels fall below threshold, preventing lost sales and out-of-stock scenarios.'
              },
              {
                icon: TrendingUp,
                title: 'Demand Forecasting',
                description: 'AI-powered analytics predict future demand based on historical data to optimize your procurement cycle.'
              },
              {
                icon: Package,
                title: 'Multi-Location Sync',
                description: 'Inventory updates instantly across all online and physical store locations, ensuring a single source of truth.'
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-blue-500 group-hover:border-blue-500 transition-all duration-300 group-hover:shadow-md group-hover:shadow-blue-200">
                    <Icon className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors" />
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

export default Inventory;