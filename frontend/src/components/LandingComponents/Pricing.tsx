import React from 'react';
import {
  DEFAULT_PLAN_LIMITS,
  formatMonthlyPlanPrice,
  getPlanFeatures,
  getPlanSubtitle,
} from '../../utils/subscriptionPlans';

interface PricingProps {
  onGetStarted: () => void;
}

const Pricing: React.FC<PricingProps> = ({ onGetStarted }) => {
  const plans = [
    {
      id: 'BASIC',
      name: 'Basic',
      price: 1299,
      subtitle: getPlanSubtitle('BASIC'),
      features: getPlanFeatures('BASIC', DEFAULT_PLAN_LIMITS.BASIC),
      cta: 'Get Started',
      highlighted: false,
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 2999,
      subtitle: getPlanSubtitle('PRO'),
      features: getPlanFeatures('PRO', DEFAULT_PLAN_LIMITS.PRO),
      cta: 'Get Started',
      highlighted: true,
    },
    {
      id: 'ADVANCE',
      name: 'Advance',
      price: 4999,
      subtitle: getPlanSubtitle('ADVANCE'),
      features: getPlanFeatures('ADVANCE', DEFAULT_PLAN_LIMITS.ADVANCE),
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-12 pt-6 pb-6 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-black mb-4">
            Subscription <span className="text-emerald-500">Pricing</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Transparent paid plans with clear usage limits. Choose the tier that fits your business.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-8 rounded-2xl border shadow-lg transition-all duration-300 transform hover:-translate-y-2 ${
                plan.highlighted
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-gray-200 hover:shadow-xl'
              }`}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-flex bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-2xl font-bold text-black mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-6">{plan.subtitle}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-black">{formatMonthlyPlanPrice(plan.price)}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className={`w-full px-6 py-3 rounded-xl font-bold transition-all ${
                  plan.highlighted
                    ? 'bg-emerald-500 text-black hover:bg-black hover:text-white'
                    : 'bg-transparent text-black border border-black hover:bg-emerald-50'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
