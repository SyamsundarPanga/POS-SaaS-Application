import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAppSelector } from '../../store/hooks';
import EnhancedModal from '../../components/ui/EnhancedModal';
import toast from '../../utils/toast';
import axios from 'axios';
import ConfirmModal from '../../components/ui/ConfirmModal';

interface Employee {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branchId: number;
  active: boolean;
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

interface Branch {
  id: number;
  name: string;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  const isStoreAdmin = user?.role === 'ROLE_STORE_ADMIN';
  const isBranchManager = user?.role === 'ROLE_BRANCH_MANAGER';

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<Employee>({
    defaultValues: employee || {
      firstName: '',
      lastName: '',
      email: '',
      role: 'ROLE_CASHIER',
      branchId: user?.branchId || 0,
      active: true,
    },
  });

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
      if (employee) {
        reset(employee);
      }
    }
  }, [isOpen, employee, reset]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get('/api/branches');
      setBranches(response.data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const onSubmit = async (data: Employee) => {
    setLoading(true);
    try {
      if (employee?.id) {
        // Update existing employee
        await axios.put(`/api/employees/${employee.id}`, data);
        toast.success('Employee updated successfully');
      } else {
        // Create new employee
        await axios.post('/api/employees', data);
        toast.success('Employee created successfully');
      }
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      console.error('Failed to save employee:', error);
      const message = error.response?.data?.message || 'Failed to save employee';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = isStoreAdmin
    ? [
      { value: 'ROLE_STORE_ADMIN', label: 'Store Admin' },
      { value: 'ROLE_BRANCH_MANAGER', label: 'Branch Manager' },
      { value: 'ROLE_CASHIER', label: 'Cashier' },
    ]
    : [{ value: 'ROLE_CASHIER', label: 'Cashier' }];

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      onCloseIconClick={handleCloseAttempt}
      title={employee ? 'Edit Employee' : 'Add New Employee'}
      size="medium"
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
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('firstName', { required: 'First name is required' })}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('lastName', { required: 'Last name is required' })}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="john.doe@example.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            {...register('role', { required: 'Role is required' })}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={isBranchManager}
          >
            {availableRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
          {isBranchManager && (
            <p className="text-sm text-slate-500 mt-1">
              Branch managers can only create cashier accounts
            </p>
          )}
        </div>

        {/* Branch */}
        <div>
          <label htmlFor="branch-select" className="block text-sm font-medium text-slate-700 mb-1">
            Branch <span className="text-red-500">*</span>
          </label>
          <select
            id="branch-select"
            {...register('branchId', {
              required: 'Branch is required',
              valueAsNumber: true,
            })}
            className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={isBranchManager}
          >
            <option value="">Select a branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="text-red-500 text-sm mt-1">{errors.branchId.message}</p>
          )}
          {isBranchManager && (
            <p className="text-sm text-slate-500 mt-1">Employees will be assigned to your branch</p>
          )}
        </div>

        {/* Active Status */}
        {employee && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('active')}
              id="active"
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-slate-700">
              Active Employee
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleCloseAttempt}
            disabled={loading}
            className="flex-1 px-6 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{employee ? 'Update Employee' : 'Create Employee'}</span>
            )}
          </button>
        </div>
      </form>
    </EnhancedModal>
  );
};

export default EmployeeFormModal;
