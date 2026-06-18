import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import CategoryProductBrowser from '../../../features/pos/CategoryProductBrowser';
import productService from '../../../services/productService';

const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

jest.mock('../../../store/slices/categorySlice', () => ({
  fetchCategoryHierarchy: jest.fn(() => ({ type: 'categories/fetchHierarchy' })),
}));

jest.mock('../../../services/productService');
jest.mock('../../../utils/toast', () => ({ error: jest.fn(), success: jest.fn() }));

describe('POS CategoryProductBrowser', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockUseAppSelector.mockImplementation((selector: any) =>
      selector({
        categories: {
          categories: [{ id: 5, name: 'Snacks', status: 'ACTIVE', displayOrder: 1 }],
          loading: false,
        },
      }),
    );
    (productService.getProducts as jest.Mock).mockResolvedValue({
      data: { content: [{ id: 1, name: 'Chips', sku: 'CHP', price: 10, status: 'ACTIVE' }] },
    });
  });

  it('loads products and selects one', async () => {
    const onProductSelect = jest.fn();
    render(<CategoryProductBrowser onProductSelect={onProductSelect} />);

    await waitFor(() => expect(productService.getProducts).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('Chips'));
    expect(onProductSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Chips' }));
  });
});
