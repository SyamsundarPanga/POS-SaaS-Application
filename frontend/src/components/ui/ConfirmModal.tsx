import React from 'react';
import EnhancedModal from './EnhancedModal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
}) => {
    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        info: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    };

    return (
        <EnhancedModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="small"
            className="max-h-[300px]"
        >
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${variant === 'danger' ? 'bg-red-50 text-red-600' :
                            variant === 'warning' ? 'bg-yellow-50 text-yellow-600' :
                                'bg-emerald-50 text-emerald-600'
                        }`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-600 mt-1">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 ${variantStyles[variant]}`}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </EnhancedModal>
    );
};

export default ConfirmModal;
