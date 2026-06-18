import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import POSTerminal from '../../../pages/cashier/POSTerminal';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/cartSlice', () => ({
  addToCart: jest.fn((payload: any) => ({ type: 'cart/add', payload })),
  removeFromCart: jest.fn((payload: any) => ({ type: 'cart/remove', payload })),
  updateQuantity: jest.fn((payload: any) => ({ type: 'cart/updateQty', payload })),
  clearCart: jest.fn(() => ({ type: 'cart/clear' })),
  applyDiscount: jest.fn((payload: any) => ({ type: 'cart/discount', payload })),
}));
jest.mock('../../../features/pos/POSProductSearch', () => () => <div>ProductSearch</div>);
jest.mock('../../../features/pos/Cart', () => ({ Cart: () => <div>Cart</div> }));
jest.mock('../../../features/pos/CheckoutModal', () => ({ CheckoutModal: () => null }));
jest.mock('../../../features/pos/CustomerSelector', () => ({ CustomerSelector: () => null }));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));

describe('POSTerminal', () => {
  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        cart: { items: [], total: 0, tax: 0, discount: 0 },
        auth: { user: { username: 'cashier1' } },
      }),
    );
  });

  it('renders POS terminal header', () => {
    render(<POSTerminal />);
    expect(screen.getByText('POS Terminal')).toBeInTheDocument();
    expect(screen.getByText(/Cashier: cashier1/i)).toBeInTheDocument();
  });
});

