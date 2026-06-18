import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductManagement from '../../../pages/admin/ProductManagement';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/productSlice', () => ({
  fetchProducts: jest.fn((payload: any) => ({ type: 'products/fetch', payload })),
  deleteProduct: jest.fn((id: number) => ({ type: 'products/delete', payload: id })),
}));
jest.mock('../../../store/slices/categorySlice', () => ({
  fetchCategoryHierarchy: jest.fn(() => ({ type: 'categories/fetchHierarchy' })),
}));
jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../features/products/ProductList', () => () => <div>ProductList</div>);
jest.mock('../../../features/products/ProductGrid', () => () => <div>ProductGrid</div>);
jest.mock('../../../features/products/CreateProductModal', () => () => null);
jest.mock('../../../features/products/EditProductModal', () => () => null);
jest.mock('../../../components/modal/CategoryModal', () => () => null);
jest.mock('../../../components/ui/ConfirmModal', () => () => null);
jest.mock('../../../components/ui/EnhancedModal', () => ({
  __esModule: true,
  default: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
}));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));
jest.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => (props: any) =>
        React.createElement(tag, props, props.children),
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('ProductManagement', () => {
  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        products: { products: { content: [] }, loading: false, error: null },
        categories: { hierarchy: [] },
      }),
    );
  });

  it('renders and opens add product action', () => {
    render(<ProductManagement />);
    expect(screen.getByText('Management')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add product/i }));
  });
});
