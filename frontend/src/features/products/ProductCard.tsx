import React from 'react';
import { Product } from '../../types/product.types';

interface Props {
  product: Product;
}

const ProductCard: React.FC<Props> = ({ product }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center hover:shadow-md transition-shadow">
      {product.imageUrl ? (
        <div className="w-32 h-32 rounded-xl overflow-hidden mb-4 bg-slate-50 flex items-center justify-center">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-32 h-32 bg-slate-50 rounded-xl mb-4 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200">
          No Image
        </div>
      )}
      <div className="font-bold text-xl mb-1 text-slate-900">{product.name}</div>
      <div className="text-sm text-slate-500 mb-1">SKU: {product.sku}</div>
      <div className="text-sm text-slate-500 mb-1">Barcode: {product.barcode || '-'}</div>
      <div className="text-lg font-black text-emerald-600 mt-2">₹ {product.price.toFixed(2)}</div>
      <div className={`text-xs font-bold px-3 py-1 rounded-full mt-3 ${product.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
        }`}>
        {product.status}
      </div>
    </div>
  );
};

export default ProductCard;
