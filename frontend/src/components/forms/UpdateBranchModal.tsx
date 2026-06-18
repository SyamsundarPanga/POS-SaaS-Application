import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateBranch, fetchBranches } from '../../store/slices/branchSlice';
import { Branch } from '../../types/branch';
import { BranchFormField, BranchActionModal } from './BranchFormComponents';
import { TOP_50_COUNTRIES, getStatesForCountry, getDistrictsForState, getZipsForDistrict } from '../../utils/indiaData';
import toast from '../../utils/toast';
import ConfirmModal from '../ui/ConfirmModal';

interface UpdateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
}

const UpdateBranchModal: React.FC<UpdateBranchModalProps> = ({ isOpen, onClose, branch }) => {
  const dispatch = useAppDispatch();
  const { loading, branches } = useAppSelector((state) => state.branches);
  const [formData, setFormData] = useState<Partial<Branch>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const hasOtherHeadBranch = Array.isArray(branches)
    && branches.some((b: any) => b.isMainBranch && b.id !== branch?.id);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(branch);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (branch) {
      setFormData({ ...branch });
      setErrors({});
    }
  }, [branch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
    if (type === 'number') finalValue = value === '' ? 0 : parseFloat(value);

    // Numeric enforcement for zipCode
    if (name === 'zipCode') {
      finalValue = value.replace(/\D/g, '').slice(0, 6);
    }

    let nextData = { ...formData, [name]: finalValue };

    // Reset logic for dependent fields
    if (name === 'country') {
      nextData = { ...nextData, state: '', city: '', zipCode: '' };
    } else if (name === 'state') {
      nextData = { ...nextData, city: '', zipCode: '' };
    } else if (name === 'city') {
      nextData = { ...nextData, zipCode: '' };
    }

    setFormData(nextData);
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, finalValue, nextData),
      ...(name === 'country' ? { state: '', city: '', zipCode: '' } : {}),
      ...(name === 'state' ? { city: '', zipCode: '' } : {}),
      ...(name === 'city' ? { zipCode: '' } : {}),
      ...(name === 'openingTime' ? { closingTime: validateField('closingTime', nextData.closingTime, nextData) } : {}),
      ...(name === 'closingTime' ? { openingTime: validateField('openingTime', nextData.openingTime, nextData) } : {}),
    }));
  };

  const validateField = (name: string, value: any, nextData: Partial<Branch>) => {
    switch (name) {
      case 'name':
        return String(value || '').trim() ? '' : 'Branch name is required';
      case 'address':
        return String(value || '').trim() ? '' : 'Address is required';
      case 'city':
        return String(value || '').trim() ? '' : 'District is required';
      case 'zipCode':
        const zipVal = String(value || '').trim();
        if (!zipVal) return 'Zip code is required';
        if (!/^\d{6}$/.test(zipVal)) return 'Zip code must be exactly 6 digits';
        return '';
      case 'country':
        return String(value || '').trim() ? '' : 'Country is required';
      case 'phone':
        if (!String(value || '').trim()) return 'Phone is required';
        return /^[0-9+\-\s()]{7,20}$/.test(String(value).trim()) ? '' : 'Invalid phone format';
      case 'email':
        if (!String(value || '').trim()) return 'Email is required';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ? '' : 'Invalid email format';
      case 'status':
        return value ? '' : 'Status is required';
      case 'openingTime':
        if (!value) return 'Opening time is required';
        if (nextData.closingTime && String(value) >= String(nextData.closingTime)) {
          return 'Opening time must be before closing time';
        }
        return '';
      case 'closingTime':
        if (!value) return 'Closing time is required';
        if (nextData.openingTime && String(nextData.openingTime) >= String(value)) {
          return 'Closing time must be after opening time';
        }
        return '';
      default:
        return '';
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    (['name', 'address', 'city', 'state', 'zipCode', 'country', 'phone', 'email', 'status', 'openingTime', 'closingTime'] as const)
      .forEach((field) => {
        const err = validateField(field, (formData as any)[field], formData);
        if (err) nextErrors[field] = err;
      });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;
    if (!validate()) {
      toast.warning('Please fix validation errors before updating');
      return;
    }

    try {
      await dispatch(updateBranch({ id: branch.id, data: formData })).unwrap();
      toast.success('Branch updated successfully');
      onClose();
      dispatch(fetchBranches());
    } catch (err: any) {
      toast.error(err?.message || err || 'Failed to update branch');
    }
  };

  return (
    <>
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
      <BranchActionModal
        isOpen={isOpen}
        onClose={onClose}
        onCloseIconClick={handleCloseAttempt}
        title="Update Branch Details"
      >
        <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <BranchFormField label="Branch Name" name="name" value={formData.name || ''} onChange={handleInputChange} error={errors.name} required />
            <BranchFormField label="Email" type="email" name="email" value={formData.email || ''} onChange={handleInputChange} error={errors.email} required />
          </div>

          <BranchFormField label="Address" name="address" value={formData.address || ''} onChange={handleInputChange} error={errors.address} required />

          <div className="grid grid-cols-2 gap-4">
            <BranchFormField label="Phone" name="phone" value={formData.phone || ''} onChange={handleInputChange} error={errors.phone} required />
            <BranchFormField label="Status" name="status" type="select" value={formData.status || 'ACTIVE'} onChange={handleInputChange} error={errors.status} required>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TEMPORARILY_CLOSED">Temporarily Closed</option>
            </BranchFormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BranchFormField
              label="Country"
              name="country"
              type="select"
              value={formData.country || ''}
              onChange={handleInputChange}
              error={errors.country}
              required
            >
              <option value="">Select Country</option>
              {TOP_50_COUNTRIES.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </BranchFormField>
            <BranchFormField
              label="State"
              name="state"
              type="select"
              value={formData.state || ''}
              onChange={handleInputChange}
              error={errors.state}
              required
              disabled={!formData.country}
            >
              <option value="">Select State</option>
              {formData.country && getStatesForCountry(String(formData.country)).map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </BranchFormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BranchFormField
              label="District"
              name="city"
              type="select"
              value={formData.city || ''}
              onChange={handleInputChange}
              error={errors.city}
              required
              disabled={!formData.state}
            >
              <option value="">Select District</option>
              {formData.state && getDistrictsForState(String(formData.country), String(formData.state)).map((d: string) => (
                <option key={`${formData.state}-${d}`} value={d}>{d}</option>
              ))}
            </BranchFormField>
            <BranchFormField
              label="Zip Code"
              name="zipCode"
              value={formData.zipCode || ''}
              onChange={handleInputChange}
              error={errors.zipCode}
              required
              disabled={!formData.city}
              placeholder="6-digit ZIP"
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid grid-cols-2 gap-4">
            <BranchFormField label="Opening Time" type="time" name="openingTime" value={formData.openingTime || ''} onChange={handleInputChange} error={errors.openingTime} required />
            <BranchFormField label="Closing Time" type="time" name="closingTime" value={formData.closingTime || ''} onChange={handleInputChange} error={errors.closingTime} required />
          </div>

          {(branch?.isMainBranch || !hasOtherHeadBranch) && (
            <div className="flex items-center gap-3 px-2">
              <input
                type="checkbox"
                name="isMainBranch"
                id="isMainUpdate"
                checked={Boolean(formData.isMainBranch)}
                onChange={handleInputChange}
                className="w-5 h-5 accent-emerald-500"
              />
              <label htmlFor="isMainUpdate" className="text-xs font-black text-slate-700 uppercase">
                Set as Head Office
              </label>
            </div>
          )}
          {!branch?.isMainBranch && hasOtherHeadBranch && (
            <p className="text-xs font-bold text-slate-500 px-2">
              Another head office already exists. Unselect it first to assign this branch.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all disabled:bg-slate-300"
          >
            {loading ? 'SAVING...' : 'UPDATE BRANCH'}
          </button>
        </form>
      </BranchActionModal>
    </>
  );
};

export default UpdateBranchModal;
