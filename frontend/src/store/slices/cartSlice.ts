import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
	id: string;
	productId: number;
	name: string;
	sku: string;
	price: number;
	quantity: number;
	maxQuantity?: number;
	discount: number;
	subtotal: number;
}

export interface CartState {
	items: CartItem[];
	total: number;
	tax: number;
	discount: number;
	discountType: 'PERCENTAGE' | 'FIXED';
	discountPercent: number;
	discountAmount: number;
	subtotalBeforeDiscount: number;
	taxableAmount: number;
	taxAmount: number;
	taxRate: number;
	finalTotal: number;
}

const initialState: CartState = {
	items: [],
	total: 0,
	tax: 0,
	discount: 0,
	discountType: 'PERCENTAGE',
	discountPercent: 0,
	discountAmount: 0,
	subtotalBeforeDiscount: 0,
	taxableAmount: 0,
	taxAmount: 0,
	taxRate: 0,
	finalTotal: 0
};

const toTwo = (value: number): number => Number(value.toFixed(2));

const calculateTotals = (state: CartState) => {
	const subtotalBeforeDiscount = state.items.reduce((sum, item) => sum + item.subtotal, 0);

	let discountAmount = 0;
	if (state.discountType === 'PERCENTAGE') {
		discountAmount = subtotalBeforeDiscount * (state.discountPercent / 100);
	} else {
		discountAmount = state.discountAmount;
	}

	if (discountAmount > subtotalBeforeDiscount) {
		discountAmount = subtotalBeforeDiscount;
	}

	const taxableAmount = Math.max(0, subtotalBeforeDiscount - discountAmount);
	const taxAmount = taxableAmount * (state.taxRate / 100);
	const finalTotal = taxableAmount + taxAmount;

	state.subtotalBeforeDiscount = toTwo(subtotalBeforeDiscount);
	state.discountAmount = toTwo(discountAmount);
	if (state.discountType === 'FIXED') {
		state.discountPercent =
			subtotalBeforeDiscount > 0 ? toTwo((state.discountAmount / subtotalBeforeDiscount) * 100) : 0;
	}
	state.taxableAmount = toTwo(taxableAmount);
	state.taxAmount = toTwo(taxAmount);
	state.finalTotal = toTwo(finalTotal);

	// Backward compatibility with existing consumers
	state.discount = state.discountAmount;
	state.tax = state.taxAmount;
	state.total = state.finalTotal;
};

const cartSlice = createSlice({
	name: 'cart',
	initialState,
	reducers: {
		setTaxRate(state, action: PayloadAction<number>) {
			state.taxRate = Number.isFinite(action.payload) ? action.payload : 0;
			calculateTotals(state);
		},
		addToCart(
			state,
			action: PayloadAction<{ id: number; name: string; sku: string; price: number; maxQuantity?: number }>,
		) {
			const { id, name, sku, price, maxQuantity } = action.payload;
			const normalizedMax = typeof maxQuantity === 'number' && maxQuantity > 0 ? maxQuantity : undefined;
			const existingItem = state.items.find(item => item.productId === id);

			if (existingItem) {
				if (normalizedMax !== undefined) {
					existingItem.maxQuantity = normalizedMax;
				}
				const limit = existingItem.maxQuantity;
				existingItem.quantity = typeof limit === 'number'
					? Math.min(existingItem.quantity + 1, Math.max(1, limit))
					: existingItem.quantity + 1;
				existingItem.subtotal = existingItem.quantity * existingItem.price;
			} else {
				state.items.push({
					id: `${id}-${Date.now()}`,
					productId: id,
					name,
					sku,
					price,
					quantity: 1,
					maxQuantity: normalizedMax,
					discount: 0,
					subtotal: price
				});
			}
			calculateTotals(state);
		},
		removeFromCart(state, action: PayloadAction<string>) {
			state.items = state.items.filter(item => item.id !== action.payload);
			calculateTotals(state);
		},
		updateQuantity(state, action: PayloadAction<{ id: string; quantity: number; maxQuantity?: number }>) {
			const item = state.items.find(item => item.id === action.payload.id);
			if (item) {
				if (typeof action.payload.maxQuantity === 'number' && action.payload.maxQuantity > 0) {
					item.maxQuantity = action.payload.maxQuantity;
				}
				const requestedQuantity = Math.max(1, action.payload.quantity);
				const limit = item.maxQuantity;
				item.quantity = typeof limit === 'number'
					? Math.min(requestedQuantity, Math.max(1, limit))
					: requestedQuantity;
				item.subtotal = item.quantity * item.price;
				calculateTotals(state);
			}
		},
		applyDiscount(
			state,
			action: PayloadAction<{ type: 'PERCENTAGE' | 'FIXED'; value: number }>
		) {
			const { type, value } = action.payload;
			state.discountType = type;
			if (type === 'PERCENTAGE') {
				state.discountPercent = Math.max(0, value);
			} else {
				state.discountAmount = Math.max(0, value);
				const subtotal = state.items.reduce((sum, item) => sum + item.subtotal, 0);
				state.discountPercent = subtotal > 0 ? toTwo((state.discountAmount / subtotal) * 100) : 0;
			}
			calculateTotals(state);
		},
		removeDiscount(state) {
			state.discountType = 'PERCENTAGE';
			state.discountPercent = 0;
			state.discountAmount = 0;
			calculateTotals(state);
		},
		clearCart(state) {
			state.items = [];
			state.total = 0;
			state.tax = 0;
			state.discount = 0;
			state.discountType = 'PERCENTAGE';
			state.discountPercent = 0;
			state.discountAmount = 0;
			state.subtotalBeforeDiscount = 0;
			state.taxableAmount = 0;
			state.taxAmount = 0;
			state.finalTotal = 0;
		},
	},
});

export const { setTaxRate, addToCart, removeFromCart, updateQuantity, applyDiscount, removeDiscount, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
