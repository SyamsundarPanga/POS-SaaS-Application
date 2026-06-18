import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InventoryView from '../../../pages/admin/InventoryView';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/inventorySlice', () => ({
  fetchInventory: jest.fn((payload: any) => ({ type: 'inventory/fetch', payload })),
}));
jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../features/inventory/AdjustStockModal', () => () => null);
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockImplementation(async () => ({ data: { content: [] } })),
    post: jest.fn(),
  },
}));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('InventoryView', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (useAppDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({ inventory: { items: [], loading: false, error: null } }),
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders inventory shell', async () => {
    render(<InventoryView />);
    await waitFor(() => expect(screen.getByText('Sidebar')).toBeInTheDocument());
  });
});
