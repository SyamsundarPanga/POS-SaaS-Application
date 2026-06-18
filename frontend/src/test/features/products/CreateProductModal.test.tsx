import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * CRITICAL: We mock BarcodeScanner BEFORE importing the CreateProductModal.
 * This prevents Jest from trying to resolve Quagga/Sharp.
 */
jest.mock('../../../components/barcode/BarcodeScanner', () => ({
  __esModule: true,
  default: ({ onScan }: any) => (
    <button type="button" onClick={() => onScan('999888777')}>Scan Mock</button>
  ),
}), { virtual: true });

// Now we can safely import the component
import CreateProductModal from '../../../features/products/CreateProductModal';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

// Mock Services
import userService from '../../../services/userService';
import branchService from '../../../services/branchService';

jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: { getProfile: jest.fn() }
}), { virtual: true });

jest.mock('../../../services/branchService', () => ({
  __esModule: true,
  default: { getBranches: jest.fn() }
}), { virtual: true });

// Mock Redux Hooks
jest.mock('../../../store/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

// Mock the Product Slice Thunk
const mockThunk = jest.fn().mockImplementation((payload) => ({
  type: 'products/create/fulfilled',
  payload: payload
}));

jest.mock('../../../store/slices/productSlice', () => ({
  __esModule: true,
  createProductWithImage: (data: any) => mockThunk(data),
}), { virtual: true });

jest.mock('../../../pages/admin/CategorySelector', () => ({
  __esModule: true,
  default: ({ onSelect }: any) => (
    <select data-testid="cat-select" onChange={(e) => onSelect(Number(e.target.value))}>
      <option value="">Select Category</option>
      <option value="5">Groceries</option>
    </select>
  ),
}));

describe('CreateProductModal - Service Mock Testing', () => {
  const mockDispatch = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    
    // Setup RTK matchers
    const { createProductWithImage } = require('../../../store/slices/productSlice');
    createProductWithImage.fulfilled = { match: (a: any) => a?.type?.endsWith('fulfilled') };
    createProductWithImage.rejected = { match: (a: any) => a?.type?.endsWith('rejected') };

    (branchService.getBranches as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Main Store', isMainBranch: true },
    ]);
    mockDispatch.mockResolvedValue({ type: 'products/create/fulfilled', payload: {} });
  });

  it('does not show branch validation on open and prefers the selected store-admin branch', async () => {
    (useAppSelector as jest.Mock).mockReturnValue({
      user: { roles: ['ROLE_STORE_ADMIN'], branchId: null, username: 'store-admin' }
    });

    (branchService.getBranches as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Main Store', isMainBranch: true },
      { id: 2, name: 'City Store', isMainBranch: false },
    ]);

    await act(async () => {
      render(<CreateProductModal open={true} onClose={mockOnClose} preferredBranchId={2} />);
    });

    await screen.findByRole('option', { name: /city store/i });
    const branchSelect = document.querySelector('select[name="branchId"]') as HTMLSelectElement;

    await waitFor(() => {
      expect(branchSelect.value).toBe('2');
    });

    expect(screen.queryByText(/^Please select a branch$/i)).not.toBeInTheDocument();
  });

  it('Submission: Calls dispatch with form data and bypasses Sharp error', async () => {
    (useAppSelector as jest.Mock).mockReturnValue({
      user: { roles: ['ROLE_STORE_ADMIN'], branchId: 1, username: 'admin' }
    });

    await act(async () => {
      render(<CreateProductModal open={true} onClose={mockOnClose} />);
    });

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g. Wireless Mouse/i), { target: { value: 'New Item' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.change(screen.getByTestId('cat-select'), { target: { value: '5' } });

    // Click our mock scanner button
    fireEvent.click(screen.getByText('Scan Mock'));

    await screen.findByRole('option', { name: /main store/i });
    const branchSelect = document.querySelector('select[name="branchId"]') as HTMLSelectElement;
    fireEvent.change(branchSelect, { target: { value: '1' } });

    const submitBtn = screen.getByRole('button', { name: /Save Product/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockThunk).toHaveBeenCalledWith(
        expect.objectContaining({
          productData: expect.objectContaining({
            name: 'New Item',
            barcode: '999888777'
          })
        })
      );
    });
  });
});
