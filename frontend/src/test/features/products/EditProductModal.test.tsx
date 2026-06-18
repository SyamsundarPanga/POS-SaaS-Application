import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditProductModal from '../../../features/products/EditProductModal';
import { useAppDispatch } from '../../../store/hooks';

// 1. Mock Category Selector
jest.mock('../../../pages/admin/CategorySelector', () => ({
  __esModule: true,
  default: ({ onSelect, selectedId }: any) => (
    <select data-testid="cat-select" value={selectedId || ''} onChange={(e) => onSelect(Number(e.target.value))}>
      <option value="">Select Category</option>
      <option value="10">Hardware</option>
    </select>
  ),
}));

// 1.b Mock Barcode Scanner to avoid native image processing dependencies (sharp)
jest.mock('../../../components/barcode/BarcodeScanner', () => ({
  __esModule: true,
  default: ({ onScan }: any) => (
    <button data-testid="barcode-scan" onClick={() => onScan && onScan('SCANNED_CODE')}>Scan</button>
  ),
}));

// 2. Mock Dispatch and Actions
jest.mock('../../../store/hooks', () => ({ useAppDispatch: jest.fn() }));

const mockUpdateActionSpy = jest.fn();
jest.mock('../../../store/slices/productSlice', () => {
  const mockThunk = (data: any) => async (dispatch: any) => {
    mockUpdateActionSpy(data);
    const action = { type: 'product/update/fulfilled', payload: data };
    dispatch(action);
    return action; // 🚨 Fixes the "reading payload" TypeError
  };
  (mockThunk as any).fulfilled = {
    match: (action: any) => action?.type === 'product/update/fulfilled'
  };
  return { __esModule: true, updateProduct: mockThunk };
});

describe('EditProductModal Component', () => {
  const mockDispatch = jest.fn();
  const mockOnClose = jest.fn();
  const sampleProduct = { id: 123, name: 'Old Name', price: 20, barcode: '1', categoryId: 10 };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    mockDispatch.mockImplementation(async (action) => (typeof action === 'function' ? await action(mockDispatch) : action));
  });

  it('submits form correctly', async () => {
    render(<EditProductModal open={true} onClose={mockOnClose} product={sampleProduct as any} />);

    // Wait for form population
    const nameInput = await screen.findByDisplayValue('Old Name');
    
    // Fill form - Use fireEvent.input for numbers
    fireEvent.input(nameInput, { target: { value: 'New Gaming Mouse' } });
    // The price input is a number input without an associated label 'for' attribute,
    // so query by role (spinbutton) instead of label text to avoid accessibility lookup failures.
    const priceInput = screen.getByRole('spinbutton');
    fireEvent.input(priceInput, { target: { value: '55.99' } });
    fireEvent.input(screen.getByPlaceholderText(/Scan or type/i), { target: { value: '888777666' } });

    const submitBtn = screen.getByRole('button', { name: /Update Record/i });
    
    await act(async () => { fireEvent.click(submitBtn); });

    await waitFor(() => {
      expect(mockUpdateActionSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: 123,
        productData: expect.objectContaining({ name: 'New Gaming Mouse' })
      }));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows validation errors when required fields are empty', async () => {
    render(<EditProductModal open={true} onClose={mockOnClose} product={sampleProduct as any} />);

    const nameInput = await screen.findByDisplayValue('Old Name');
    fireEvent.input(nameInput, { target: { value: '' } });

    const priceInput = screen.getByRole('spinbutton');
    fireEvent.input(priceInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Update Record/i });
    await act(async () => { fireEvent.click(submitBtn); });

    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Price is required/i)).toBeInTheDocument();
    expect(mockUpdateActionSpy).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('allows category change and file upload', async () => {
    const { container } = render(<EditProductModal open={true} onClose={mockOnClose} product={{ ...sampleProduct, categoryId: undefined } as any} />);

    // change category
    const catSelect = await screen.findByTestId('cat-select');
    fireEvent.change(catSelect, { target: { value: '10' } });

    // update name and price
    const nameInput = await screen.findByDisplayValue('Old Name');
    fireEvent.input(nameInput, { target: { value: 'Uploaded Product' } });
    const priceInput = screen.getByRole('spinbutton');
    fireEvent.input(priceInput, { target: { value: '99.99' } });

    // upload file - select the file input directly from the component DOM since the label
    // isn't associated with the input (no htmlFor/id in production code)
    const file = new File(['abc'], 'test.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) throw new Error('file input not found');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = screen.getByRole('button', { name: /Update Record/i });
    await act(async () => { fireEvent.click(submitBtn); });

    await waitFor(() => {
      expect(mockUpdateActionSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: 123,
        file: expect.any(File),
        productData: expect.objectContaining({ name: 'Uploaded Product', categoryId: 10 })
      }));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});