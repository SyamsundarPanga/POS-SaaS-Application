import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { Package, Plus } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={Package}
        title="No products"
        description="No products available yet."
      />
    );

    expect(screen.getByText('No products')).toBeInTheDocument();
    expect(screen.getByText('No products available yet.')).toBeInTheDocument();
  });

  it('renders action button and handles click', () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        title="No data"
        action={{ label: 'Add product', onClick, icon: Plus }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add product/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

