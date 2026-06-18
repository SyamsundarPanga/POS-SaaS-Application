import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import BarcodeScanner from '../../../features/pos/BarcodeScanner';

describe('POS BarcodeScanner', () => {
  it('renders with default placeholder', () => {
    render(<BarcodeScanner onScan={jest.fn()} />);
    expect(screen.getByPlaceholderText('Scan or enter barcode...')).toBeInTheDocument();
  });

  it('calls onScan when Enter is pressed with valid barcode', () => {
    const onScan = jest.fn();
    render(<BarcodeScanner onScan={onScan} autoSubmit={false} />);

    const input = screen.getByPlaceholderText('Scan or enter barcode...');
    fireEvent.change(input, { target: { value: '12345678' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onScan).toHaveBeenCalledWith('12345678');
  });
});

