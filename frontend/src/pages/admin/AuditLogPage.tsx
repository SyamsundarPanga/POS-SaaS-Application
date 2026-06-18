import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAuditLogs } from '../../store/slices/auditSlice';
import { Search, Clock, User, Activity, Globe, Info, ChevronLeft, ChevronRight, Calendar, Filter, Eye, X, Download, FileText, ChevronDown } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import DashboardHeader from '../../components/layout/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import auditService, { AuditLog } from '../../services/auditService';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 120,
            damping: 20,
        },
    },
} as const;

const AuditLogPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { logs, loading, error, totalPages, currentPage } = useAppSelector((state) => state.audit);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [page, setPage] = useState(0);
    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const pageSize = 15;

    useEffect(() => {
        const start = startDate ? `${startDate}T00:00:00` : undefined;
        const end = endDate ? `${endDate}T23:59:59` : undefined;
        dispatch(fetchAuditLogs({ page, size: pageSize, startDate: start, endDate: end }));
    }, [dispatch, page, startDate, endDate]);

    const filteredLogs = logs.filter(log => {
        const searchMatches = 
            (log.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.resource || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.branchName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
            
        return searchMatches;
    });

    const getActionColor = (action: string) => {
        const a = action.toUpperCase();
        if (a.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (a.includes('UPDATE')) return 'bg-blue-50 text-blue-700 border-blue-100';
        if (a.includes('DELETE')) return 'bg-rose-50 text-rose-700 border-rose-100';
        if (a.includes('TRANSFER')) return 'bg-purple-50 text-purple-700 border-purple-100';
        if (a.includes('REFUND')) return 'bg-amber-50 text-amber-700 border-amber-100';
        if (a.includes('VOID')) return 'bg-orange-50 text-orange-700 border-orange-100';
        if (a.includes('SUBSCRIPTION')) return 'bg-sky-50 text-sky-700 border-sky-100';
        return 'bg-slate-50 text-slate-700 border-slate-100';
    };

    const renderActivitySnippet = (details: string, log: AuditLog) => {
        if (!details) return <span className="text-slate-400">No details</span>;
        
        const branchName =
            log.branchName ||
            details.match(/branch: (.*?)(?: \(|$)/i)?.[1] ||
            details.match(/branch ID (\d+)/i)?.[1] ||
            null;
        
        // Try to extract discount
        const discountMatch = details.match(/Discount: (.*?)(?:\)|$)/i);
        let discountInfo = discountMatch ? discountMatch[1] : null;

        // Format discount label (e.g., 400.00 PERCENTAGE -> 400.00 Rupees)
        if (discountInfo) {
            discountInfo = discountInfo.replace(/PERCENTAGE/g, 'Rupees').replace(/FIXED/g, 'Rupees');
        }

        return (
            <div className="flex flex-col gap-1 items-start text-left">
                <p className="text-xs text-slate-600 line-clamp-1 max-w-[250px]">{details}</p>
                <div className="flex gap-2">
                    {branchName && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded border border-indigo-100">
                            Branch: {branchName}
                        </span>
                    )}
                    {discountInfo && !discountInfo.includes('N/A') && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded border border-amber-100">
                            🏷️ Discount: {discountInfo}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const renderStructuredDetails = (log: AuditLog) => {
        const details = log.details || '';
        
        if (log.resource === 'ORDER') {
            const orderNum = details.match(/order: (ORD-\d+-\d+)/i)?.[1];
            const branch = log.branchName || details.match(/branch: (.*?)(?: \(|$)/i)?.[1];
            const total = details.match(/Total: ([\d.]+)/i)?.[1];
            const discount = details.match(/Discount: ([\d.]+)/i)?.[1];

            return (
                <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            Transaction Summary
                        </h4>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Order Number</p>
                                <p className="text-sm font-bold text-slate-900">{orderNum || 'N/A'}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Branch Location</p>
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 text-indigo-400" />
                                    {branch || 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Total Amount</p>
                                <p className="text-sm font-bold text-emerald-600">₹ {total || '0.00'}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Discount Provided</p>
                                <p className="text-sm font-bold text-amber-600">₹ {discount || '0.00'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 px-1">
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Cashier Context</span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operator</p>
                                <p className="text-sm font-bold text-slate-900">{log.username}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                <Globe className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network IP</p>
                                <p className="text-sm font-bold text-slate-900">{log.ipAddress || 'Internal'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (log.resource === 'INVENTORY') {
            const qty = details.match(/Transferred (\d+) units/i)?.[1] || details.match(/Quantity: (\d+)/i)?.[1];
            const from = (details.match(/from branch: (.*?) to:/i)?.[1] || 
                          details.match(/from: (.*?) to:/i)?.[1] || 
                          details.match(/from branch ID (\d+)/i)?.[1]);
            const to = (details.match(/to: (.*?)(?: for|$)/i)?.[1] || 
                        details.match(/to branch ID (\d+)/i)?.[1]);
            const product = (details.match(/product: (.*?) from branch/i)?.[1] || 
                             details.match(/product ID (\d+)/i)?.[1]);

            return (
                <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info className="w-3 h-3 text-purple-500" />
                            Stock Transfer Details
                        </h4>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Source Branch</p>
                                <p className="text-sm font-bold text-slate-900">{from || 'N/A'}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Destination Branch</p>
                                <p className="text-sm font-bold text-slate-900">{to || 'N/A'}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Quantity</p>
                                <p className="text-sm font-bold text-purple-600">{qty || '0'} Units</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Product Name</p>
                                <p className="text-sm font-bold text-slate-900">{product || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (log.resource === 'SUBSCRIPTION') {
            const planMatch = details.match(/plan: (.*?)(?: for|$)/i);
            const plan = planMatch ? planMatch[1] : 'N/A';
            const info = /upgrade/i.test(details) ? 'Plan Upgrade' : 
                         /initial/i.test(details) ? 'Account Setup' : 
                         /activat/i.test(details) ? 'Subscription Active' : 
                         /cancellation/i.test(details) ? 'Cancellation Scheduled' : 
                         /reactivat/i.test(details) ? 'Subscription Reactivated' : 'Subscription Event';

            return (
                <div className="space-y-6">
                    <div className="bg-sky-50/50 rounded-2xl border border-sky-100 p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity className="w-3 h-3 text-sky-500" />
                            Subscription Activity
                        </h4>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Activity Type</p>
                                <p className="text-sm font-bold text-slate-900">{info}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Affected Plan</p>
                                <p className="text-sm font-bold text-sky-600">{plan}</p>
                            </div>
                            <div className="col-span-2 space-y-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Log Details</p>
                                <p className="text-xs text-slate-600 italic leading-relaxed">{details}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 shadow-inner overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">LOG RAW</span>
                </div>
                <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                    {details || 'No additional details available for this log entry.'}
                </pre>
            </div>
        );
    };

    const getExportParams = () => ({
        startDate: startDate ? `${startDate}T00:00:00` : undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
        search: searchTerm.trim() || undefined,
    });

    const downloadBlob = (data: BlobPart, fileName: string, type: string) => {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleExportCsv = async () => {
        try {
            setIsExportingCsv(true);
            const { startDate: start, endDate: end, search } = getExportParams();
            const response = await auditService.exportAuditLogsCsv(start, end, search);
            downloadBlob(response.data, `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
        } catch (exportError) {
            console.error('Failed to export audit logs CSV', exportError);
            window.alert('Failed to export CSV. Please try again.');
        } finally {
            setIsExportingCsv(false);
        }
    };

    const handleExportPdf = async () => {
        try {
            setIsExportingPdf(true);
            const { startDate: start, endDate: end, search } = getExportParams();
            const response = await auditService.exportAuditLogsPdf(start, end, search);
            downloadBlob(response.data, `audit_logs_${new Date().toISOString().slice(0, 10)}.pdf`, 'application/pdf');
        } catch (exportError) {
            console.error('Failed to export audit logs PDF', exportError);
            window.alert('Failed to download PDF. Please try again.');
        } finally {
            setIsExportingPdf(false);
        }
    };

    return (
        <div className="flex h-screen bg-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <DashboardHeader />
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <motion.div
                        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Header Section */}
                        <motion.div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4" variants={itemVariants}>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    <Activity className="w-6 h-6 text-emerald-500" />
                                    Business Audit Logs
                                </h1>
                                <p className="text-slate-500 text-sm mt-1">Tracking authentication, sales, inventory, customer, and administrative changes</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search Bar */}
                                <div className="relative group min-w-[300px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search logs..."
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Date Range Filter Button */}
                                <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-lg hover:border-emerald-500 transition-all">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <input
                                            type="date"
                                            className="bg-transparent border-none outline-none text-slate-600 focus:text-emerald-600 w-28 cursor-pointer"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            title="Start Date"
                                        />
                                        <span className="text-slate-300">→</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none outline-none text-slate-600 focus:text-emerald-600 w-28 cursor-pointer"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            title="End Date"
                                        />
                                    </div>
                                    {(startDate || endDate) && (
                                        <button 
                                            onClick={() => { setStartDate(''); setEndDate(''); }}
                                            className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-all"
                                            title="Clear Dates"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Export Controls */}
                                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                                    <button
                                        onClick={handleExportCsv}
                                        disabled={isExportingCsv || isExportingPdf}
                                        title={isExportingCsv ? 'Exporting...' : 'Export CSV'}
                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-40"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleExportPdf}
                                        disabled={isExportingCsv || isExportingPdf}
                                        title={isExportingPdf ? 'Downloading...' : 'Download PDF'}
                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-40"
                                    >
                                        <FileText className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Logs Table */}
                        <motion.div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" variants={itemVariants}>
                            <div className="overflow-x-auto overflow-y-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200">
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 w-48">Timestamp</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Cashier / User</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">Activity</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading && logs.length === 0 ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                                </tr>
                                            ))
                                        ) : filteredLogs
                                            .map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-all duration-200">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                        {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100/50 shadow-sm">
                                                            <User className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900">{log.username}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium lowercase italic">ID: {log.userId || 'System'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getActionColor(log.action)}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">{log.resource}</span>
                                                        {log.resourceId && <span className="text-[10px] text-slate-400 font-medium">Ref: {log.resourceId}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left">
                                                    {renderActivitySnippet(log.details, log)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button 
                                                        onClick={() => setSelectedLog(log)}
                                                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="View Full Details"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredLogs.length === 0 && !loading && (
                                <div className="text-center py-24">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                                        <Search className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-slate-900 font-bold text-lg mb-1">No audit records found</h3>
                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">We couldn't find any logs matching your current filters. Try searching with different terms.</p>
                                </div>
                            )}

                            {/* Pagination */}
                            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-500">
                                    Showing <span className="text-slate-900">{filteredLogs.length}</span> records
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setPage(prev => Math.max(0, prev - 1))}
                                        disabled={page === 0}
                                        className="p-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                        Page <span className="text-slate-900">{page + 1}</span> / <span className="text-slate-900">{totalPages || 1}</span>
                                    </div>
                                    <button
                                        onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="p-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </main>
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedLog(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Log Entry Details</h3>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Ref: #{selectedLog.id}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-8 font-medium">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performed By</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                {selectedLog.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{selectedLog.username}</p>
                                                <p className="text-[10px] text-slate-400 italic">User ID: {selectedLog.userId || 'System'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</p>
                                        <p className="text-sm font-bold text-slate-900">{format(new Date(selectedLog.createdAt), 'MMMM dd, yyyy')}</p>
                                        <p className="text-xs font-bold text-emerald-500">{format(new Date(selectedLog.createdAt), 'HH:mm:ss.SSS')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-6">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Action</p>
                                        <p className="text-sm font-bold text-slate-800 break-words">{selectedLog.action.replace(/_/g, ' ')}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Resource</p>
                                        <p className="text-sm font-bold text-slate-800 break-words">{selectedLog.resource}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">IP Address</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedLog.ipAddress || 'Internal'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Branch</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedLog.branchName || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <Info className="w-3.5 h-3.5 text-emerald-500" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Audit Context & Details</p>
                                    </div>
                                    {renderStructuredDetails(selectedLog)}
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuditLogPage;
