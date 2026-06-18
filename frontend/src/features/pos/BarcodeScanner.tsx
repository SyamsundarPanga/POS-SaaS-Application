import React, { useState, useRef, useEffect } from 'react';
import { Scan, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  barcodeLength?: number;
  autoSubmit?: boolean;
  placeholder?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onError,
  barcodeLength = 13,
  autoSubmit = true,
  placeholder = 'Scan or enter barcode...',
}) => {
  const [barcode, setBarcode] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Auto-submit when barcode reaches configured length
    if (autoSubmit && barcode.length === barcodeLength) {
      handleSubmit();
    }
  }, [barcode, autoSubmit, barcodeLength]);

  const handleSubmit = () => {
    if (barcode.trim().length === 0) {
      return;
    }

    if (barcode.length < 8) {
      onError?.('Barcode too short. Please scan a valid barcode.');
      return;
    }

    // Visual feedback
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 300);

    onScan(barcode.trim());
    setBarcode('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Scanner Header with Status */}
      {!isManualMode && (
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 scanner-active-dot" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Scanner Ready
            </span>
          </div>
          {isScanning && (
            <span className="text-xs font-bold text-emerald-600 animate-pulse">
              READING...
            </span>
          )}
        </div>
      )}

      {/* Scanner Input / Window */}
      <div className="group relative">
        <div
          className={`relative flex items-center transition-all duration-500 rounded-2xl overflow-hidden border-2 shadow-sm ${isScanning
              ? 'border-emerald-500 scanner-success-flash scale-[1.01]'
              : 'border-slate-200 group-hover:border-slate-300'
            } ${!isManualMode ? 'bg-slate-50' : 'bg-white'}`}
        >
          {/* Laser Line Animation (only in Scanner Mode) */}
          {!isManualMode && !isScanning && (
            <div className="scanner-laser opacity-40 group-focus-within:opacity-100 transition-opacity" />
          )}

          <div className="absolute left-4 flex items-center pointer-events-none z-20">
            {isManualMode ? (
              <Keyboard className="w-5 h-5 text-slate-400" />
            ) : (
              <Scan className={`w-5 h-5 transition-colors duration-300 ${isScanning ? 'text-emerald-500' : 'text-slate-400'}`} />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => !isManualMode && setIsScanning(false)}
            placeholder={placeholder}
            className={`w-full pl-12 pr-16 py-4 text-lg bg-transparent focus:outline-none transition-all placeholder:text-slate-400 font-mono`}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Character Counter / Badge */}
          {barcode.length > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${barcode.length === barcodeLength
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
                }`}>
                {barcode.length}/{barcodeLength}
              </span>
            </div>
          )}
        </div>

        {/* Backdrop Glow (for realism) */}
        {!isManualMode && (
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity -z-10" />
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setIsManualMode(!isManualMode);
            setBarcode('');
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${isManualMode
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
        >
          {isManualMode ? (
            <>
              <Scan className="w-4 h-4" />
              <span>Use Scanner</span>
            </>
          ) : (
            <>
              <Keyboard className="w-4 h-4" />
              <span>Manual Entry</span>
            </>
          )}
        </button>

        {!autoSubmit && barcode.length > 0 && (
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
          >
            Add to Cart
          </button>
        )}
      </div>

      {/* Instructions / Hints */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-[1px] bg-slate-100" />
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2">
          {isManualMode ? 'Keyboard Input' : 'Automatic Detection'}
        </span>
        <div className="flex-1 h-[1px] bg-slate-100" />
      </div>
    </div>
  );
};

export default BarcodeScanner;
