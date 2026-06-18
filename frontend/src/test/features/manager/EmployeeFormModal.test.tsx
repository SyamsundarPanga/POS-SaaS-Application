import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmployeeFormModal from '../../../features/manager/EmployeeFormModal';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../../store/hooks', () => ({
  useAppSelector: () => ({
    user: {
      role: 'ROLE_STORE_ADMIN',
      branchId: 1,
    },
  }),
}));

jest.mock('../../../utils/toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('EmployeeFormModal', () => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAxios.get.mockResolvedValue({
      data: [{ id: 1, name: 'Main Branch' }],
    });

    mockedAxios.post.mockResolvedValue({
      data: {},
    });
  });

  it('creates employee successfully', async () => {
    const { container } = render(
      <EmployeeFormModal isOpen={true} onClose={onClose} employee={null} onSuccess={onSuccess} />,
    );

    // fill text inputs
    fireEvent.change(screen.getByPlaceholderText('John'), {
      target: { value: 'John' },
    });

    fireEvent.change(screen.getByPlaceholderText('Doe'), {
      target: { value: 'Doe' },
    });

    fireEvent.change(screen.getByPlaceholderText('john.doe@example.com'), {
      target: { value: 'john@example.com' },
    });

    // role select
    const roleSelect = container.querySelector('select[name="role"]') as HTMLSelectElement;

    fireEvent.change(roleSelect, {
      target: { value: 'ROLE_CASHIER' },
    });

    // branch select (exists immediately)
    const branchSelect = container.querySelector('select[name="branchId"]') as HTMLSelectElement;

    // wait until branch option loads
    await waitFor(() => {
      expect(branchSelect.querySelectorAll('option').length).toBeGreaterThan(1);
    });

    fireEvent.change(branchSelect, {
      target: { value: '1' },
    });

    // submit
    fireEvent.click(screen.getByText('Create Employee'));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/employees',
      expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'ROLE_CASHIER',
        branchId: 1,
      }),
    );

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
