import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderManagement from '../../../pages/admin/OrderManagement';
import orderService from '../../../services/orderService';

jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../features/orders/OrderDetailModal', () => () => null);
jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: () => ({}),
}));
jest.mock('../../../services/orderService');

describe('OrderManagement', () => {
  beforeEach(() => {
    (orderService.getAll as jest.Mock).mockResolvedValue({ data: { content: [], totalPages: 0, totalElements: 0 } });
  });

  it('renders order management page', async () => {
    render(<OrderManagement />);
    expect(screen.getByText('Sales Overview')).toBeInTheDocument();
    await waitFor(() => expect(orderService.getAll).toHaveBeenCalled());
  });
});

