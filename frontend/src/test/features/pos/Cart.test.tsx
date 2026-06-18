import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import { Cart } from '../../../features/pos/Cart';
import { within } from '@testing-library/react';

describe('POS Cart', () => {
  const baseItem = {
    id: 1,
    productId: 10,
    name: 'Coffee',
    sku: 'COF-1',
    price: 100,
    quantity: 2,
    discount: 0,
    subtotal: 200,
  };

  it('shows empty state', () => {
    render(
      <Cart
        items={[]}
        onUpdateQuantity={jest.fn()}
        onRemoveItem={jest.fn()}
        onClearCart={jest.fn()}
      />,
    );

    expect(screen.getByText(/No items in cart/i)).toBeInTheDocument();
  });

  it('calls cart handlers from controls accurately', () => {
    const onUpdateQuantity = jest.fn();
    const onRemoveItem = jest.fn();
    const onClearCart = jest.fn();

    render(
      <Cart
        items={[baseItem]}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onClearCart={onClearCart}
      />,
    );

    // 1. Test Remove Item (using the title attribute from Lucide or Button)
    const removeBtn = screen.getByTitle(/Remove item/i);
    fireEvent.click(removeBtn);
    expect(onRemoveItem).toHaveBeenCalledWith(1);

    // 2. Find quantity controls from the cart item block (minus, plus)
    const itemBlock = screen.getByText('Coffee').closest('.bg-white.border') as HTMLElement;
    const itemButtons = within(itemBlock).getAllByRole('button');
    const minusButton = itemButtons[1];
    const plusButton = itemButtons[2];

    fireEvent.click(plusButton);

    // Verify: ID is 1, Quantity increases from 2 to 3
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 3);

    // 3. Test Decrease Quantity
    fireEvent.click(minusButton);

    // Verify: ID is 1, Quantity decreases from 2 to 1
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 1);
  });

  it('triggers clear cart handler', () => {
    const onClearCart = jest.fn();
    
    render(
      <Cart
        items={[baseItem]}
        onUpdateQuantity={jest.fn()}
        onRemoveItem={jest.fn()}
        onClearCart={onClearCart}
      />,
    );

    const clearBtn = screen.getByRole('button', { name: /Clear Cart/i });
    fireEvent.click(clearBtn);

    expect(onClearCart).toHaveBeenCalled();
  });
});
