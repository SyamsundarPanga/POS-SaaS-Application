import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductList from '../../../features/products/ProductList';
import { Product } from '../../../types/product.types';

const products: Product[] = [
  { id: 1, name: 'Mouse', sku: 'M1', price: 10, status: 'ACTIVE', imageUrl: '', currentStock: 3, unit: 'pcs' } as any,
];

describe('ProductList Component', () => {
  it('renders rows and triggers actions', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(<ProductList products={products} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('Mouse')).toBeInTheDocument();

    const editBtn = screen.getByText(/Edit/i);
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

    // find a button without visible text (delete icon-only button)
    const allButtons = screen.getAllByRole('button');
    const deleteBtn = allButtons.find((b) => (b.textContent || '').trim() === '');
    if (!deleteBtn) throw new Error('delete button not found');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('shows empty state when no products', () => {
    render(<ProductList products={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/No products found./i)).toBeInTheDocument();
  });
});
