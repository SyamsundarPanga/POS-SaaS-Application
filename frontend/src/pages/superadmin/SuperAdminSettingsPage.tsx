import React from 'react';
import { motion } from 'framer-motion';
import { 
    Settings, 
    Shield, 
    Globe, 
    Database, 
    Bell,
    Lock,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';

const SuperAdminSettingsPage: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto px-8 py-10 space-y-8"
        >
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                    <Settings className="w-7 h-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Settings</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Manage global platform configurations</p>
                </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsCard
                    icon={<Shield className="w-5 h-5" />}
                    title="Security & Authentication"
                    description="Session timeout, password policies, and MFA settings"
                    status="Active"
                    statusColor="text-emerald-600 bg-emerald-50"
                />
                <SettingsCard
                    icon={<Globe className="w-5 h-5" />}
                    title="Regional Settings"
                    description="Default currency, timezone, and language preferences"
                    status="Configured"
                    statusColor="text-blue-600 bg-blue-50"
                />
                <SettingsCard
                    icon={<Database className="w-5 h-5" />}
                    title="Data Management"
                    description="Backup schedules and data retention policies"
                    status="Active"
                    statusColor="text-emerald-600 bg-emerald-50"
                />
                <SettingsCard
                    icon={<Bell className="w-5 h-5" />}
                    title="Notifications"
                    description="Platform-wide alerts and notification preferences"
                    status="Enabled"
                    statusColor="text-emerald-600 bg-emerald-50"
                />
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoCard
                    icon={<CheckCircle className="w-5 h-5" />}
                    title="System Status"
                    description="All platform services are operational and running smoothly."
                    variant="success"
                />
                <InfoCard
                    icon={<AlertCircle className="w-5 h-5" />}
                    title="Important Notice"
                    description="Settings changes affect all tenants. Contact support for assistance."
                    variant="warning"
                />
            </div>

            {/* Developer Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <Lock className="w-6 h-6 text-amber-400" />
                            <h3 className="font-bold text-lg uppercase tracking-wider">Developer Access</h3>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                            Advanced system configurations and debugging tools are restricted to root administrators. 
                            Contact your system administrator for access to developer mode features.
                        </p>
                    </div>
                    <div className="px-4 py-2 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/30">
                        RESTRICTED
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ─── Settings Card Component ───────────────────────────

const SettingsCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    status: string;
    statusColor: string;
}> = ({ icon, title, description, status, statusColor }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                {icon}
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                {status}
            </span>
        </div>
        <h3 className="font-bold text-slate-900 mb-2 text-base">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
);

// ─── Info Card Component ───────────────────────────

const InfoCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    variant: 'success' | 'warning';
}> = ({ icon, title, description, variant }) => {
    const colors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        warning: 'bg-amber-50 border-amber-200 text-amber-600',
    };

    return (
        <div className={`rounded-2xl border p-6 ${colors[variant]}`}>
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div>
                    <h4 className="font-bold text-sm mb-2">{title}</h4>
                    <p className="text-sm leading-relaxed opacity-90">{description}</p>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminSettingsPage;
