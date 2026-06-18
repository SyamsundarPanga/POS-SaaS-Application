import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { CheckoutModal } from '../../../features/pos/CheckoutModal';
import orderService from '../../../services/orderService';

jest.mock('../../../services/orderService', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock('../../../services/paymentService', () => ({
  __esModule: true,
  default: { processRazorpayPayment: jest.fn() },
}));

jest.mock('../../../components/ui/EnhancedModal', () => {
  return ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null);
});

describe('POS CheckoutModal', () => {
  const items = [
    {
      id: 1,
      productId: 1,
      name: 'Tea',
      sku: 'TEA-1',
      price: 20,
      quantity: 2,
      discount: 0,
      subtotal: 40,
    },
  ];

  it('does not render when closed', () => {
    const { container } = render(
      <CheckoutModal
        isOpen={false}
        onClose={jest.fn()}
        items={items}
        customer={null}
        total={40}
        onComplete={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('completes cash flow and calls onComplete', async () => {
    (orderService.create as jest.Mock).mockResolvedValue({ data: { id: 999 } });
    const onComplete = jest.fn();

    render(
      <CheckoutModal
        isOpen={true}
        onClose={jest.fn()}
        items={items}
        customer={null}
        total={40}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /complete sale/i }));

    await waitFor(() => {
      expect(orderService.create).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });
});

