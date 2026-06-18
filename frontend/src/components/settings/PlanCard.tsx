import React from 'react';
import { Check } from 'lucide-react';
import { formatMonthlyPlanPrice } from '../../utils/subscriptionPlans';

interface PlanProps {
  type: string;
  price: number;
  isCurrent: boolean;
  subtitle?: string;
  priceLabel?: string;
  features: string[];
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}

const PlanCard: React.FC<PlanProps> = ({
  type,
  price,
  isCurrent,
  subtitle,
  priceLabel,
  features,
  actionLabel,
  onAction,
  disabled,
}) => {
  const fallbackPriceLabel = formatMonthlyPlanPrice(price);

  return (
    <div
      className={`relative p-8 rounded-3xl border-2 transition-all duration-300 ${
        isCurrent
          ? 'border-emerald-500 bg-white shadow-xl scale-105 z-10'
          : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
          Active Plan
        </span>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-black text-slate-900 mb-2">{type}</h3>
        {subtitle && <p className="text-sm text-slate-500 font-medium mb-3">{subtitle}</p>}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black">{priceLabel || fallbackPriceLabel}</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check size={12} className="text-emerald-600" />
            </div>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onAction}
        disabled={isCurrent || disabled}
        className={`w-full py-4 rounded-2xl font-black transition-all ${
          isCurrent || disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
        }`}
      >
        {isCurrent ? 'Current Plan' : actionLabel || 'Upgrade Plan'}
      </button>
    </div>
  );
};

export default PlanCard;
