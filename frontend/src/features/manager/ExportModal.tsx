import React, { useState } from 'react';
import EnhancedModal from '../../components/ui/EnhancedModal';
import DateRangePicker from '../../components/ui/DateRangePicker';
import toast from '../../utils/toast';
import { Download, FileText, Table, AlertCircle } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const [format, setFormat] = useState<'CSV' | 'EXCEL'>('CSV');
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date(),
    });
    const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
    const [cashier, setCashier] = useState<string>('ALL');
    const [orderStatus, setOrderStatus] = useState<string>('ALL');
    const [loading, setLoading] = useState(false);
    const [estimatedRows, setEstimatedRows] = useState<number | null>(null);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const isDirty = format !== 'CSV' || 
        paymentMethod !== 'ALL' || 
        cashier !== 'ALL' || 
        orderStatus !== 'ALL';

    const handleCloseAttempt = () => {
        if (isDirty) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

    // Fetch estimated row count when filters change
    React.useEffect(() => {
        if (isOpen && dateRange.start && dateRange.end) {
            fetchEstimatedCount();
        }
    }, [isOpen, dateRange, paymentMethod, cashier, orderStatus]);

    const fetchEstimatedCount = async () => {
        try {
            const params: any = {
                startDate: dateRange.start?.toISOString(),
                endDate: dateRange.end?.toISOString(),
            };
            if (paymentMethod !== 'ALL') params.paymentMethod = paymentMethod;
            if (cashier !== 'ALL') params.cashierId = cashier;
            if (orderStatus !== 'ALL') params.status = orderStatus;

            const response = await axios.get('/api/orders/count', { params });
            setEstimatedRows(response.data.count);
        } catch (error) {
            console.error('Error fetching count:', error);
            setEstimatedRows(null);
        }
    };

    const handleExport = async () => {
        if (!dateRange.start || !dateRange.end) {
            toast.error('Please select a date range');
            return;
        }

        setLoading(true);
        try {
            const params: any = {
                startDate: dateRange.start.toISOString(),
                endDate: dateRange.end.toISOString(),
                format: format.toLowerCase(),
            };
            if (paymentMethod !== 'ALL') params.paymentMethod = paymentMethod;
            if (cashier !== 'ALL') params.cashierId = cashier;
            if (orderStatus !== 'ALL') params.status = orderStatus;

            const response = await axios.get('/api/orders/export', {
                params,
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            const extension = format === 'CSV' ? 'csv' : 'xlsx';
            link.setAttribute('download', `orders_${timestamp}.${extension}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(`Orders exported successfully as ${format}`);
            onClose();
        } catch (error: any) {
            console.error('Export error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to export orders';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <EnhancedModal
            isOpen={isOpen}
            onClose={onClose}
            onCloseIconClick={handleCloseAttempt}
            title="Export Orders"
            size="large"
        >
            <div className="space-y-6">
                <ConfirmModal
                    isOpen={showCloseConfirm}
                    onClose={() => setShowCloseConfirm(false)}
                    onConfirm={() => {
                        setShowCloseConfirm(false);
                        onClose();
                    }}
                    title="Confirm Close"
                    message="You have unsaved export filters. Are you sure you want to close this form?"
                    confirmText="Yes, Close"
                    cancelText="No, Keep Editing"
                />
                {/* Info Alert */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-blue-900 mb-1">Export Orders</h4>
                            <p className="text-sm text-blue-700">
                                Export order data with your selected filters. Choose between CSV for spreadsheets or Excel for formatted reports.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Format Selection */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                        Export Format
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setFormat('CSV')}
                            className={`p-4 rounded-xl border-2 transition-all ${format === 'CSV'
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <FileText className={`w-8 h-8 mx-auto mb-2 ${format === 'CSV' ? 'text-emerald-600' : 'text-slate-400'
                                }`} />
                            <div className="font-bold text-slate-900">CSV</div>
                            <div className="text-xs text-slate-500 mt-1">
                                For spreadsheets
                            </div>
                        </button>

                        <button
                            onClick={() => setFormat('EXCEL')}
                            className={`p-4 rounded-xl border-2 transition-all ${format === 'EXCEL'
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <Table className={`w-8 h-8 mx-auto mb-2 ${format === 'EXCEL' ? 'text-emerald-600' : 'text-slate-400'
                                }`} />
                            <div className="font-bold text-slate-900">Excel</div>
                            <div className="text-xs text-slate-500 mt-1">
                                Formatted report
                            </div>
                        </button>
                    </div>
                </div>

                {/* Date Range */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Date Range
                    </label>
                    <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onChange={(range) => setDateRange({ start: range.startDate, end: range.endDate })}
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Payment Method Filter */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="ALL">All Methods</option>
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card (Razorpay)</option>
                            <option value="LOYALTY">Loyalty Points</option>
                        </select>
                    </div>

                    {/* Cashier Filter */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Cashier
                        </label>
                        <select
                            value={cashier}
                            onChange={(e) => setCashier(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="ALL">All Cashiers</option>
                            {/* Cashiers would be loaded from API */}
                        </select>
                    </div>

                    {/* Order Status Filter */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Order Status
                        </label>
                        <select
                            value={orderStatus}
                            onChange={(e) => setOrderStatus(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="ALL">All Status</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING">Pending</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="REFUNDED">Refunded</option>
                        </select>
                    </div>
                </div>

                {/* Estimated Row Count */}
                {estimatedRows !== null && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Estimated Rows
                                </div>
                                <div className="text-2xl font-black text-slate-900">
                                    {estimatedRows.toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    orders matching your filters
                                </div>
                            </div>
                            <Download className="w-12 h-12 text-slate-400" />
                        </div>
                    </div>
                )}

                {/* Warning for Large Exports */}
                {estimatedRows && estimatedRows > 10000 && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-orange-900 mb-1">Large Export</h4>
                                <p className="text-sm text-orange-700">
                                    This export contains over 10,000 rows. It may take a few minutes to generate. Consider narrowing your date range for faster exports.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleCloseAttempt}
                        className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={loading || !dateRange.start || !dateRange.end}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Export {format}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </EnhancedModal>
    );
};

export default ExportModal;
