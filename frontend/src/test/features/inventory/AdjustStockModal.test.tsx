import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import AdjustStockModal from '../../../features/inventory/AdjustStockModal';
import branchService from '../../../services/branchService';
import inventoryService from '../../../services/inventoryService';
import toast from '../../../utils/toast';

// 1. Mock the Services and Toast (Not the Slice)
jest.mock('../../../services/branchService');
jest.mock('../../../services/inventoryService');
jest.mock('../../../utils/toast');

describe('AdjustStockModal Component (Service Mocking)', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockItem = {
    productId: 101,
    productName: 'Test Product',
    quantity: 50,
    availableQuantity: 45,
    branchId: 1,
  };

  const mockBranches = [
    { id: 1, name: 'Main Branch' },
    { id: 2, name: 'Downtown Branch' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Service Mocks
    (branchService.getBranches as jest.Mock).mockResolvedValue(mockBranches);
    (inventoryService.adjustStock as jest.Mock).mockResolvedValue({ data: { success: true } });
  });

  const renderModal = () =>
    render(<AdjustStockModal item={mockItem} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

  it('fetches branches from branchService on mount', async () => {
    renderModal();

    await waitFor(() => {
      expect(branchService.getBranches).toHaveBeenCalled();
      // Verify dropdown is populated
      const branchOption = screen.getByText('Main Branch');
      expect(branchOption).toBeInTheDocument();
    });
  });

  it('updates the "NEW TOTAL" display dynamically based on movement type', async () => {
    renderModal();

    // Wait until branches load (ensures modal fully ready)
    await waitFor(() => {
      expect(branchService.getBranches).toHaveBeenCalled();
    });

    const quantityInput = screen.getByPlaceholderText('0');

    // Case 1: Add Stock (RESTOCK default)
    fireEvent.change(quantityInput, { target: { value: '10' } });

    expect(screen.getByText('60')).toBeInTheDocument(); // 50 + 10

    // 🔥 FIX: Select movement using text instead of role
    const movementBtn = screen.getAllByRole('button', { name: /Add Stock|Remove Stock/ }).find(btn => 
      (btn as HTMLButtonElement).type === 'button'
    ) as HTMLElement;
    fireEvent.click(movementBtn);

    const removeOption = screen.getByText('Remove Stock');
    fireEvent.click(removeOption);

    expect(screen.getByText('40')).toBeInTheDocument(); // 50 - 10
  });

  it('submits adjustment via inventoryService and triggers success cycle', async () => {
    renderModal();

    // Fill form
    const quantityInput = screen.getByPlaceholderText('0');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const notesInput = screen.getByPlaceholderText(/Optional notes/i);
    fireEvent.change(notesInput, { target: { value: 'Test restock' } });

    const submitBtn = screen.getAllByRole('button').find(btn => 
      (btn as HTMLButtonElement).type === 'submit' && 
      (btn.textContent === 'Add Stock' || btn.textContent === 'Remove Stock')
    ) as HTMLElement;
    fireEvent.click(submitBtn);

    // Verify loading state
    expect(screen.getByText(/Processing.../i)).toBeInTheDocument();

    // 2. ASSERT: Check that the SERVICE was called with the specific payload
    await waitFor(() => {
      expect(inventoryService.adjustStock).toHaveBeenCalledWith({
        productId: 101,
        branchId: 1,
        quantity: 5,
        movementType: 'RESTOCK',
        notes: 'Test restock',
      });
    });

    // 3. ASSERT: Check UI side-effects
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Stock added successfully');
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles service errors and displays them in the modal', async () => {
    const errorResponse = { message: 'Insufficient permissions for this branch' };

    (inventoryService.adjustStock as jest.Mock).mockRejectedValue(errorResponse);

    renderModal();

    const submitBtn = screen.getAllByRole('button').find(btn => 
      (btn as HTMLButtonElement).type === 'submit' && 
      (btn.textContent === 'Add Stock' || btn.textContent === 'Remove Stock')
    ) as HTMLElement;
    fireEvent.click(submitBtn);

    // Wait for service call
    await waitFor(() => {
      expect(inventoryService.adjustStock).toHaveBeenCalled();
    });

    // Assert error appears in UI
    expect(await screen.findByText('Insufficient permissions for this branch')).toBeInTheDocument();

    // Ensure button text restored (loading cleared)
    // Ensure button text restored (loading cleared)
    expect(screen.getAllByRole('button').some(btn => 
      btn.getAttribute('type') === 'submit' && btn.textContent === 'Add Stock'
    )).toBe(true);
  });
});
