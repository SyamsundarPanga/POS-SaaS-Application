import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import VoidTransactionModal from '../../../features/pos/VoidTransactionModal';

jest.mock('../../../components/ui/EnhancedModal', () => {
  return ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null);
});

describe('POS VoidTransactionModal', () => {
  const items = [
    { id: 1, productId: 10, name: 'Item A', sku: 'A', price: 100, quantity: 1, discount: 0, subtotal: 100 },
  ];

  it('submits void payload', async () => {
    const onVoid = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <VoidTransactionModal
        isOpen={true}
        onClose={onClose}
        orderId={101}
        items={items}
        totalAmount={100}
        onVoid={onVoid}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/provide a detailed reason/i), {
      target: { value: 'Cashier mistake' },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter manager pin/i), {
      target: { value: '1234' },
    });
    fireEvent.change(screen.getByPlaceholderText(/type void/i), {
      target: { value: 'VOID' },
    });

    fireEvent.click(screen.getByRole('button', { name: /void transaction/i }));

    await waitFor(() => {
      expect(onVoid).toHaveBeenCalledWith({
        orderId: 101,
        reason: 'Cashier mistake',
        managerPin: '1234',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});

