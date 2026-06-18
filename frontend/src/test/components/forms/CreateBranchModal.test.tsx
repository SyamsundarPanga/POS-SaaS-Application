import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import CreateBranchModal from '../../../components/forms/CreateBranchModal';
import * as hooks from '../../../store/hooks';

// ✅ Mock custom toast utility
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

import toast from '../../../utils/toast';

describe('CreateBranchModal Integration', () => {
  const mockOnClose = jest.fn();
  const mockUnwrap = jest.fn();
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // ✅ Mock RTK unwrap behavior
    mockUnwrap.mockResolvedValue({ id: 123 });
    mockDispatch.mockReturnValue({ unwrap: mockUnwrap });

    jest.spyOn(hooks, 'useAppDispatch').mockReturnValue(mockDispatch);

    // ✅ Mock Redux state
    jest.spyOn(hooks, 'useAppSelector').mockImplementation((selector) =>
      selector({
        auth: { user: { username: 'Admin' } },
        branches: {
          loading: false,
          branches: [],
        },
      } as any),
    );
  });

  it('submits correctly and triggers success', async () => {
    render(<CreateBranchModal isOpen={true} onClose={mockOnClose} />);

    // ✅ Fill form fields
    fireEvent.change(screen.getByPlaceholderText(/Dmart Mumbai/i), {
      target: { value: 'New Branch' },
    });

    fireEvent.change(screen.getByPlaceholderText(/BR-001/i), {
      target: { value: 'NB-01' },
    });

    fireEvent.change(screen.getByPlaceholderText(/Street, Building No./i), {
      target: { value: '123 Main St' },
    });

    fireEvent.change(screen.getByLabelText(/City/i), {
      target: { value: 'Mumbai' },
    });

    fireEvent.change(screen.getByLabelText(/State/i), {
      target: { value: 'Maharashtra' },
    });

    fireEvent.change(screen.getByLabelText(/Zip/i), {
      target: { value: '400001' },
    });

    fireEvent.change(screen.getByLabelText(/Phone/i), {
      target: { value: '9876543210' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@branch.com' },
    });

    // ✅ Submit form
    const submitButton = screen.getByRole('button', {
      name: /save branch details/i,
    });

    fireEvent.click(submitButton);

    // ✅ Assert async flow
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockUnwrap).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Branch created successfully');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
