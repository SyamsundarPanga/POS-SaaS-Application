import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  color: 'blue' | 'green' | 'red' | 'orange';
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, color, icon }) => {
  // Dynamic mapping for Tailwind colors to avoid purging issues
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 shadow-blue-100',
    green: 'bg-green-50 text-green-600 shadow-green-100',
    red: 'bg-red-50 text-red-600 shadow-red-100',
    orange: 'bg-orange-50 text-orange-600 shadow-orange-100',
  };

  const iconClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 transition-transform hover:scale-[1.02] duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-4 rounded-2xl ${colorClasses[color]}`}>
          <span className="text-2xl">{icon || '📊'}</span>
        </div>
        {trend && (
          <span
            className={`text-xs font-black px-3 py-1 rounded-full ${
              trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      <div>
        <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 mt-1 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

export default StatCard;
