import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Loader2 } from 'lucide-react';
import customerService from '../../services/customerService';
import EnhancedModal from '../ui/EnhancedModal';
import toast from '../../utils/toast';
import ConfirmModal from '../ui/ConfirmModal';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = formData.firstName !== '' || formData.lastName !== '' || formData.email !== '' || formData.phone !== '';

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSubmitAttempted(false);
      setErrors({});
    }
  }, [isOpen]);

  const validateField = (field: string, value: string): string => {
    const trimmed = value.trim();

    if (field === 'firstName') {
      if (!trimmed) return 'First name is required';
      if (trimmed.length < 2 || trimmed.length > 100) {
        return 'First name must be between 2 and 100 characters';
      }
      return '';
    }

    if (field === 'lastName') {
      if (!trimmed) return 'Last name is required';
      if (trimmed.length < 2 || trimmed.length > 100) {
        return 'Last name must be between 2 and 100 characters';
      }
      return '';
    }

    if (field === 'phone') {
      const normalizedPhone = value.replace(/[^\d+]/g, '').trim();
      if (!normalizedPhone) return 'Phone number is required';
      if (!/^[+]?[0-9]{10,20}$/.test(normalizedPhone)) {
        return 'Invalid phone number format';
      }
      return '';
    }

    if (field === 'email') {
      if (!trimmed) return '';
      if (trimmed.length > 150) return 'Email must not exceed 150 characters';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email format';
      return '';
    }

    return '';
  };

  const validateForm = () => {
    const nextErrors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      phone: validateField('phone', formData.phone),
      email: validateField('email', formData.email),
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validateForm()) return;

    setLoading(true);

    try {
      const normalizedPhone = formData.phone.replace(/[^\d+]/g, '').trim();
      if (!normalizedPhone) {
        toast.error('Phone number is required');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        phone: normalizedPhone,
        email: formData.email.trim() || undefined,
      };

      console.log('Creating customer:', payload);
      const response = await customerService.create(payload);
      const data = response.data;

      onSuccess({
        id: data.id,
        name: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email || '',
        phone: data.phone || '',
        loyaltyPoints: data.loyaltyPoints || 0,
        loyaltyTier: data.loyaltyTier || 'BRONZE',
        totalPurchases: data.totalPurchases || 0,
      });

      new BroadcastChannel('paypoint_sync').postMessage('CUSTOMER_UPDATED');

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      });
      setErrors({});
    } catch (err: any) {
      console.error('Error creating customer:', err);
      toast.error(err.response?.data?.message || 'Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? value.replace(/[^\d+]/g, '') : value;
    setFormData({ ...formData, [name]: nextValue });

    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: validateField(name, nextValue),
      });
    }
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title="Create New Customer"
      size="small"
      className="max-h-[550px] h-[550px]"
      contentClassName="px-6 pt-2 pb-4"
      hideHeaderBorder={true}
      hideScrollbar={true}
    >
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
      <form onSubmit={handleSubmit} autoComplete="off" noValidate className="h-full flex flex-col">
        <p className="text-sm text-slate-500 mb-4">
          Enter customer details to create a profile for billing and loyalty tracking.
        </p>

        <div className="grid grid-cols-1 gap-5 flex-1">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              First Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={(e) => setErrors({ ...errors, firstName: validateField('firstName', e.target.value) })}
                maxLength={100}
                className={`w-full pl-9 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm ${errors.firstName ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="John"
              />
            </div>
            {(submitAttempted || formData.firstName.trim().length > 0) && errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Last Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={(e) => setErrors({ ...errors, lastName: validateField('lastName', e.target.value) })}
                maxLength={100}
                className={`w-full pl-9 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm ${errors.lastName ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Doe"
              />
            </div>
            {(submitAttempted || formData.lastName.trim().length > 0) && errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Phone *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={(e) => setErrors({ ...errors, phone: validateField('phone', e.target.value) })}
                maxLength={21}
                className={`w-full pl-9 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm ${errors.phone ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="+91..."
              />
            </div>
            {(submitAttempted || formData.phone.trim().length > 0) && errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={(e) => setErrors({ ...errors, email: validateField('email', e.target.value) })}
                maxLength={150}
                className={`w-full pl-9 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm ${errors.email ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="email@example.com"
              />
            </div>
            {(submitAttempted || formData.email.trim().length > 0) && errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-6 font-sans">
          <button
            type="button"
            onClick={handleCloseAttempt}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Customer</span>
            )}
          </button>
        </div>
      </form>
    </EnhancedModal>
  );
};

export default CreateCustomerModal;
