import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { CreateCustomerModal } from '../../../features/pos/CreateCustomerModal';

jest.mock('axios');

describe('POS CreateCustomerModal', () => {
  it('submits form and calls callbacks', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { id: 10, name: 'John' } });
    const onClose = jest.fn();
    const onCustomerCreated = jest.fn();

    render(
      <CreateCustomerModal
        isOpen={true}
        onClose={onClose}
        onCustomerCreated={onCustomerCreated}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Customer name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('+1234567890'), { target: { value: '9999999999' } });
    fireEvent.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(onCustomerCreated).toHaveBeenCalledWith({ id: 10, name: 'John' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
