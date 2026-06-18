import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import ProductSearch from '../../../features/pos/POSProductSearch';

const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    mockUseAppSelector(selector),
}));

jest.mock('../../../store/slices/productSlice', () => ({
  fetchProducts: jest.fn((payload: any) => ({ type: 'products/fetch', payload })),
}));

jest.mock('../../../components/barcode/BarcodeScanner', () => {
  const React = require('react');
  return React.forwardRef((_props: any, _ref: any) => <div data-testid="barcode-scanner" />);
});

describe('POS ProductSearch', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockUseAppSelector.mockImplementation((selector: any) =>
      selector({
        products: {
          products: { content: [{ id: 1, name: 'Milk', sku: 'MLK', price: 40, status: 'ACTIVE' }] },
          loading: false,
        },
      }),
    );
  });

  it('renders and lets user select product from results', () => {
    const onProductSelect = jest.fn();
    render(<ProductSearch onProductSelect={onProductSelect} />);

    fireEvent.change(screen.getByPlaceholderText(/search products/i), {
      target: { value: 'Mi' },
    });

    fireEvent.click(screen.getByText('Milk'));
    expect(onProductSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Milk' }));
  });
});

