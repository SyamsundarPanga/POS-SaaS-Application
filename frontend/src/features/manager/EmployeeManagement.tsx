import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import DataTable from '../../components/ui/DataTable';
import { Users, UserPlus, Search, Filter } from 'lucide-react';
import toast from '../../utils/toast';
import axios from 'axios';
import EmployeeFormModal from './EmployeeFormModal';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branchId: number;
  branchName: string;
  active: boolean;
  hireDate: string;
}

export const EmployeeManagement: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const isStoreAdmin = user?.role === 'ROLE_STORE_ADMIN';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      await axios.patch(`/api/employees/${employee.id}/status`, {
        active: !employee.active,
      });
      toast.success(`Employee ${employee.active ? 'deactivated' : 'activated'} successfully`);
      fetchEmployees();
    } catch (error) {
      console.error('Failed to update employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsFormModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormModalOpen(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row: Employee) => (
        <div>
          <div className="font-medium text-slate-900">
            {row.firstName} {row.lastName}
          </div>
          <div className="text-sm text-slate-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (row: Employee) => {
        const roleColors: Record<string, string> = {
          ROLE_STORE_ADMIN: 'bg-purple-100 text-purple-700',
          ROLE_BRANCH_MANAGER: 'bg-blue-100 text-blue-700',
          ROLE_CASHIER: 'bg-emerald-100 text-emerald-700',
        };
        const roleLabels: Record<string, string> = {
          ROLE_STORE_ADMIN: 'Store Admin',
          ROLE_BRANCH_MANAGER: 'Branch Manager',
          ROLE_CASHIER: 'Cashier',
        };
        return (
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              roleColors[row.role] || 'bg-slate-100 text-slate-700'
            }`}
          >
            {roleLabels[row.role] || row.role}
          </span>
        );
      },
    },
    {
      key: 'branchName',
      header: 'Branch',
      sortable: true,
    },
    {
      key: 'hireDate',
      header: 'Hire Date',
      sortable: true,
      render: (row: Employee) => new Date(row.hireDate).toLocaleDateString(),
    },
    {
      key: 'active',
      header: 'Status',
      sortable: true,
      render: (row: Employee) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium ${
            row.active
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Employee) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditEmployee(row)}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to ${
                    row.active ? 'deactivate' : 'activate'
                  } this employee?`
                )
              ) {
                handleToggleActive(row);
              }
            }}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              row.active
                ? 'text-red-600 hover:bg-red-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            {row.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Employee Management
          </h1>
          <p className="text-slate-600 mt-1">
            Manage your team members and their roles
          </p>
        </div>
        <button
          onClick={handleAddEmployee}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
            >
              <option value="ALL">All Roles</option>
              <option value="ROLE_STORE_ADMIN">Store Admin</option>
              <option value="ROLE_BRANCH_MANAGER">Branch Manager</option>
              <option value="ROLE_CASHIER">Cashier</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredEmployees}
          loading={loading}
          emptyMessage="No employees found"
          pageSize={10}
        />
      </div>

      {/* Employee Form Modal */}
      {isFormModalOpen && (
        <EmployeeFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          employee={selectedEmployee}
          onSuccess={fetchEmployees}
        />
      )}
    </div>
  );
};

export default EmployeeManagement;
