import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductGrid from '../../../features/products/ProductGrid';
import { Product } from '../../../types/product.types';

const mockProducts: Product[] = [
  { id: 1, name: 'Mouse', sku: 'M1', barcode: '111', price: 10, status: 'ACTIVE', imageUrl: 'http://img', categoryName: 'Hardware', currentStock: 5, unit: 'pcs' } as any,
  { id: 2, name: 'Keyboard', sku: 'K1', barcode: '222', price: 20, status: 'INACTIVE', imageUrl: '', categoryName: 'Peripherals', currentStock: 2, unit: 'pcs' } as any,
];

describe('ProductGrid Component', () => {
  it('renders products and handles edit/delete', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(<ProductGrid products={mockProducts} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('Mouse')).toBeInTheDocument();
    expect(screen.getByText('Keyboard')).toBeInTheDocument();
    expect(screen.getByText(/₹10/)).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    // first button: edit for first product
    fireEvent.click(buttons[0]);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

    // second button: delete for first product
    fireEvent.click(buttons[1]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('shows empty state when no products', () => {
    render(<ProductGrid products={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/No products found in this category./i)).toBeInTheDocument();
  });
});
