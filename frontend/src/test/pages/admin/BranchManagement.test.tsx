import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BranchManagement from '../../../pages/admin/BranchManagement';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import toast from '../../../utils/toast';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/branchSlice', () => ({
  fetchBranches: jest.fn(() => ({ type: 'branches/fetch' })),
  deleteBranch: jest.fn((id: number) => ({ type: 'branches/delete', payload: id })),
}));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../components/forms/CreateBranchModal', () => ({ isOpen }: any) =>
  isOpen ? <div>CreateBranchModal</div> : null,
);
jest.mock('../../../components/forms/UpdateBranchModal', () => ({ isOpen }: any) =>
  isOpen ? <div>UpdateBranchModal</div> : null,
);
jest.mock('../../../components/forms/ViewBranchModal', () => ({ isOpen }: any) =>
  isOpen ? <div>ViewBranchModal</div> : null,
);
jest.mock('../../../components/ui/ConfirmModal', () => (props: any) =>
  props.isOpen ? <button onClick={props.onConfirm}>Confirm Delete</button> : null,
);

describe('BranchManagement', () => {
  const mockDispatch = jest.fn();
  const mockUnwrap = jest.fn();

  const mockBranches = [
    { id: 1, name: 'Hyderabad Branch', code: 'HYD01', email: 'hyd@test.com', city: 'Hyderabad', status: 'ACTIVE' },
    { id: 2, name: 'Bangalore Branch', code: 'BLR01', email: 'blr@test.com', city: 'Bangalore', status: 'INACTIVE' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnwrap.mockResolvedValue(undefined);
    mockDispatch.mockImplementation(() => ({ unwrap: mockUnwrap }));

    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({ branches: { branches: mockBranches, loading: false } }),
    );
  });

  it('renders branch list', () => {
    render(<BranchManagement />);
    expect(screen.getByText('Hyderabad Branch')).toBeInTheDocument();
    expect(screen.getByText('Bangalore Branch')).toBeInTheDocument();
  });

  it('dispatches fetch on mount', () => {
    render(<BranchManagement />);
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('filters by search term', () => {
    render(<BranchManagement />);
    fireEvent.change(screen.getByPlaceholderText(/search branches/i), {
      target: { value: 'Bangalore' },
    });
    expect(screen.getByText('Bangalore Branch')).toBeInTheDocument();
  });

  it('opens create, view and update modals', async () => {
    render(<BranchManagement />);
    fireEvent.click(screen.getByRole('button', { name: /add branch/i }));
    expect(screen.getByText('CreateBranchModal')).toBeInTheDocument();

    // Open menu for the first row
    const menus = screen.getAllByRole('button');
    const menuButton = menus.find(b => b.innerHTML.includes('MoreVertical')) || menus[2]; // Fallback if search fails
    fireEvent.click(menuButton);

    // Click View Details
    fireEvent.click(screen.getByText(/view details/i));
    expect(screen.getByText('ViewBranchModal')).toBeInTheDocument();

    // Click Edit Config (re-open menu since it closes)
    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText(/edit config/i));
    expect(screen.getByText('UpdateBranchModal')).toBeInTheDocument();
  });

  it('opens delete confirm and confirms deletion', async () => {
    render(<BranchManagement />);

    // Open menu
    const menus = screen.getAllByRole('button');
    const menuButton = menus.find(b => b.innerHTML.includes('MoreVertical')) || menus[2];
    fireEvent.click(menuButton);

    fireEvent.click(screen.getByText(/delete branch/i));
    fireEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Branch deleted successfully');
    });
  });
});

