import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderHistoryPage from '../../../pages/cashier/OrderHistoryPage';

jest.mock('../../../store/hooks', () => ({
  useAppSelector: (selector: any) => selector({ auth: { user: { username: 'cashier1' } } }),
}));
jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../components/ui/EnhancedModal', () => ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null));
jest.mock('../../../components/ui/EmptyState', () => () => <div>EmptyState</div>);
jest.mock('../../../components/ui/LoadingSkeleton', () => () => <div>Loading</div>);
jest.mock('../../../features/pos/RefundModal', () => () => null);
jest.mock('../../../utils/receiptGenerator', () => ({ printReceipt: jest.fn() }));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));
jest.mock('../../../services/orderService', () => ({
  __esModule: true,
  default: {
    getMyOrders: jest.fn().mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 }),
    getById: jest.fn(),
    processRefund: jest.fn(),
  },
}));

describe('OrderHistoryPage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders order history page', async () => {
    render(<OrderHistoryPage />);
    expect(screen.getByText('Order History')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Sidebar')).toBeInTheDocument());
  });
});
