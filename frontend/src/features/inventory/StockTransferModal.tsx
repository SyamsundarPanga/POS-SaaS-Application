import React, { useState, useEffect, useRef } from 'react';
import { Package, Building2, ChevronDown, Check, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import branchService, { Branch } from '../../services/branchService';
import api from '../../services/api';
import toast from '../../utils/toast';
import EnhancedModal from '../../components/ui/EnhancedModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface Props {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

const StockTransferModal: React.FC<Props> = ({ item, onClose, onSuccess }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = selectedBranchId !== null || (quantity !== '' && quantity !== 0) || notes !== '';

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await branchService.getBranches();
        // Filter out current branch
        setBranches(data.filter((b: Branch) => b.id !== item.branchId));
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    };
    fetchBranches();
  }, [item.branchId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setIsBranchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      toast.error('Please select destination branch');
      return;
    }
    if (quantity === '' || (quantity as number) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if ((quantity as number) > item.availableQuantity) {
      toast.error(`Only ${item.availableQuantity} units available for transfer`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/inventory/transfer', {
        productId: item.productId,
        fromBranchId: item.branchId,
        toBranchId: selectedBranchId,
        quantity: quantity as number,
        notes: notes || undefined,
      });

      toast.success('Stock transferred successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to transfer stock');
    } finally {
      setLoading(false);
    }
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <EnhancedModal
      isOpen={true}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title="Transfer Stock"
      size="small"
      className="max-h-[600px] h-[600px]"
      hideScrollbar={true}
      hideHeaderBorder={true}
    >
      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        title="Confirm Close"
        message="You have unsaved changes. Are you sure you want to close this form?"
        confirmText="Yes, Close"
        cancelText="No, Keep Editing"
      />
      <div className="space-y-6 pt-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm border border-blue-100/50">
            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900 leading-tight tracking-tight">{item.productName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest">{item.sku}</span>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Internal Transfer</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleTransfer} autoComplete="off" className="space-y-6">
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 shadow-inner grid grid-cols-2 gap-4">
             <div className="text-center border-r border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Source</p>
                <p className="text-sm font-black text-slate-900 truncate">{item.branchName}</p>
             </div>
             <div className="text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Available</p>
                <p className="text-sm font-black text-emerald-600">{item.availableQuantity} units</p>
             </div>
          </div>

          <div className="space-y-4">
            {/* Destination Branch Dropdown */}
            <div className="space-y-1.5" ref={branchRef}>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                Destination Branch
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsBranchOpen(!isBranchOpen)}
                  className={`w-full flex items-center justify-between pl-11 pr-4 py-3 bg-white border rounded-xl text-sm font-black transition-all ${isBranchOpen ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                >
                   <Building2 className="absolute left-4 w-4 h-4 text-slate-400" />
                   <span className="truncate">{selectedBranch ? selectedBranch.name : 'Select destination'}</span>
                   <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isBranchOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isBranchOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 max-h-48 overflow-y-auto"
                    >
                      {branches.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-400 font-bold italic">No other branches found</div>
                      ) : (
                        branches.map((branch) => (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => {
                              setSelectedBranchId(branch.id);
                              setIsBranchOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-bold flex items-center justify-between group transition-colors ${selectedBranchId === branch.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {branch.name}
                            {selectedBranchId === branch.id && <Check className="w-4 h-4" />}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:border-blue-500 outline-none shadow-sm"
                    placeholder="0"
                    required
                  />
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5">
                    From Branch Bal.
                  </label>
                  <div className={`w-full px-4 py-3 rounded-xl border flex items-center justify-center font-black text-sm shadow-sm ${item.availableQuantity - (Number(quantity) || 0) < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    {item.availableQuantity - (Number(quantity) || 0)}
                  </div>
               </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                Transfer Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-blue-500 outline-none resize-none shadow-sm min-h-[60px]"
                placeholder="Optional reason for transfer..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="flex-1 px-4 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all uppercase tracking-widest"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest"
              disabled={loading || !selectedBranchId || !quantity || Number(quantity) > item.availableQuantity}
            >
              {loading ? 'Processing...' : 'Transfer Now'}
            </button>
          </div>
        </form>
      </div>
    </EnhancedModal>
  );
};

export default StockTransferModal;
