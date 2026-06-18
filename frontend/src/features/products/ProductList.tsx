import React from 'react';
import { Product } from '../../types/product.types';
import Button from '../../components/common/Button';
import { Edit2, Trash2, Package } from 'lucide-react'; // Consistency with your other files

interface Props {
  products: Product[];
  onDelete: (id: number) => void;
  onEdit: (product: Product) => void; // New required prop
}

const ProductList: React.FC<Props> = ({ products, onDelete, onEdit }) => {
  if (!products.length) return <div className="p-10 text-gray-500 text-center">No products found.</div>;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-100">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="p-3 text-left text-xs font-black uppercase text-slate-400">Image</th>
            <th className="p-3 text-left text-xs font-black uppercase text-slate-400">Name</th>
            <th className="p-3 text-left text-xs font-black uppercase text-slate-400">SKU</th>
            <th className="p-3 text-left text-xs font-black uppercase text-slate-400">SKU ID</th>
            <th className="p-3 text-left text-xs font-black uppercase text-slate-400">Price</th>
            <th className="p-3 text-left text-xs font-black uppercase text-slate-400">Status</th>
            <th className="p-3 text-left text-xs font-black uppercase text-slate-400">Stock</th>
            <th className="p-3 text-right text-xs font-black uppercase text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors group">
              <td className="p-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package size={20} />
                    </div>
                  )}
                </div>
              </td>
              <td className="p-3 font-semibold text-slate-900">{product.name}</td>
              <td className="p-3 text-slate-500 font-mono text-xs">{product.sku}</td>
              <td className="p-3 text-slate-500 font-mono text-xs">{product.id}</td>
              <td className="p-3 font-bold">₹{product.price}</td>
              <td className="p-3">
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-full ${
                    product.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {product.status}
                </span>
              </td>
              <td className="p-3 text-sm">{product.currentStock ?? '-'}</td>
              <td className="p-3 text-right space-x-2">
                {/* Trigger the edit flow in the parent */}
                <Button size="sm" variant="secondary" onClick={() => onEdit(product)}>
                  <Edit2 size={14} className="mr-1" /> Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(product.id)}>
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
