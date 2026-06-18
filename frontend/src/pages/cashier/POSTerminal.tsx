import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addToCart, removeFromCart, updateQuantity, clearCart, applyDiscount } from '../../store/slices/cartSlice';
import { Product, deductStock } from '../../store/slices/productSlice';
import ProductSearch from '../../features/pos/POSProductSearch';
import { Cart } from '../../features/pos/Cart';
import { CheckoutModal } from '../../features/pos/CheckoutModal';
import { CustomerSelector } from '../../features/pos/CustomerSelector';
import SplitPaymentModal from '../../features/pos/SplitPaymentModal';import customerService from '../../services/customerService';import { X } from 'lucide-react';
import toast from '../../utils/toast';
import { motion } from 'framer-motion';

interface Customer {
    id: number;
    name: string;
    email?: string;
    phone: string;
    loyaltyPoints: number;
    loyaltyTier: string;
    totalPurchases?: number;
}

type LoyaltyTierByOrders = 'BRONZE' | 'SILVER' | 'GOLD';

const getLoyaltyTierByOrderPoints = (points: number): LoyaltyTierByOrders => {
    if (points >= 10) return 'GOLD';
    if (points >= 5) return 'SILVER';
    return 'BRONZE';
};

const getLoyaltyDiscountRateByTier = (tier: LoyaltyTierByOrders): number => {
    if (tier === 'GOLD') return 0.2;
    if (tier === 'SILVER') return 0.1;
    return 0;
};

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15,
        },
    },
} as const;

const POSTerminal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { items: cartItems } = useAppSelector((state) => state.cart);
    const { user } = useAppSelector((state) => state.auth);

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
    const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const handleProductSelect = (product: Product) => {
        const stockQty =
            product.currentStock ??
            (product as any).availableQuantity ??
            (product as any).quantity;

        if (typeof stockQty === 'number' && stockQty <= 0) {
            toast.error(`${product.name} is out of stock`);
            return;
        }

        dispatch(addToCart({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price
        }));
    };

    const handleCheckoutComplete = () => {
        // Deduct stock locally immediately
        const deductions = cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        dispatch(deductStock(deductions));

        dispatch(clearCart());
        setSelectedCustomer(null);
        setIsCheckoutOpen(false);
        toast.success('Order completed successfully!');
    };

    const handleSplitPaymentComplete = async () => {
        // Deduct stock locally immediately
        const deductions = cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        dispatch(deductStock(deductions));

        dispatch(clearCart());
        setIsSplitPaymentOpen(false);

        // Refresh customer loyalty data after split payment
        if (selectedCustomer?.id) {
            try {
                const response = await customerService.getById(selectedCustomer.id);
                setSelectedCustomer(response.data);
            } catch (err) {
                // Ignore - the customer data will refresh next time customer is selected
                console.warn('Failed to refresh customer after split payment', err);
            }
        }

        toast.success('Split payment completed successfully!');
    };

    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = subtotal * 0.1;
    const totalBeforeDiscount = subtotal + taxAmount;
    const orderPoints = selectedCustomer?.totalPurchases || 0;
    const loyaltyTierByOrders = getLoyaltyTierByOrderPoints(orderPoints);
    const loyaltyDiscountRate = selectedCustomer
        ? getLoyaltyDiscountRateByTier(loyaltyTierByOrders)
        : 0;
    const loyaltyDiscount = totalBeforeDiscount * loyaltyDiscountRate;
    const finalTotal = Math.max(0, totalBeforeDiscount - loyaltyDiscount);
    const checkoutCustomer = selectedCustomer
        ? {
            ...selectedCustomer,
            loyaltyPoints: orderPoints,
            loyaltyTier: loyaltyTierByOrders,
        }
        : null;

    return (
        <div className="min-h-screen bg-white p-6">
            <motion.div
                className="max-w-7xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold mb-2">POS Terminal</h1>
                    <p className="text-gray-600">Cashier: {user?.username || 'Unknown'}</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold mb-4">Products</h2>
                            <ProductSearch onProductSelect={handleProductSelect} />
                        </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-lg p-6 h-fit self-start">
                        <h2 className="text-xl font-bold mb-4">Cart</h2>

                        {selectedCustomer ? (
                            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-emerald-900">{selectedCustomer.name}</p>
                                    <p className="text-sm text-emerald-600 font-medium">
                                        {orderPoints} points • {loyaltyTierByOrders}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCustomerSelectorOpen(true)}
                                className="w-full mb-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-600 transition-all font-bold"
                            >
                                + Add Customer
                            </button>
                        )}

                        <div className="mb-6">
                            <Cart
                                items={cartItems.map(item => ({ ...item, discount: 0 }))}
                                onUpdateQuantity={(itemId, quantity) => {
                                    if (quantity < 1) return;
                                    dispatch(updateQuantity({ id: String(itemId), quantity }));
                                }}
                                onRemoveItem={(itemId) => {
                                    dispatch(removeFromCart(String(itemId)));
                                }}
                                onClearCart={() => {
                                    dispatch(clearCart());
                                    setSelectedCustomer(null);
                                    toast.info('Cart cleared');
                                }}
                            />
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-3">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal:</span>
                                <span className="font-bold">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Tax (10%):</span>
                                <span className="font-bold">₹{taxAmount.toFixed(2)}</span>
                            </div>
                            {loyaltyDiscount > 0 && (
                                <div className="flex justify-between text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                    <span>Loyalty ({Math.round(loyaltyDiscountRate * 100)}%):</span>
                                    <span className="font-bold">-₹{loyaltyDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-2xl font-black text-slate-900 border-t border-slate-100 pt-3">
                                <span>Total:</span>
                                <span className="text-emerald-600">₹{finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCheckoutOpen(true)}
                            disabled={cartItems.length === 0}
                            className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Checkout (F3)
                        </button>

                        <button
                            onClick={() => setIsSplitPaymentOpen(true)}
                            disabled={cartItems.length === 0 || !selectedCustomer}
                            className="w-full mt-3 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Split Payment
                        </button>
                        {!selectedCustomer && cartItems.length > 0 && (
                            <p className="text-xs text-slate-500 text-center mt-2">
                                Add a customer to enable split payment
                            </p>
                        )}
                    </motion.div>
                </div>
            </motion.div>

            {isCheckoutOpen && (
                <CheckoutModal
                    isOpen={isCheckoutOpen}
                    items={cartItems.map(item => ({
                        id: parseInt(item.id),
                        productId: item.productId,
                        name: item.name,
                        sku: item.sku,
                        price: item.price,
                        quantity: item.quantity,
                        discount: 0,
                        subtotal: item.subtotal
                    }))}
                    customer={checkoutCustomer}
                    total={finalTotal}
                    onClose={() => setIsCheckoutOpen(false)}
                    onComplete={handleCheckoutComplete}
                />
            )}

            {isSplitPaymentOpen && (
                <SplitPaymentModal
                    isOpen={isSplitPaymentOpen}
                    onClose={() => setIsSplitPaymentOpen(false)}
                    items={cartItems.map(item => ({
                        id: parseInt(item.id),
                        productId: item.productId,
                        name: item.name,
                        sku: item.sku,
                        price: item.price,
                        quantity: item.quantity,
                        discount: 0,
                        subtotal: item.subtotal
                    }))}
                    customer={selectedCustomer}
                    total={finalTotal}
                    onComplete={handleSplitPaymentComplete}
                />
            )}

            {isCustomerSelectorOpen && (
                <CustomerSelector
                    selectedCustomer={checkoutCustomer}
                    onSelectCustomer={(customer) => {
                        setSelectedCustomer(customer);
                        setIsCustomerSelectorOpen(false);
                    }}
                    onCreateCustomer={() => setIsCustomerSelectorOpen(false)}
                />
            )}
        </div>
    );
};


export default POSTerminal;
