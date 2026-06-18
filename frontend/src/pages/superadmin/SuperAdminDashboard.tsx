import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  Building2,
  ChevronRight,
  Crown,
  TrendingUp,
  Activity,
  UserPlus,
  CalendarPlus,
  Zap,
  IndianRupee,
} from 'lucide-react';
import api from '../../services/api';

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  basicPlanCount: number;
  proPlanCount: number;
  advancePlanCount: number;
  totalMonthlyRevenue: number;
  projectedAnnualRevenue: number;
  totalUsers: number;
  totalBranches: number;
  totalProducts: number;
  totalOrders: number;
  tenantsCreatedThisMonth: number;
  tenantsCreatedToday: number;
  todayRevenue: number;
  todayOrders: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const PLAN_COLORS = ['#10b981', '#059669', '#047857'];

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/superadmin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscriptionData = stats
    ? [
        { name: 'Basic', value: stats.basicPlanCount || 0, color: PLAN_COLORS[0] },
        { name: 'Pro', value: stats.proPlanCount || 0, color: PLAN_COLORS[1] },
        { name: 'Advance', value: stats.advancePlanCount || 0, color: PLAN_COLORS[2] },
      ].filter((item) => item.value > 0)
    : [];

  const displaySubscriptionData =
    subscriptionData.length > 0
      ? subscriptionData
      : [{ name: 'No Data', value: 1, color: '#f1f5f9' }];

  const totalSubscriptions =
    (stats?.basicPlanCount || 0) + (stats?.proPlanCount || 0) + (stats?.advancePlanCount || 0);

  const growthData = stats
    ? [
        { name: 'Tenants', value: stats.totalTenants || 0 },
        { name: 'Basic', value: stats.basicPlanCount || 0 },
        { name: 'Pro', value: stats.proPlanCount || 0 },
        { name: 'Advance', value: stats.advancePlanCount || 0 },
      ]
    : [];

  if (loading) return null;

  return (
    <motion.div
      className="max-w-7xl mx-auto px-8 py-8 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time overview of your multi-tenant ecosystem
          </p>
        </div>
        <button
          onClick={() => navigate('/superadmin/tenants')}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
        >
          Monitor Tenants
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <KpiCard
          title="Total Tenants"
          value={stats?.totalTenants || 0}
          subtitle={`${stats?.activeTenants || 0} active · ${stats?.inactiveTenants || 0} inactive`}
          icon={<Building2 className="w-6 h-6 text-emerald-600" />}
          gradient="from-emerald-500 to-teal-600"
          shadowColor="shadow-emerald-500/20"
          progress={stats?.totalTenants ? stats.activeTenants / stats.totalTenants : 0}
          hideIconBg
        />
        <KpiCard
          title="Active Tenants"
          value={stats?.activeTenants || 0}
          subtitle={`${stats?.tenantsCreatedToday || 0} onboarded today`}
          icon={<Users className="w-6 h-6 text-emerald-600" />}
          gradient="from-emerald-500 to-teal-600"
          shadowColor="shadow-emerald-500/20"
          progress={stats?.totalTenants ? stats.activeTenants / stats.totalTenants : 0}
          hideIconBg
          onClick={() => navigate('/superadmin/tenants')}
        />
        <KpiCard
          title="Inactive Tenants"
          value={stats?.inactiveTenants || 0}
          subtitle="Tenants requiring attention"
          icon={<Users className="w-6 h-6 text-rose-600" />}
          gradient="from-rose-500 to-red-600"
          shadowColor="shadow-rose-500/20"
          hideIconBg
        />
        <KpiCard
          title="Monthly Revenue"
          value={`₹${(stats?.totalMonthlyRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`Annual: ₹${(stats?.projectedAnnualRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={<IndianRupee className="w-6 h-6 text-slate-800" />}
          gradient="from-slate-800 to-black"
          shadowColor="shadow-slate-900/20"
          hideIconBg
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div
          variants={scaleIn}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-[420px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Subscription Plans
              </h3>
              <p className="text-xs text-slate-500 mt-1">Tenant plan breakdown</p>
            </div>
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Crown className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displaySubscriptionData}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {displaySubscriptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-slate-900">{totalSubscriptions}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Tenants
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {subscriptionData.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wide">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={scaleIn}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-[420px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Resource Distribution
              </h3>
              <p className="text-xs text-slate-500 mt-1">Global scaling overview</p>
            </div>
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#growthGradient)"
                  dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div
          variants={scaleIn}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-[320px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Recent Events
            </h3>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-4 flex-1">
            <ActivityRow
              icon={<UserPlus className="w-4 h-4" />}
              iconBg="bg-emerald-100 text-emerald-600"
              title="Recent Tenant Acquisition"
              description={`${stats?.tenantsCreatedToday || 0} new tenant(s) registered today`}
              badge={stats?.tenantsCreatedToday ? 'Live' : undefined}
            />
            <ActivityRow
              icon={<CalendarPlus className="w-4 h-4" />}
              iconBg="bg-slate-100 text-slate-600"
              title="Monthly Onboarding"
              description={`${stats?.tenantsCreatedThisMonth || 0} tenant(s) joined this month`}
            />
            <ActivityRow
              icon={<Zap className="w-4 h-4" />}
              iconBg="bg-blue-100 text-blue-600"
              title="Platform Activity"
              description={`${stats?.totalBranches || 0} branches · ${stats?.totalProducts || 0} products`}
            />
          </div>
        </motion.div>

        <motion.div variants={scaleIn} className="h-[320px]">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-xl h-full flex flex-col">
            <h3 className="font-bold text-sm uppercase tracking-widest mb-6 opacity-60">
              System Actions
            </h3>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <ActionButton label="View All Tenants" onClick={() => navigate('/superadmin/tenants')} />
              <ActionButton label="Subscription Hub" onClick={() => {}} disabled />
              <ActionButton label="Developer Console" onClick={() => {}} disabled />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const KpiCard: React.FC<{
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  shadowColor: string;
  progress?: number;
  hideIconBg?: boolean;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, gradient, shadowColor, progress, hideIconBg, onClick }) => (
  <motion.div
    variants={itemVariants}
    onClick={onClick}
    className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-shadow h-[140px] flex flex-col justify-between ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-200' : 'cursor-default hover:shadow-md'}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">
          {title}
        </p>
        <p className="text-2xl font-extrabold text-slate-900 leading-none tracking-tight">
          {value}
        </p>
      </div>
      {hideIconBg ? (
        <div className="flex items-center justify-center p-2">{icon}</div>
      ) : (
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg ${shadowColor}`}
        >
          {icon}
        </div>
      )}
    </div>
    <div>
      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">{subtitle}</p>
      {progress !== undefined && (
        <div className="mt-2 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>
      )}
    </div>
  </motion.div>
);

const ActivityRow: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  badge?: string;
}> = ({ icon, iconBg, title, description, badge }) => (
  <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
    <div
      className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
    >
      {icon}
    </div>
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        {badge && (
          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-600 rounded-full animate-pulse">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 font-medium">{description}</p>
    </div>
  </div>
);

const ActionButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({
  label,
  onClick,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${disabled ? 'opacity-30 cursor-not-allowed border border-white/5' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
  >
    {label}
  </button>
);

export default SuperAdminDashboard;
