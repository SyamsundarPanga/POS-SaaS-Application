import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; // Added this
  error?: string; // Added this
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', autoComplete = 'off', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        {label && <label className="text-sm font-bold text-slate-700">{label}</label>}
        <input
          ref={ref}
          autoComplete={autoComplete}
          className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-500">{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
