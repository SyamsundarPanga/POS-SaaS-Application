import React, { useEffect, useState } from 'react';
import userService, { CreateUserRequest } from '../../services/userService';
import branchService from '../../services/branchService';
import { Eye, EyeOff, ShieldCheck, Building2, ChevronDown } from 'lucide-react';
import EnhancedModal from '../ui/EnhancedModal';
import toast from '../../utils/toast';
import ConfirmModal from '../ui/ConfirmModal';

interface AddUserModalProps {
    onClose: () => void;
    onSuccess: () => void;
    user?: EditableUser | null;
    allowedRoles?: Array<'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER'>;
    fixedBranchId?: number | null;
}

interface Branch {
    id: number;
    name: string;
    address?: string;
}

interface EditableUser {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ROLE_STORE_ADMIN' | 'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER' | 'ROLE_VIEWER';
    branchId?: number | null;
}

const AddUserModal: React.FC<AddUserModalProps> = ({
    onClose,
    onSuccess,
    user,
    allowedRoles = ['ROLE_CASHIER', 'ROLE_BRANCH_MANAGER'],
    fixedBranchId = null,
}) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

    const isEditMode = Boolean(user?.id);

    const [formData, setFormData] = useState<CreateUserRequest>({
        username: user?.username || '',
        email: user?.email || '',
        password: '',
        role: (user?.role && allowedRoles.includes(user.role as 'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER')
            ? user.role
            : allowedRoles[0] || 'ROLE_CASHIER') as CreateUserRequest['role'],
        branchId: (fixedBranchId ?? user?.branchId) || 0,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
    });

    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const isDirty = formData.username !== (user?.username || '') ||
        formData.email !== (user?.email || '') ||
        formData.password !== '' ||
        formData.role !== ((user?.role && allowedRoles.includes(user.role as 'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER')
            ? user.role
            : allowedRoles[0] || 'ROLE_CASHIER')) ||
        (formData.branchId !== ((fixedBranchId ?? user?.branchId) || 0) && formData.branchId !== 0) ||
        formData.firstName !== (user?.firstName || '') ||
        formData.lastName !== (user?.lastName || '');

    const handleCloseAttempt = () => {
        if (isDirty) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const data = await branchService.getBranches();
            const branchList = Array.isArray(data) ? data : data?.data || [];
            setBranches(branchList);

            if (fixedBranchId) {
                setFormData((prev) => ({ ...prev, branchId: fixedBranchId }));
            } else if (!isEditMode && branchList.length > 0) {
                setFormData((prev) => ({ ...prev, branchId: branchList[0].id }));
            }
        } catch (fetchError: any) {
            console.error('Error fetching branches:', fetchError);
        } finally {
            setLoadingBranches(false);
        }
    };

    useEffect(() => {
        if (!allowedRoles.includes(formData.role as 'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER')) {
            setFormData((prev) => ({
                ...prev,
                role: (allowedRoles[0] || 'ROLE_CASHIER') as CreateUserRequest['role'],
            }));
        }
    }, [allowedRoles, formData.role]);

    useEffect(() => {
        if (fixedBranchId) {
            setFormData((prev) => ({ ...prev, branchId: fixedBranchId }));
        }
    }, [fixedBranchId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'branchId') {
            setFormData({ ...formData, [name]: parseInt(value, 10) || 0 });
            setFieldErrors((prev) => ({ ...prev, [name]: '' }));
            return;
        }
        setFormData({ ...formData, [name]: value });
        setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const validateFields = () => {
        const trimmedUsername = formData.username.trim();
        const trimmedFirstName = formData.firstName.trim();
        const trimmedLastName = formData.lastName.trim();
        const trimmedEmail = formData.email.trim();
        const trimmedPassword = formData.password.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const nextErrors: Record<string, string> = {};

        if (!trimmedUsername) nextErrors.username = 'Required username';
        if (!trimmedFirstName) nextErrors.firstName = 'Required first name';
        if (!trimmedLastName) nextErrors.lastName = 'Required last name';
        if (!trimmedEmail) nextErrors.email = 'Required email';
        else if (!emailRegex.test(trimmedEmail)) nextErrors.email = 'Please enter a valid email address';

        if (!isEditMode) {
            if (!trimmedPassword) nextErrors.password = 'Required password';
            else if (trimmedPassword.length < 6) nextErrors.password = 'Password must be at least 6 characters';
        }

        setFieldErrors(nextErrors);
        return {
            isValid: Object.keys(nextErrors).length === 0,
            trimmedUsername,
            trimmedFirstName,
            trimmedLastName,
            trimmedEmail,
            trimmedPassword,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { isValid, trimmedUsername, trimmedFirstName, trimmedLastName, trimmedEmail, trimmedPassword } = validateFields();
        if (!isValid) {
            setError(null);
            return;
        }

        if (!formData.branchId) {
            const message = 'Please select a branch';
            setError(message);
            toast.warning(message);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (isEditMode && user) {
                await userService.updateUser(user.id, {
                    username: trimmedUsername,
                    email: trimmedEmail,
                    firstName: trimmedFirstName,
                    lastName: trimmedLastName,
                    branchId: formData.branchId,
                });

                if (formData.role !== user.role) {
                    await userService.changeUserRole(user.id, { role: formData.role });
                }
            } else {
                await userService.createUser({
                    ...formData,
                    username: trimmedUsername,
                    email: trimmedEmail,
                    firstName: trimmedFirstName,
                    lastName: trimmedLastName,
                    password: trimmedPassword,
                });
            }

            toast.success(isEditMode ? 'User updated successfully' : 'User created successfully');
            onSuccess();
            onClose();
        } catch (submitError: any) {
            const serverMessage = submitError.response?.data?.message;
            const validationErrors = submitError.response?.data?.errors;

            if (submitError.response?.status === 403) {
                setError('Access denied. Please re-login and try again.');
                toast.error('Access denied. Please re-login and try again.');
            } else if (serverMessage) {
                setError(serverMessage);
                toast.error(serverMessage);
            } else if (validationErrors && Array.isArray(validationErrors)) {
                const message = validationErrors.join(', ');
                setError(message);
                toast.error(message);
            } else {
                setError('Failed to save user.');
                toast.error('Failed to save user.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <EnhancedModal
            isOpen={true}
            onClose={onClose}
            onCloseIconClick={handleCloseAttempt}
            title={isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}
            size="small"
            className="max-h-[550px] h-[550px]"
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
            <div className="space-y-6">
                <div>
                    <header className="mb-6">
                        <p className="text-slate-500 font-medium text-sm">
                            {isEditMode
                                ? 'Update account details and access settings.'
                                : 'Fill in the details to create a new store account.'}
                        </p>
                    </header>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded-r-xl shadow-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">
                                    Username
                                </label>
                                <input
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none transition-all font-semibold text-sm ${fieldErrors.username ? 'border-red-400 focus:border-red-500' : 'border-slate-100 focus:border-emerald-500'}`}
                                    placeholder="User_Name"
                                />
                                {fieldErrors.username && (
                                    <p className="mt-1 ml-1 text-xs font-bold text-red-600">{fieldErrors.username}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">
                                    First Name
                                </label>
                                <input
                                    name="firstName"
                                    type="text"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none transition-all font-semibold text-sm ${fieldErrors.firstName ? 'border-red-400 focus:border-red-500' : 'border-slate-100 focus:border-emerald-500'}`}
                                    placeholder="First Name"
                                />
                                {fieldErrors.firstName && (
                                    <p className="mt-1 ml-1 text-xs font-bold text-red-600">{fieldErrors.firstName}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">
                                    Last Name
                                </label>
                                <input
                                    name="lastName"
                                    type="text"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none transition-all font-semibold text-sm ${fieldErrors.lastName ? 'border-red-400 focus:border-red-500' : 'border-slate-100 focus:border-emerald-500'}`}
                                    placeholder="Last Name"
                                />
                                {fieldErrors.lastName && (
                                    <p className="mt-1 ml-1 text-xs font-bold text-red-600">{fieldErrors.lastName}</p>
                                )}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">
                                    Email Address
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none transition-all font-semibold text-sm ${fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-100 focus:border-emerald-500'}`}
                                    placeholder="example@gmail.com"
                                />
                                {fieldErrors.email && (
                                    <p className="mt-1 ml-1 text-xs font-bold text-red-600">{fieldErrors.email}</p>
                                )}
                            </div>

                            {!isEditMode && (
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <input
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className={`w-full bg-slate-50 border rounded-xl pl-4 pr-10 py-2.5 outline-none transition-all font-semibold text-sm ${fieldErrors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-100 focus:border-emerald-500'}`}
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {fieldErrors.password && (
                                        <p className="mt-1 ml-1 text-xs font-bold text-red-600">{fieldErrors.password}</p>
                                    )}
                                </div>
                            )}

                            {fixedBranchId == null && (
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">
                                    Branch
                                </label>
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                                        disabled={loadingBranches || branches.length === 0}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all font-bold text-slate-700 text-sm flex items-center justify-between shadow-sm disabled:opacity-50 focus:border-emerald-500"
                                    >
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        <span className="truncate text-slate-700">
                                            {loadingBranches ? 'Loading...' : branches.find(b => b.id === formData.branchId)?.name || 'Select a branch'}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-emerald-500 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isBranchDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsBranchDropdownOpen(false)} />
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                {branches.length === 0 ? (
                                                    <div className="px-4 py-2 text-sm text-slate-500 font-medium italic">No branches available</div>
                                                ) : (
                                                    branches.map((branch) => (
                                                        <button
                                                            key={branch.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({ ...formData, branchId: branch.id });
                                                                setIsBranchDropdownOpen(false);
                                                                setFieldErrors(prev => ({ ...prev, branchId: '' }));
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${formData.branchId === branch.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                        >
                                                            {branch.name}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            )}

                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">
                                    Role
                                </label>
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all font-bold text-slate-700 text-sm flex items-center justify-between shadow-sm focus:border-emerald-500"
                                    >
                                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        <span className="text-slate-700">{formData.role === 'ROLE_CASHIER' ? 'Cashier' : 'Branch Manager'}</span>
                                        <ChevronDown className={`w-4 h-4 text-emerald-500 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isRoleDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsRoleDropdownOpen(false)} />
                                            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                                                {allowedRoles.map((roleValue) => (
                                                    <button
                                                        key={roleValue}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, role: roleValue as any });
                                                            setIsRoleDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${formData.role === roleValue ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                    >
                                                        {roleValue === 'ROLE_CASHIER' ? 'Cashier' : 'Branch Manager'}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-4 pt-4">
                            <button
                                type="button"
                                onClick={handleCloseAttempt}
                                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-black hover:bg-slate-200 transition-all active:scale-95 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || branches.length === 0 || !formData.branchId}
                                className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-black shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50 text-sm"
                            >
                                {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Confirm'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </EnhancedModal>
    );
};

export default AddUserModal;
