import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductCard from '../../../features/products/ProductCard';
import { Product } from '../../../types/product.types';

const mockProduct: Product = {
  id: 123,
  name: 'Gaming Mouse',
  sku: 'GM-001',
  barcode: '888777666',
  price: 55.99,
  status: 'ACTIVE',
  imageUrl: 'https://example.com/mouse.jpg',
  categoryId: 10,
  unit: 'PCS',
  isTaxable: true,
  description: 'Pro gaming mouse'
} as any;

describe('ProductCard Component', () => {
  it('renders product details correctly', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Gaming Mouse')).toBeInTheDocument();
    expect(screen.getByText(/SKU: GM-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Barcode: 888777666/i)).toBeInTheDocument();
    expect(screen.getByText(/₹ 55.99/)).toBeInTheDocument();
  });

  it('renders "No Image" placeholder when imageUrl is missing', () => {
    const noImgProduct = { ...mockProduct, imageUrl: '' } as any;
    render(<ProductCard product={noImgProduct} />);
    expect(screen.getByText(/No Image/i)).toBeInTheDocument();
  });
});
