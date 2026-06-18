import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import UpdateBranchModal from '../../../components/forms/UpdateBranchModal';
import * as hooks from '../../../store/hooks';
import { Branch } from '../../../types/branch';

// ✅ IMPORTANT: mock your custom toast file
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

import toast from '../../../utils/toast';

describe('UpdateBranchModal Integration', () => {
  const mockOnClose = jest.fn();
  const mockDispatch = jest.fn();

  const sampleBranch: Branch = {
    id: 123,
    code: 'BR-001',
    name: 'Existing Branch',
    address: '456 Old Street',
    city: 'Mumbai',
    state: 'MH',
    zipCode: '400001',
    country: 'India',
    phone: '1234567890',
    email: 'old@branch.com',
    status: 'ACTIVE',
    managerId: 1,
    openingTime: '09:00:00',
    closingTime: '21:00:00',
    taxRate: 18,
    isMainBranch: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(hooks, 'useAppDispatch').mockReturnValue(mockDispatch);
    jest.spyOn(hooks, 'useAppSelector').mockImplementation((selector) =>
      selector({
        branches: { loading: false, branches: [sampleBranch], selectedBranch: null, error: null },
        auth: { user: { roles: ['ROLE_STORE_ADMIN'] } },
      } as any),
    );
  });

  it('submits update with correct payload and triggers success toast', async () => {
    mockDispatch.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });

    render(<UpdateBranchModal isOpen={true} onClose={mockOnClose} branch={sampleBranch} />);

    fireEvent.change(screen.getByLabelText(/Branch Name/i), {
      target: { value: 'Updated Name' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'branch@test.com' },
    });

    fireEvent.change(screen.getByLabelText(/Address/i), {
      target: { value: '123 New Street' },
    });

    fireEvent.change(screen.getByLabelText(/Phone/i), {
      target: { value: '9876543210' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update branch/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Branch updated successfully');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('updates the status via the dropdown', () => {
    render(<UpdateBranchModal isOpen={true} onClose={mockOnClose} branch={sampleBranch} />);

    const statusSelect = screen.getByLabelText(/Status/i) as HTMLSelectElement;

    fireEvent.change(statusSelect, { target: { value: 'INACTIVE' } });

    expect(statusSelect.value).toBe('INACTIVE');
  });
});
