import React from 'react';
import { render, screen } from '../../test-utils';
import CashPayment from '../../../features/pos/CashPayment';

describe('POS CashPayment', () => {
  it('renders component text', () => {
    render(<CashPayment />);
    expect(screen.getByText('CashPayment')).toBeInTheDocument();
  });
});

