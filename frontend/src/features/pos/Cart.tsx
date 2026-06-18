import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';

export interface CartItem {
  id: string | number;
  productId: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string | number, quantity: number) => void;
  onRemoveItem: (itemId: string | number) => void;
  onClearCart: () => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Cart Header */}
      <div className="p-4 border-b bg-white flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Current Sale</h2>
          <p className="text-sm text-gray-600">{items.length} item(s)</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-red-500 transition-colors"
            title="Clear Cart"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>No items in cart</p>
            <p className="text-sm mt-2">Scan or search for products to add</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-white border rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.sku}</p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="p-1 rounded border hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded border hover:bg-gray-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    ₹{item.price.toFixed(2)} each
                  </p>
                  <p className="font-semibold text-blue-600">
                    ₹{item.subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary */}
      <div className="border-t bg-white p-4 space-y-2">
        <div className="flex justify-between text-base font-bold pt-2">
          <span className="text-slate-600">Subtotal:</span>
          <span className="text-slate-900">₹{subtotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
