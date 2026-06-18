import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSubscriptionData,
  selectBillingHistory,
  selectSubscriptionLoading,
} from '../../store/slices/subscriptionSlice';
import { DataTable, Column, LoadingSkeleton, EmptyState } from '../../components/ui';
import { ArrowLeft, Download, Receipt } from 'lucide-react';
import { BillingRecord } from '../../store/slices/subscriptionSlice';

const formatBillingAmount = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const BillingHistory: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const billingHistory = useAppSelector(selectBillingHistory);
  const loading = useAppSelector(selectSubscriptionLoading);

  useEffect(() => {
    dispatch(fetchSubscriptionData());
  }, [dispatch]);

  const handleDownloadInvoice = (invoiceUrl: string) => {
    window.open(invoiceUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="badge-success">Paid</span>;
      case 'PENDING':
        return <span className="badge-warning">Pending</span>;
      case 'FAILED':
        return <span className="badge-danger">Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const columns: Column<BillingRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-secondary-900">
          {formatBillingAmount(value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'invoiceUrl',
      header: 'Invoice',
      render: (value, row) => (
        <button
          onClick={() => handleDownloadInvoice(value)}
          className="flex items-center gap-2 text-primary-500 hover:text-primary-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      ),
    },
  ];

  if (loading && billingHistory.length === 0) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/subscription')}
          className="flex items-center gap-2 text-secondary-600 hover:text-secondary-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subscription
        </button>
        <h1 className="text-3xl font-black text-secondary-900 tracking-tight">
          Billing History
        </h1>
        <p className="text-secondary-600 mt-1">
          View and download your invoices
        </p>
      </div>

      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-secondary-600 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-secondary-900">
            {formatBillingAmount(
              billingHistory
                .filter(b => b.status === 'PAID')
                .reduce((sum, b) => sum + b.amount, 0)
            )}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary-600 mb-1">Total Invoices</p>
          <p className="text-2xl font-bold text-secondary-900">
            {billingHistory.length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary-600 mb-1">Pending Payments</p>
          <p className="text-2xl font-bold text-orange-600">
            {billingHistory.filter(b => b.status === 'PENDING').length}
          </p>
        </div>
      </div>

      {/* Billing Table */}
      {billingHistory.length > 0 ? (
        <DataTable
          data={billingHistory}
          columns={columns}
          paginated
          pageSize={10}
          sortable
          filterable
        />
      ) : (
        <EmptyState
          icon={Receipt}
          title="No billing history"
          description="Your billing history will appear here once you have transactions"
        />
      )}
    </div>
  );
};

export default BillingHistory;
