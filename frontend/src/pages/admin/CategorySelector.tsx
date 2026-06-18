import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCategoryHierarchy } from '../../store/slices/categorySlice';
import { Category } from '../../store/slices/categorySlice';

interface Props {
  selectedId?: number;
  onSelect: (id: number) => void;
  className?: string;
}

const CategorySelector: React.FC<Props> = ({ selectedId, onSelect, className }) => {
  const dispatch = useAppDispatch();
  const { hierarchy, loading } = useAppSelector((state) => state.categories);

  useEffect(() => {
    if (hierarchy.length === 0) dispatch(fetchCategoryHierarchy());
  }, [dispatch, hierarchy.length]);

  // Recursive function to render options with indentation
  const renderOptions = (categories: Category[], level = 0) => {
    return categories.map((cat) => (
      <React.Fragment key={cat.id}>
        <option value={cat.id}>
          {'\u00A0'.repeat(level * 4)} {level > 0 ? '↳ ' : ''} {cat.name}
        </option>
        {cat.subcategories && renderOptions(cat.subcategories, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Product Category</label>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
        disabled={loading}
      >
        <option value="">Select a category</option>
        {renderOptions(hierarchy)}
      </select>
      {loading && <p className="text-xs text-slate-400 mt-1">Loading categories...</p>}
    </div>
  );
};

export default CategorySelector;
