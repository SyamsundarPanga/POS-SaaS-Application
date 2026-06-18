import React, { useState, useEffect } from 'react';
import EnhancedModal from '../../components/ui/EnhancedModal';
import toast from '../../utils/toast';
import { Package, ArrowRight, AlertCircle } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface Branch {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    currentStock: number;
}

interface StockTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product;
    currentBranchId: number;
    onTransferComplete: () => void;
}

const StockTransferModal: React.FC<StockTransferModalProps> = ({
    isOpen,
    onClose,
    product,
    currentBranchId,
    onTransferComplete,
}) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(product || null);
    const [destinationBranchId, setDestinationBranchId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const isDirty = selectedProduct?.id !== product?.id ||
        destinationBranchId !== null ||
        quantity !== '' ||
        notes !== '';

    const handleCloseAttempt = () => {
        if (isDirty) {
            setShowCloseConfirm(true);
        } else {
            handleClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchBranches();
            if (!product) {
                fetchProducts();
            }
        }
    }, [isOpen, product]);

    const fetchBranches = async () => {
        try {
            const response = await axios.get('/api/branches');
            // Filter out current branch
            setBranches(response.data.filter((b: Branch) => b.id !== currentBranchId));
        } catch (error) {
            console.error('Error fetching branches:', error);
            toast.error('Failed to load branches');
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get('/api/inventory');
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleTransfer = async () => {
        if (!selectedProduct || !destinationBranchId || !quantity) {
            toast.error('Please fill in all required fields');
            return;
        }

        const transferQuantity = parseInt(quantity);
        if (isNaN(transferQuantity) || transferQuantity <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        if (transferQuantity > selectedProduct.currentStock) {
            toast.error('Insufficient stock for transfer');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/inventory/transfer', {
                productId: selectedProduct.id,
                sourceBranchId: currentBranchId,
                destinationBranchId,
                quantity: transferQuantity,
                notes,
            });

            toast.success('Stock transfer completed successfully');
            onTransferComplete();
            handleClose();
        } catch (error: any) {
            console.error('Transfer error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to transfer stock';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedProduct(product || null);
        setDestinationBranchId(null);
        setQuantity('');
        setNotes('');
        onClose();
    };

    return (
        <EnhancedModal
            isOpen={isOpen}
            onClose={handleClose}
            onCloseIconClick={handleCloseAttempt}
            title="Transfer Stock"
            size="medium"
        >
            <ConfirmModal
                isOpen={showCloseConfirm}
                onClose={() => setShowCloseConfirm(false)}
                onConfirm={() => {
                    setShowCloseConfirm(false);
                    handleClose();
                }}
                title="Confirm Close"
                message="You have unsaved changes. Are you sure you want to close this form?"
                confirmText="Yes, Close"
                cancelText="No, Keep Editing"
            />
            <div className="space-y-6">
                {/* Info Alert */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-blue-900 mb-1">Stock Transfer</h4>
                            <p className="text-sm text-blue-700">
                                Transfer inventory from your current branch to another branch. This action will update stock levels at both locations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Product Selection */}
                {!product && (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Select Product
                        </label>
                        <select
                            value={selectedProduct?.id || ''}
                            onChange={(e) => {
                                const prod = products.find(p => p.id === parseInt(e.target.value));
                                setSelectedProduct(prod || null);
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">Select a product...</option>
                            {products.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                    {prod.name} ({prod.sku}) - Stock: {prod.currentStock}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Current Stock Display */}
                {selectedProduct && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Current Stock
                                </div>
                                <div className="text-2xl font-black text-slate-900">
                                    {selectedProduct.currentStock} units
                                </div>
                                <div className="text-sm text-slate-600 mt-1">
                                    {selectedProduct.name} ({selectedProduct.sku})
                                </div>
                            </div>
                            <Package className="w-12 h-12 text-slate-400" />
                        </div>
                    </div>
                )}

                {/* Destination Branch */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Destination Branch
                    </label>
                    <select
                        value={destinationBranchId || ''}
                        onChange={(e) => setDestinationBranchId(parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="">Select destination branch...</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Transfer Quantity
                    </label>
                    <input
                        type="number"
                        min="1"
                        max={selectedProduct?.currentStock || 0}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Enter quantity to transfer"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                    {selectedProduct && (
                        <p className="text-xs text-slate-500 mt-2">
                            Maximum: {selectedProduct.currentStock} units available
                        </p>
                    )}
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Transfer Notes (Optional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this transfer..."
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                    />
                </div>

                {/* Transfer Summary */}
                {selectedProduct && destinationBranchId && quantity && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-600" />
                                <span className="font-bold text-emerald-900">
                                    {quantity} units
                                </span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-emerald-600" />
                            <div className="font-bold text-emerald-900">
                                {branches.find(b => b.id === destinationBranchId)?.name}
                            </div>
                        </div>
                        <div className="text-xs text-emerald-700 mt-2">
                            Remaining stock after transfer: {selectedProduct.currentStock - parseInt(quantity || '0')} units
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleCloseAttempt}
                        className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleTransfer}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        disabled={loading || !selectedProduct || !destinationBranchId || !quantity}
                    >
                        {loading ? 'Transferring...' : 'Transfer Stock'}
                    </button>
                </div>
            </div>
        </EnhancedModal>
    );
};

export default StockTransferModal;
