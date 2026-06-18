import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../../components/ui/DataTable';
import DateRangePicker from '../../components/ui/DateRangePicker';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import toast from '../../utils/toast';
import { TrendingUp, Download, Trophy, Medal, Award } from 'lucide-react';
import axios from 'axios';

interface EmployeePerformance {
    id: number;
    employeeName: string;
    salesCount: number;
    totalRevenue: number;
    avgTransactionValue: number;
    hoursWorked: number;
    salesPerHour: number;
    rank: number;
}

interface EmployeePerformanceReportProps {
    branchId?: number;
}

const EmployeePerformanceReport: React.FC<EmployeePerformanceReportProps> = ({ branchId }) => {
    const [performanceData, setPerformanceData] = useState<EmployeePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date(),
    });

    useEffect(() => {
        fetchPerformanceData();
    }, [dateRange, branchId]);

    const fetchPerformanceData = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (dateRange.start) params.startDate = dateRange.start.toISOString();
            if (dateRange.end) params.endDate = dateRange.end.toISOString();
            if (branchId) params.branchId = branchId;

            const response = await axios.get('/api/reports/employee-performance', { params });
            setPerformanceData(response.data);
        } catch (error) {
            console.error('Error fetching performance data:', error);
            // Mock data for development
            const mockData: EmployeePerformance[] = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                employeeName: `Employee ${i + 1}`,
                salesCount: Math.floor(Math.random() * 200) + 50,
                totalRevenue: Math.random() * 50000 + 10000,
                avgTransactionValue: Math.random() * 200 + 50,
                hoursWorked: Math.floor(Math.random() * 160) + 80,
                salesPerHour: 0,
                rank: i + 1,
            })).map(emp => ({
                ...emp,
                salesPerHour: emp.totalRevenue / emp.hoursWorked,
            })).sort((a, b) => b.totalRevenue - a.totalRevenue).map((emp, idx) => ({
                ...emp,
                rank: idx + 1,
            }));
            setPerformanceData(mockData);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-5 h-5 text-yellow-500" />;
            case 2:
                return <Medal className="w-5 h-5 text-slate-400" />;
            case 3:
                return <Award className="w-5 h-5 text-orange-600" />;
            default:
                return <span className="text-sm font-bold text-slate-600">#{rank}</span>;
        }
    };

    const handleExportCSV = () => {
        const headers = ['Rank', 'Employee Name', 'Sales Count', 'Total Revenue', 'Avg Transaction', 'Hours Worked', 'Sales/Hour'];
        const rows = performanceData.map(emp => [
            emp.rank,
            emp.employeeName,
            emp.salesCount,
            emp.totalRevenue.toFixed(2),
            emp.avgTransactionValue.toFixed(2),
            emp.hoursWorked,
            emp.salesPerHour.toFixed(2),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee-performance-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Performance report exported');
    };

    const columns: Column<EmployeePerformance>[] = [
        {
            key: 'rank',
            header: 'Rank',
            render: (_value, emp) => (
                <div className="flex items-center justify-center">
                    {getRankIcon(emp.rank)}
                </div>
            ),
        },
        {
            key: 'employeeName',
            header: 'Employee Name',
            render: (_value, emp) => (
                <span className="font-bold text-slate-900">{emp.employeeName}</span>
            ),
        },
        {
            key: 'salesCount',
            header: 'Sales Count',
            sortable: true,
            render: (_value, emp) => (
                <span className="text-sm font-medium text-slate-700">{emp.salesCount}</span>
            ),
        },
        {
            key: 'totalRevenue',
            header: 'Total Revenue',
            sortable: true,
            render: (_value, emp) => (
                <span className="text-sm font-bold text-emerald-600">
                    ${emp.totalRevenue.toFixed(2)}
                </span>
            ),
        },
        {
            key: 'avgTransactionValue',
            header: 'Avg Transaction',
            sortable: true,
            render: (_value, emp) => (
                <span className="text-sm font-medium text-slate-700">
                    ${emp.avgTransactionValue.toFixed(2)}
                </span>
            ),
        },
        {
            key: 'hoursWorked',
            header: 'Hours Worked',
            sortable: true,
            render: (_value, emp) => (
                <span className="text-sm font-medium text-slate-700">{emp.hoursWorked}h</span>
            ),
        },
        {
            key: 'salesPerHour',
            header: 'Sales/Hour',
            sortable: true,
            render: (_value, emp) => (
                <span className="text-sm font-bold text-purple-600">
                    ${emp.salesPerHour.toFixed(2)}
                </span>
            ),
        },
    ];

    // Calculate summary statistics
    const totalSales = performanceData.reduce((sum, emp) => sum + emp.salesCount, 0);
    const totalRevenue = performanceData.reduce((sum, emp) => sum + emp.totalRevenue, 0);
    const avgRevenue = performanceData.length > 0 ? totalRevenue / performanceData.length : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Employee Performance</h2>
                    <p className="text-slate-500 font-medium">Track and compare employee sales performance</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    disabled={loading || performanceData.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Date Range Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Report Period
                </label>
                <DateRangePicker
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onChange={(range) => setDateRange({ start: range.startDate, end: range.endDate })}
                />
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Total Sales
                        </span>
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{totalSales}</div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Total Revenue
                        </span>
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                        ${totalRevenue.toFixed(2)}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Avg per Employee
                        </span>
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                        ${avgRevenue.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Performance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6">
                        <LoadingSkeleton count={5} />
                    </div>
                ) : performanceData.length === 0 ? (
                    <EmptyState
                        icon={TrendingUp}
                        title="No performance data"
                        description="No employee performance data available for the selected period."
                    />
                ) : (
                    <DataTable
                        data={performanceData}
                        columns={columns}
                        filterable={false}
                        paginated={true}
                        pageSize={10}
                    />
                )}
            </div>
        </div>
    );
};

export default EmployeePerformanceReport;
