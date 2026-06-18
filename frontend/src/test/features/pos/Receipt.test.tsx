import React from 'react';
import { render, screen } from '../../test-utils';
import Receipt from '../../../features/pos/Receipt';

describe('POS Receipt', () => {
  it('renders component text', () => {
    render(<Receipt />);
    expect(screen.getByText('Receipt')).toBeInTheDocument();
  });
});

