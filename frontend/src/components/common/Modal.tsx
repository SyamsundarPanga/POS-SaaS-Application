import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showBackdrop?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  showBackdrop = true,
  className = "w-96",
}) => {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 flex justify-center items-center z-50 ${showBackdrop ? 'bg-black bg-opacity-40' : 'pointer-events-none'}`}>
      <div className={`bg-white rounded-lg p-6 shadow-2xl border border-slate-200 pointer-events-auto ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-slate-800">{title}</h2>
          <button  aria-label="close" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors px-2 py-1">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
