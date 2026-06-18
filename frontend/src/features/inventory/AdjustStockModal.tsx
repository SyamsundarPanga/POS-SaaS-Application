import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { adjustStock } from '../../store/slices/inventorySlice';
import { Package, AlertCircle, Building2, ChevronDown, Plus, Minus, Check } from 'lucide-react';
import branchService, { Branch } from '../../services/branchService';
import EnhancedModal from '../../components/ui/EnhancedModal';
import toast from '../../utils/toast';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface Props {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AdjustStockModal: React.FC<Props> = ({ item, onClose, onSuccess }) => {
  const dispatch = useAppDispatch();
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [movementType, setMovementType] = useState<'RESTOCK' | 'ADJUSTMENT'>('RESTOCK');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    item.branchId || null
  );
  
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);
  const movementRef = useRef<HTMLDivElement>(null);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = (quantity !== 1 && quantity !== '') || movementType !== 'RESTOCK' || notes !== '';

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
        setBranches(data);
        if (!item.branchId && data.length > 0) {
          setSelectedBranchId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    };
    fetchBranches();
  }, [item.branchId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setIsBranchOpen(false);
      }
      if (movementRef.current && !movementRef.current.contains(event.target as Node)) {
        setIsMovementOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (quantity === '' || (quantity as number) <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (!selectedBranchId) {
      setError('Please select a branch');
      return;
    }

    if (movementType === 'ADJUSTMENT' && quantity > item.quantity) {
      setError('Cannot remove more stock than available');
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        adjustStock({
          productId: item.productId,
          branchId: selectedBranchId,
          quantity: quantity as number,
          movementType,
          notes: notes || undefined,
        })
      ).unwrap();

      toast.success(`Stock ${movementType === 'RESTOCK' ? 'added' : 'removed'} successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to manage stock');
    } finally {
      setLoading(false);
    }
  };

  const isAddingStock = movementType === 'RESTOCK';
  const adjQty = quantity === '' ? 0 : (quantity as number);
  const newQuantity = isAddingStock ? item.quantity + adjQty : item.quantity - adjQty;
  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  const movementOptions = [
    { label: 'Add Stock', value: 'RESTOCK', icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Remove Stock', value: 'ADJUSTMENT', icon: Minus, color: 'text-red-600', bg: 'bg-red-50' }
  ] as const;

  return (
    <EnhancedModal
      isOpen={true}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title="Adjust Stock"
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900 leading-tight tracking-tight">{item.productName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest">{item.sku}</span>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Inventory Update</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 shadow-inner">
            <div className="grid grid-cols-2 gap-8 text-center divide-x divide-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Current Stock</p>
                <p className="text-2xl font-black text-slate-900">{item.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Net Available</p>
                <p className="text-2xl font-black text-emerald-600">{item.availableQuantity}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Branch Selection */}
            <div className="space-y-1.5" ref={branchRef}>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                Active Branch
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsBranchOpen(!isBranchOpen)}
                  className={`w-full flex items-center justify-between pl-11 pr-4 py-3 bg-white border rounded-xl text-sm font-black transition-all ${isBranchOpen ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                >
                   <Building2 className="absolute left-4 w-4 h-4 text-slate-400" />
                   <span className="truncate">{selectedBranch ? selectedBranch.name : 'Select a branch'}</span>
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
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setSelectedBranchId(branch.id);
                            setIsBranchOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-bold flex items-center justify-between group transition-colors ${selectedBranchId === branch.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {branch.name}
                          {selectedBranchId === branch.id && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Movement Type */}
            <div className="space-y-1.5" ref={movementRef}>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                Stock Movement
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMovementOpen(!isMovementOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-xl text-sm font-black transition-all ${isMovementOpen ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                >
                   <div className="flex items-center gap-3">
                      {React.createElement(movementOptions.find(o => o.value === movementType)!.icon, { className: `w-4 h-4 ${movementOptions.find(o => o.value === movementType)!.color}` })}
                      <span>{movementOptions.find(o => o.value === movementType)!.label}</span>
                   </div>
                   <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMovementOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isMovementOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2"
                    >
                      {movementOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setMovementType(opt.value);
                            setIsMovementOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-black flex items-center gap-3 transition-colors ${movementType === opt.value ? `${opt.bg} ${opt.color}` : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                          {movementType === opt.value && <Check className="ml-auto w-4 h-4" />}
                        </button>
                      ))}
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
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuantity('');
                        return;
                      }
                      setQuantity(Number(val));
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:border-emerald-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm"
                    placeholder="0"
                    required
                  />
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5">
                    New Total
                  </label>
                  <div className={`w-full px-4 py-3 rounded-xl border flex items-center justify-center font-black text-sm shadow-sm ${newQuantity < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                    {newQuantity}
                  </div>
               </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                Refrence / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-emerald-500 outline-none resize-none shadow-sm min-h-[60px]"
                placeholder="Optional notes for this update..."
              />
            </div>
          </div>

          {error && (
            <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
              disabled={loading}
            >
              Close
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest
                ${movementType === 'RESTOCK' 
                  ? 'bg-slate-900 text-white hover:bg-black shadow-slate-200' 
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-red-100'}
              `}
              disabled={loading || newQuantity < 0 || adjQty <= 0}
            >
              {loading ? 'Processing...' : (movementType === 'RESTOCK' ? 'Add Stock' : 'Remove Stock')}
            </button>
          </div>
        </form>
      </div>
    </EnhancedModal>
  );
};

export default AdjustStockModal;
