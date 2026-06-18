import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {/* Icon */}
      {Icon && (
        <div className="mb-4 p-4 bg-secondary-100 rounded-full">
          <Icon className="w-12 h-12 text-secondary-400" />
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-bold text-secondary-900 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-secondary-600 max-w-md mb-6">{description}</p>
      )}

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
            action.variant === 'secondary'
              ? 'bg-secondary-200 text-secondary-900 hover:bg-secondary-300'
              : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow-md'
          }`}
        >
          {action.icon && <action.icon className="w-5 h-5" />}
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
