import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { CustomerSelector } from '../../../features/pos/CustomerSelector';
import customerService from '../../../services/customerService';

jest.mock('../../../services/customerService');
jest.mock('../../../components/modal/CreateCustomerModal', () => () => null);
jest.mock('../../../components/ui/EnhancedModal', () => {
  return ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null);
});

describe('POS CustomerSelector', () => {
  it('searches and selects customer', async () => {
    (customerService.search as jest.Mock).mockResolvedValue({
      data: [{ id: 1, name: 'Alice', phone: '999', loyaltyPoints: 10, loyaltyTier: 'GOLD' }],
    });
    const onSelectCustomer = jest.fn();

    render(
      <CustomerSelector
        selectedCustomer={null}
        onSelectCustomer={onSelectCustomer}
        onCreateCustomer={jest.fn()}
        isOpen={true}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: 'Al' } });

    await waitFor(() => expect(customerService.search).toHaveBeenCalledWith('Al'));
    fireEvent.click(await screen.findByText('Alice'));
    expect(onSelectCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Alice' }),
    );
  });
});
