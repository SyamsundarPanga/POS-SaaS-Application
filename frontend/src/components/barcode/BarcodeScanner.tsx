import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Quagga from '@ericblade/quagga2';
import { Camera, X } from 'lucide-react';
import Button from '../common/Button';

interface Props {
  onScan: (barcode: string) => void;
  showButton?: boolean;
}

export interface BarcodeScannerHandle {
  startScanner: () => Promise<void>;
  stopScanner: () => Promise<void>;
}

const BarcodeScanner = forwardRef<BarcodeScannerHandle, Props>(({ onScan, showButton = true }, ref) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  // 🔥 Consecutive detection logic (more reliable)
  const lastCode = useRef<string | null>(null);
  const sameCount = useRef<number>(0);
  const REQUIRED_CONSECUTIVE = 3;

  useImperativeHandle(ref, () => ({
    startScanner,
    stopScanner
  }));

  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);

  const cleanupScanner = async () => {
    try {
      Quagga.offDetected(onDetected);
      await Quagga.stop();
    } catch (e) { }

    if (scannerRef.current) {
      scannerRef.current.innerHTML = '';
    }

    lastCode.current = null;
    sameCount.current = 0;
  };

  const stopScanner = async () => {
    await cleanupScanner();
    setIsScanning(false);
  };

  const onDetected = (result: any) => {
    const code = result?.codeResult?.code?.trim();
    if (!code) return;

    if (code === lastCode.current) {
      sameCount.current += 1;
    } else {
      lastCode.current = code;
      sameCount.current = 1;
    }

    if (sameCount.current >= REQUIRED_CONSECUTIVE) {
      onScan(code);
      stopScanner();
    }
  };

  const startScanner = async () => {
    try {
      await cleanupScanner();
      setIsScanning(true);

      await new Promise((r) => setTimeout(r, 300));

      if (!scannerRef.current) {
        throw new Error('Scanner container missing');
      }

      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          locator: {
            patchSize: 'medium',
            halfSample: true,
          },
          decoder: {
            readers: [
              'ean_reader',
              // 'ean_8_reader',
              // 'upc_reader',
              // 'upc_e_reader',
              // 'code_128_reader',
              // 'code_39_reader',
            ],
          },
          locate: true,
        },
        (err) => {
          if (err) {
            console.error(err);
            alert('Camera error. Please allow permission.');
            setIsScanning(false);
            return;
          }

          Quagga.start();
          Quagga.onDetected(onDetected);
        },
      );
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  return (
    <>
      {showButton && (
        <Button
          type="button"
          variant="secondary"
          onClick={startScanner}
          className="px-3 h-[42px] border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
        >
          <Camera size={18} className="mr-2" />
          Scan
        </Button>
      )}

      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col relative">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-semibold tracking-wide">SCANNER</span>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="p-1 hover:bg-slate-700 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative bg-black aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
              <div ref={scannerRef} className="w-full h-full" />

              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-white/50 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-white/50 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-white/50 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-white/50 rounded-br-lg" />
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_infinite_linear]" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700">Align barcode with the red line</p>
              <p className="text-xs text-slate-500 mt-1">
                Hold the product steady under good lighting
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 90%; }
        }
      `}</style>
    </>
  );
});

export default BarcodeScanner;
