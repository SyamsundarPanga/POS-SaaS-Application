import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createCategory,
  updateCategory,
  uploadCategoryImage,
  fetchCategoryHierarchy,
  Category,
} from '../../store/slices/categorySlice';
import EnhancedModal from '../../components/ui/EnhancedModal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Upload, X, Save } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';

interface Props {
  open: boolean;
  onClose: () => void;
  parentId?: number;
  categoryToEdit?: Category | null;
}

interface CategoryFormData {
  name: string;
  description: string;
  parentId?: number;
  displayOrder: number;
}

const CategoryModal: React.FC<Props> = ({ open, onClose, parentId, categoryToEdit }) => {
  const dispatch = useAppDispatch();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(categoryToEdit?.imageUrl || null);

  const isEdit = !!categoryToEdit;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CategoryFormData>({
    values: {
      parentId: categoryToEdit?.parentId || parentId,
      displayOrder: categoryToEdit?.displayOrder || 0,
      name: categoryToEdit?.name || '',
      description: categoryToEdit?.description || '',
    },
  });

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleCloseAttempt = () => {
    if (isDirty || imageFile) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    let finalImageUrl = isEdit ? categoryToEdit.imageUrl : '';

    // 1. Upload image if exists
    if (imageFile) {
      const uploadAction = await dispatch(uploadCategoryImage(imageFile));
      if (uploadCategoryImage.fulfilled.match(uploadAction)) {
        finalImageUrl = uploadAction.payload;
      }
    }

    // 2. Create or Update Category
    const payload = { ...data, imageUrl: finalImageUrl };
    
    let resultAction;
    if (isEdit) {
      resultAction = await dispatch(updateCategory({ id: categoryToEdit.id, data: payload }));
    } else {
      resultAction = await dispatch(createCategory(payload));
    }

    if (updateCategory.fulfilled.match(resultAction) || createCategory.fulfilled.match(resultAction)) {
      import('../../utils/toast').then((m) => m.default.success(
        isEdit ? 'Category updated successfully' : 'Category created successfully'
      ));
      dispatch(fetchCategoryHierarchy()); // Refresh tree
      if (!isEdit) {
        reset();
        setImageFile(null);
        setPreview(null);
      }
      onClose();
    }
  };

  return (
    <EnhancedModal
      isOpen={open}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title={isEdit ? `Edit Category: ${categoryToEdit.name}` : "Add New Category"}
      size="small"
      className="max-h-[550px] h-[550px]"
      hideHeaderBorder={true}
      hideScrollbar={true}
    >
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4">
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
        {/* Image Upload Area */}
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-emerald-400 transition-colors bg-white">
          {preview ? (
            <div className="relative w-32 h-32">
              <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setImageFile(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center cursor-pointer">
              <Upload className="text-slate-400 mb-2" />
              <span className="text-xs font-medium text-slate-500">Upload Icon/Image</span>
              <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
            </label>
          )}
        </div>

        <Input
          label="Category Name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Description</label>
          <textarea
            {...register('description')}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24"
            placeholder="What kind of products are in this category?"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Display Order</label>
          <input
            type="number"
            {...register('displayOrder')}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="0"
            min="0"
          />
          <p className="text-xs text-slate-500 italic">
            Controls the order categories appear in menus and lists. Lower numbers appear first (e.g., 0, 1, 2...).
          </p>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={handleCloseAttempt} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="flex-1 shadow-none">
            {isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </EnhancedModal>
  );
};

export default CategoryModal;
