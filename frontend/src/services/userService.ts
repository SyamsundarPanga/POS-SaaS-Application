import api from './api';

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    role: 'ROLE_STORE_ADMIN' | 'ROLE_BRANCH_MANAGER' | 'ROLE_CASHIER' | 'ROLE_VIEWER';
    branchId: number;
    firstName: string;
    lastName: string;
}

export interface UpdateUserRequest {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    branchId?: number;
}

export interface ChangeUserRoleRequest {
    role: CreateUserRequest['role'];
}

export interface ChangeEmployeeStatusRequest {
    status: 'ACTIVE' | 'INACTIVE';
}

const userService = {
    getUsers: (page = 0, size = 100, branchId?: number) => {
        return api.get(`/users`, {
            params: { page, size, branchId }
        });
    },

    createUser: (userData: CreateUserRequest) => {
        return api.post('/users', userData);
    },

    deleteUser: (id: number) => {
        return api.delete(`/users/${id}`);
    },

    getProfile: () => {
        return api.get('/users/me/profile');
    },

    getEmployeesByBranch: (branchId: number, page = 0, size = 100) => {
        return api.get(`/users/branch/${branchId}`, {
            params: { page, size }
        });
    },

    updateEmployee: (id: number, userData: UpdateUserRequest) => {
        return api.put(`/users/${id}/employee`, userData);
    },

    deactivateEmployee: (id: number) => {
        return api.put(`/users/${id}/deactivate`);
    },

    changeEmployeeStatus: (id: number, statusData: ChangeEmployeeStatusRequest) => {
        return api.put(`/users/${id}/employee-status`, statusData);
    },

    updateUser: (id: number, userData: UpdateUserRequest) => {
        return api.put(`/users/${id}`, userData);
    },

    changeUserRole: (id: number, roleData: ChangeUserRoleRequest) => {
        return api.put(`/users/${id}/role`, roleData);
    },
};

export default userService;
