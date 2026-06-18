import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createBranch, fetchBranches } from '../../store/slices/branchSlice';
import { BranchStatus } from '../../types/branch';
import { BranchFormField, BranchActionModal } from './BranchFormComponents';
import { TOP_50_COUNTRIES, getStatesForCountry, getDistrictsForState, getZipsForDistrict } from '../../utils/indiaData';
import toast from '../../utils/toast';
import ConfirmModal from '../ui/ConfirmModal';

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateBranchModal: React.FC<CreateBranchModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { loading, branches } = useAppSelector((state) => state.branches);
  const hasHeadBranch = Array.isArray(branches) && branches.some((b: any) => b.isMainBranch);

  const initialFormState = {
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    phone: '',
    email: '',
    status: 'ACTIVE' as BranchStatus,
    managerId: 1,
    openingTime: '09:00',
    closingTime: '21:00',
    taxRate: 18.0,
    isMainBranch: false,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormState);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const mapBranchCreateErrorMessage = (err: any) => {
    const rawMessage = String(err?.message || err || '').toLowerCase();
    if (
      rawMessage.includes('do not have permission') ||
      rawMessage.includes('permission to perform this action') ||
      (rawMessage.includes('branch') && rawMessage.includes('limit'))
    ) {
      return 'Branch limit exceeded. Upgrade the plan.';
    }
    return String(err || 'Failed to create branch');
  };

  const validateField = (name: string, value: any, nextData: typeof formData) => {
    switch (name) {
      case 'name':
        return String(value || '').trim() ? '' : 'Branch name is required';
      case 'code':
        return String(value || '').trim() ? '' : 'Branch code is required';
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

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    (['name', 'code', 'address', 'city', 'state', 'zipCode', 'country', 'phone', 'email', 'openingTime', 'closingTime'] as const)
      .forEach((field) => {
        const err = validateField(field, formData[field], formData);
        if (err) nextErrors[field] = err;
      });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.warning('Please fix validation errors before saving');
      return;
    }
    try {
      await dispatch(createBranch({ ...formData, taxRate: 18.0 })).unwrap();
      setFormData(initialFormState); // Reset form
      setErrors({});
      onClose(); // Close modal
      dispatch(fetchBranches()); // Refresh list
      toast.success('Branch created successfully');
    } catch (err: any) {
      toast.error(mapBranchCreateErrorMessage(err));
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
        title="Register New Branch"
      >
        <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <BranchFormField
              label="Branch Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              required
              placeholder="Dmart Mumbai"
            />
            <BranchFormField
              label="Branch Code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              error={errors.code}
              required
              placeholder="BR-001"
            />
          </div>

          <div className="col-span-2">
            <BranchFormField
              label="Full Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              error={errors.address}
              required
              placeholder="Street, Building No."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BranchFormField
              label="Country"
              name="country"
              type="select"
              value={formData.country}
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
              value={formData.state}
              onChange={handleInputChange}
              error={errors.state}
              required
              disabled={!formData.country}
            >
              <option value="">Select State</option>
              {formData.country && getStatesForCountry(formData.country).map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </BranchFormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BranchFormField
              label="District"
              name="city"
              type="select"
              value={formData.city}
              onChange={handleInputChange}
              error={errors.city}
              required
              disabled={!formData.state}
            >
              <option value="">Select District</option>
              {formData.state && getDistrictsForState(formData.country, formData.state).map((d: string) => (
                <option key={`${formData.state}-${d}`} value={d}>{d}</option>
              ))}
            </BranchFormField>
            <BranchFormField
              label="Zip Code"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleInputChange}
              error={errors.zipCode}
              required
              disabled={!formData.city}
              placeholder="6-digit ZIP"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BranchFormField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              error={errors.phone}
              required
            />
            <BranchFormField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <BranchFormField
              label="Opening Time"
              name="openingTime"
              type="time"
              value={formData.openingTime}
              onChange={handleInputChange}
              error={errors.openingTime}
              required
            />
            <BranchFormField
              label="Closing Time"
              name="closingTime"
              type="time"
              value={formData.closingTime}
              onChange={handleInputChange}
              error={errors.closingTime}
              required
            />
          </div>
          {!hasHeadBranch ? (
            <div className="flex items-center gap-3 px-2">
              <input
                type="checkbox"
                name="isMainBranch"
                id="isMainCreate"
                checked={formData.isMainBranch}
                onChange={handleInputChange}
                className="w-5 h-5 accent-emerald-500"
              />
              <label htmlFor="isMainCreate" className="text-xs font-black text-slate-700 uppercase">
                Set as Head Office
              </label>
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-500 px-2">
              Head Office already exists. New branch will be created as regular branch.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all disabled:bg-slate-300"
          >
            {loading ? 'SYNCING...' : 'SAVE BRANCH DETAILS'}
          </button>
        </form>
      </BranchActionModal>
    </>
  );
};

export default CreateBranchModal;
