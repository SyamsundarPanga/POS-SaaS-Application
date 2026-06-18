import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UsageMetrics as UsageMetricsType } from '../../store/slices/subscriptionSlice';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface UsageMetricsProps {
  metrics: UsageMetricsType;
  onUpgrade?: () => void;
}

const UsageMetrics: React.FC<UsageMetricsProps> = ({ metrics, onUpgrade }) => {
  const navigate = useNavigate();

  const calculatePercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-primary-500';
  };

  const getTextColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-red-700';
    if (percentage >= 80) return 'text-orange-700';
    return 'text-secondary-700';
  };

  const showWarning = (percentage: number): boolean => {
    return percentage >= 80;
  };

  const usageItems = [
    {
      label: 'Branches',
      used: metrics.branches.used,
      limit: metrics.branches.limit,
      icon: '🏢',
    },
    {
      label: 'Users',
      used: metrics.users.used,
      limit: metrics.users.limit,
      icon: '👥',
    },
    {
      label: 'Products',
      used: metrics.products.used,
      limit: metrics.products.limit,
      icon: '📦',
    },
  ];

  const hasAnyWarning = usageItems.some(item => 
    showWarning(calculatePercentage(item.used, item.limit))
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-secondary-900 mb-1">
            Usage Metrics
          </h2>
          <p className="text-sm text-secondary-600">
            Track your subscription usage
          </p>
        </div>
        {hasAnyWarning && (
          <button
            onClick={onUpgrade || (() => navigate('/subscription/upgrade'))}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Upgrade Plan
          </button>
        )}
      </div>

      <div className="space-y-6">
        {usageItems.map((item) => {
          const percentage = calculatePercentage(item.used, item.limit);
          const isWarning = showWarning(percentage);
          const isUnlimited = item.limit === -1;

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-semibold text-secondary-900">
                    {item.label}
                  </span>
                  {isWarning && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        {percentage >= 100 ? 'Limit Reached' : 'Approaching Limit'}
                      </span>
                    </div>
                  )}
                </div>
                <span className={`text-sm font-medium ${getTextColor(percentage)}`}>
                  {item.used} / {isUnlimited ? '∞' : item.limit}
                </span>
              </div>

              {/* Progress Bar */}
              {!isUnlimited && (
                <div className="relative">
                  <div className="w-full bg-secondary-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                        percentage
                      )}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-secondary-500">
                      {percentage.toFixed(1)}% used
                    </span>
                    {!isUnlimited && item.limit - item.used > 0 && (
                      <span className="text-xs text-secondary-500">
                        {item.limit - item.used} remaining
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isUnlimited && (
                <div className="text-sm text-secondary-500">
                  Unlimited usage available
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Last Updated */}
      <div className="mt-6 pt-6 border-t border-secondary-200">
        <p className="text-xs text-secondary-500">
          Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default UsageMetrics;
