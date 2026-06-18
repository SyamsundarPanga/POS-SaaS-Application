import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeDirectoryPage from '../../../pages/admin/EmployeeDirectoryPage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/userSlice', () => ({
  fetchUsers: jest.fn(() => ({ type: 'users/fetch' })),
  deleteUser: jest.fn((id: number) => ({ type: 'users/delete', payload: id })),
}));

describe('EmployeeDirectoryPage', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        users: {
          list: [{ id: 1, username: 'john', email: 'john@test.com', role: 'CASHIER' }],
          loading: false,
        },
      }),
    );
    jest.spyOn(window, 'confirm').mockReturnValue(false);
  });

  it('renders employee page and filters', () => {
    render(<EmployeeDirectoryPage />);
    expect(screen.getByText('Employee Directory')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search by name or email/i), { target: { value: 'john' } });
    expect(screen.getByText('john')).toBeInTheDocument();
  });
});

