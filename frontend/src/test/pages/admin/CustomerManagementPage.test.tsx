import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomerManagementPage from '../../../pages/admin/CustomerManagementPage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/customerSlice', () => ({
  fetchCustomers: jest.fn((payload: any) => ({ type: 'customers/fetch', payload })),
  searchCustomers: jest.fn((payload: any) => ({ type: 'customers/search', payload })),
  deleteCustomer: jest.fn((payload: any) => ({ type: 'customers/delete', payload })),
}));

describe('CustomerManagementPage', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        customers: {
          customers: [{ id: 1, name: 'Alice', email: 'a@test.com', phone: '999', status: 'ACTIVE', loyaltyTier: 'GOLD', loyaltyPoints: 10 }],
          loading: false,
        },
      }),
    );
  });

  it('renders and searches customers', () => {
    render(<CustomerManagementPage />);
    expect(screen.getByText('Customer Management')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search by name, email, or phone/i), { target: { value: 'Ali' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(mockDispatch).toHaveBeenCalled();
  });
});

