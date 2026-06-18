import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUsers, deleteUser } from '../../store/slices/userSlice';
import { Users, Search, Plus, Edit, Trash2, Shield, Mail, Phone } from 'lucide-react';

const EmployeeDirectoryPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { list: users, loading } = useAppSelector((state) => state.users);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    useEffect(() => {
        dispatch(fetchUsers({}));
    }, [dispatch]);

    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleDeleteUser = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this employee?')) {
            await dispatch(deleteUser(id));
        }
    };

    const getRoleBadgeColor = (role: string) => {
        const colors: Record<string, string> = {
            SUPER_ADMIN: 'bg-purple-100 text-purple-800',
            STORE_ADMIN: 'bg-blue-100 text-blue-800',
            BRANCH_MANAGER: 'bg-green-100 text-green-800',
            CASHIER: 'bg-yellow-100 text-yellow-800',
            VIEWER: 'bg-gray-100 text-gray-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-8 h-8" />
                            Employee Directory
                        </h1>
                        <p className="text-gray-600 mt-1">Manage your team members and their roles</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus size={20} />
                        Add Employee
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Role Filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="ALL">All Roles</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="STORE_ADMIN">Store Admin</option>
                        <option value="BRANCH_MANAGER">Branch Manager</option>
                        <option value="CASHIER">Cashier</option>
                        <option value="VIEWER">Viewer</option>
                    </select>
                </div>
            </div>

            {/* Employee Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading employees...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-gray-600">No employees found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                            {/* User Avatar */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{user.username}</h3>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail size={16} />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Shield size={16} />
                                    <span>Role: {user.role}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeeDirectoryPage;
