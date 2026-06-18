import React from 'react';
import { QrCode, CheckCircle2, X } from 'lucide-react';
import EnhancedModal from '../../components/ui/EnhancedModal';

interface UPIQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  orderId?: number;
}

const UPIQRModal: React.FC<UPIQRModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  orderId,
}) => {
  // Replace with actual branch VPA if available in future
  const upiId = '8919004890-2@ybl'; 
  const name = 'POS SaaS';
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderId || ''}`)}`;
  
  // Using a public QR API for generation - no new dependencies needed
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

  if (!isOpen) return null;

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan QR to Pay"
      size="small"
      className="max-w-md"
    >
      <div className="flex flex-col items-center p-6 space-y-6">
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-1">Total Amount to Pay</p>
          <p className="text-3xl font-bold text-slate-900 font-mono">₹{amount.toFixed(2)}</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white p-4 rounded-xl border border-slate-100 shadow-xl">
            <img 
              src={qrCodeUrl} 
              alt="UPI QR Code" 
              className="w-64 h-64 select-none pointer-events-none"
              onLoad={() => console.log('QR Code loaded')}
            />
          </div>
        </div>

        <div className="w-full space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
            <QrCode className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">Scan using any UPI App</p>
              <p className="text-blue-700">GPay, PhonePe, Paytm, etc.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-[2] px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <CheckCircle2 className="w-5 h-5" />
              Payment Received
            </button>
          </div>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default UPIQRModal;
