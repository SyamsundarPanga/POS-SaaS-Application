import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { DollarSign, Package, Save, AlertCircle, CheckCircle, Users, Activity, FileText, ArrowRight } from 'lucide-react';
import branchService, { BranchSettings, BranchSettingsRequest } from '../../services/branchService';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 100,
            damping: 15
        }
    }
};

const ManagerBranchSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [settings, setSettings] = useState<BranchSettings | null>(null);

    // Form state
    const [taxRate, setTaxRate] = useState<number>(0);
    const [receiptTemplate, setReceiptTemplate] = useState<string>('');
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
    const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await branchService.getBranchSettings();
            setSettings(data);

            // Populate form
            setTaxRate(data.taxRate || 0);
            setReceiptTemplate(data.receiptTemplate || '');
            setSelectedPaymentMethods(data.paymentMethods || ['CASH', 'CARD']);
            setLowStockThreshold(data.lowStockThreshold || 10);
        } catch (err: any) {
            console.error('Failed to load settings:', err);
            setError(err.response?.data?.message || 'Failed to load branch settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const request: BranchSettingsRequest = {
                taxRate,
                receiptTemplate: receiptTemplate || undefined,
                paymentMethods: selectedPaymentMethods,
                lowStockThreshold
            };

            const updated = await branchService.updateBranchSettings(request);
            setSettings(updated);
            setSuccess('Branch settings updated successfully!');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to save settings:', err);
            setError(err.response?.data?.message || 'Failed to save branch settings');
        } finally {
            setSaving(false);
        }
    };

    const managerTools = [
        {
            title: 'Employee Management',
            description: 'Add staff, update profiles, and control branch team access.',
            icon: Users,
            accent: 'bg-blue-100 text-blue-600',
            actionLabel: 'Manage Staff',
            onClick: () => navigate('/manager/employees'),
        },
        {
            title: 'Shift Monitoring',
            description: 'Review cashier shifts, cash variance, and daily shift reports.',
            icon: Activity,
            accent: 'bg-emerald-100 text-emerald-600',
            actionLabel: 'View Shifts',
            onClick: () => navigate('/manager/shifts'),
        },
        {
            title: 'Order Oversight',
            description: 'Track branch orders, refunds, customer activity, and sales history.',
            icon: FileText,
            accent: 'bg-amber-100 text-amber-600',
            actionLabel: 'Review Orders',
            onClick: () => navigate('/manager/orders'),
        },
    ];

    if (loading) {
        return (
            <div className="flex h-screen bg-white overflow-hidden font-sans">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-white">
                        <div className="max-w-[1240px] mx-auto px-6 py-6 lg:px-10 xl:px-12">
                            <div className="animate-pulse">
                                <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
                                <div className="space-y-4">
                                    <div className="h-32 bg-slate-200 rounded"></div>
                                    <div className="h-32 bg-slate-200 rounded"></div>
                                    <div className="h-32 bg-slate-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto bg-white">
                    <motion.div
                        className="max-w-[1320px] mx-auto px-6 py-7 lg:px-10 xl:px-12"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Header */}
                        <motion.header className="mb-7" variants={itemVariants}>
                            <div className="rounded-xl bg-white p-5 md:p-6">
                                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                                            Manager Portal
                                        </span>
                                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                            Branch Settings
                                        </h1>
                                        <p className="text-slate-500 font-medium mt-1">
                                            {settings?.branchName && `Configure settings for ${settings.branchName}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="inline-flex items-center justify-center gap-2 w-full md:w-auto min-w-[190px] px-8 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                                    >
                                        <Save className="w-5 h-5" />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </motion.header>

                        {/* Success Message */}
                        {success && (
                            <motion.div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3" variants={itemVariants}>
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                                <p className="text-emerald-800 font-medium">{success}</p>
                            </motion.div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <motion.div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3" variants={itemVariants}>
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-red-800 font-medium">{error}</p>
                            </motion.div>
                        )}

                        <motion.div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-7 xl:gap-8 items-start" variants={itemVariants}>
                            <div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-7">
                                    <div className="mb-5">
                                        <h2 className="text-lg font-bold text-slate-900">Manager Controls</h2>
                                        <p className="text-sm text-slate-500">
                                            Quick access to the branch tools managers already use in this portal.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        {managerTools.map((tool) => {
                                            const Icon = tool.icon;
                                            return (
                                                <div
                                                    key={tool.title}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tool.accent}`}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-bold text-slate-900">{tool.title}</h3>
                                                                <p className="mt-1 text-sm text-slate-500">{tool.description}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={tool.onClick}
                                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                                                        >
                                                            {tool.actionLabel}
                                                            <ArrowRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Tax Configuration */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-7 lg:p-8 min-h-[250px]">
                                    <div className="flex items-start gap-3 mb-6">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <DollarSign className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">Tax Configuration</h2>
                                            <p className="text-sm text-slate-500">Set default tax rate for transactions</p>
                                        </div>
                                    </div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Tax Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">
                                        Applied to all sales transactions at this branch
                                    </p>
                                </div>

                                {/* Inventory Settings */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-6">
                                    <div className="flex items-start gap-3 mb-6">
                                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Package className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">Inventory Settings</h2>
                                            <p className="text-sm text-slate-500">Configure stock alert thresholds</p>
                                        </div>
                                    </div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Low Stock Threshold
                                    </label>
                                    <input
                                        type="number"
                                        value={lowStockThreshold}
                                        onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                                        min="0"
                                        className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">
                                        Alert when product stock falls below this quantity
                                    </p>
                                </div>

                            </div>
                        </motion.div>

                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default ManagerBranchSettings;
