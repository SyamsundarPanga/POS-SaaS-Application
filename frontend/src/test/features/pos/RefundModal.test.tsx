import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import RefundModal from '../../../features/pos/RefundModal';

jest.mock('../../../components/ui/EnhancedModal', () => {
  return ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null);
});

describe('POS RefundModal', () => {
  const items = [
    { id: 1, productId: 10, name: 'Item A', sku: 'A', price: 100, quantity: 1, discount: 0, subtotal: 100 },
  ];

  it('submits refund payload', async () => {
    const onRefund = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <RefundModal
        isOpen={true}
        onClose={onClose}
        orderId={77}
        items={items}
        totalAmount={100}
        onRefund={onRefund}
        requireManagerApproval={false}
      />,
    );

    // Must select at least one item to make refundAmount > 0
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /select a reason/i }));
    fireEvent.click(screen.getByText('Wrong item'));
    fireEvent.click(screen.getByRole('button', { name: /process refund/i }));

    await waitFor(() => {
      expect(onRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 77,
          reason: 'Wrong item',
          refundAmount: 100,
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});

