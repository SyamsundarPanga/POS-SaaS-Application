import React from 'react';
import { ChevronDown } from 'lucide-react';

// Specialized Input for Branch Data
interface BranchFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  children?: React.ReactNode;
}

export const BranchFormField: React.FC<BranchFieldProps> = ({
  label,
  error,
  helperText,
  children,
  autoComplete = 'off',
  ...props
}) => {
  // Logic: Generating a unique ID based on the name prop for accessibility linking
  const inputId = `branch-input-${props.name}`;
  const isSelect = props.type === 'select' || children;

  const baseStyles = `w-full p-2.5 bg-white border ${error ? 'border-red-500' : 'border-slate-200'
    } rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400 appearance-none`;

  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      <label
        htmlFor={inputId}
        className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1"
      >
        {label}
      </label>

      <div className="relative">
        {isSelect ? (
          <>
            <select
              id={inputId}
              {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
              autoComplete={autoComplete}
              className={`${baseStyles} cursor-pointer pr-10`}
            >
              {children}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown size={16} strokeWidth={3} />
            </div>
          </>
        ) : (
          <input
            id={inputId}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            autoComplete={autoComplete}
            className={baseStyles}
          />
        )}
      </div>

      {error ? (
        <span className="text-[10px] text-red-500 font-bold px-1 animate-in fade-in slide-in-from-top-1">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-[10px] text-emerald-600 font-bold px-1 animate-in fade-in slide-in-from-top-1">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};

// Branch Management Specific Modal
interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseIconClick?: () => void;
  title: string;
  children: React.ReactNode;
}

export const BranchActionModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  onCloseIconClick,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onCloseIconClick || onClose}
            aria-label="close" // Added for testing and accessibility
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 max-h-[80vh] overflow-y-auto scrollbar-hide">{children}</div>
      </div>
    </div>
  );
};
