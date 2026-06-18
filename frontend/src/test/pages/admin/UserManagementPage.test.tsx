import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserManagementPage from '../../../pages/admin/UserManagementPage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/userSlice', () => ({
  fetchUsers: jest.fn(() => ({ type: 'users/fetch' })),
  deleteUser: jest.fn((id: number) => ({ type: 'users/delete', payload: id })),
}));
jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../components/modal/AddUserModal', () => () => null);
jest.mock('../../../components/ui/ConfirmModal', () => () => null);
jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: { changeEmployeeStatus: jest.fn() },
}));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('UserManagementPage', () => {
  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        users: {
          list: [
            {
              id: 1,
              username: 'john',
              email: 'john@test.com',
              firstName: 'John',
              lastName: 'D',
              role: 'ROLE_CASHIER',
              tenantId: 't1',
              status: 'ACTIVE',
            },
          ],
          loading: false,
          error: null,
        },
      }),
    );
  });

  it('renders staff accounts page', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('Staff Accounts')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search staff/i)).toBeInTheDocument();
  });
});

