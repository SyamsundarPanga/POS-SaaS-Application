import React from 'react';
import { Product } from '../../types/product.types';
import { Package, Edit2, Trash2, Tag } from 'lucide-react';

interface Props {
    products: Product[];
    onDelete: (id: number) => void;
    onEdit: (product: Product) => void;
}

const ProductGrid: React.FC<Props> = ({ products, onDelete, onEdit }) => {
    if (!products.length) return <div className="p-20 text-slate-400 text-center font-bold uppercase tracking-widest text-xs">No products found in this category.</div>;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden group flex flex-col">
                    {/* Image Area */}
                    <div className="relative aspect-square bg-slate-50 overflow-hidden">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                <Package size={48} strokeWidth={1} />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-black text-slate-900 leading-tight uppercase text-sm line-clamp-2">{product.name}</h3>
                            <div className="text-emerald-500 font-black text-lg">₹{product.price}</div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 mb-4">
                            <Tag size={12} />
                            <span className="text-[10px] font-bold tracking-widest uppercase">{product.categoryName || 'General'}</span>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Stock</span>
                                <span className="text-sm font-bold text-slate-700">{product.currentStock ?? 0} {product.unit || 'pcs'}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onEdit(product)}
                                    className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all active:scale-90"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(product.id)}
                                    className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-90"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProductGrid;
