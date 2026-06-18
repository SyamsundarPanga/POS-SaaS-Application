import React from 'react';
import { render, screen } from '../../test-utils';
import CardPayment from '../../../features/pos/CardPayment';

describe('POS CardPayment', () => {
  it('renders component text', () => {
    render(<CardPayment />);
    expect(screen.getByText('CardPayment')).toBeInTheDocument();
  });
});

