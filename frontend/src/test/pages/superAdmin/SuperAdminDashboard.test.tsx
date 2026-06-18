import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import { within } from '@testing-library/react';
import SuperAdminDashboard from '../../../../src/pages/superadmin/SuperAdminDashboard';
import api from '../../../../src/services/api';

jest.mock('../../../../src/services/api', () => ({
  get: jest.fn(),
}));

describe('SuperAdminDashboard', () => {
  beforeAll(() => {
    // Provide a minimal ResizeObserver mock for recharts' ResponsiveContainer
    (global as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterAll(() => {
    try {
      delete (global as any).ResizeObserver;
    } catch (e) {
      (global as any).ResizeObserver = undefined;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('superadmin', JSON.stringify({ accessToken: 'token' }));
  });

  it('renders dashboard after fetching stats', async () => {
    const mockStats = {
      totalTenants: 5,
      activeTenants: 4,
      inactiveTenants: 1,
      basicPlanCount: 2,
      proPlanCount: 2,
      advancePlanCount: 1,
      totalMonthlyRevenue: 10000,
      projectedAnnualRevenue: 120000,
      totalUsers: 10,
      totalBranches: 3,
      totalProducts: 20,
      totalOrders: 50,
      tenantsCreatedThisMonth: 2,
      tenantsCreatedToday: 1,
    };

    (api.get as jest.Mock).mockResolvedValue({ data: mockStats });

    render(<SuperAdminDashboard />);

    await waitFor(() => expect(screen.getByText(/Platform Analytics/i)).toBeInTheDocument());

    // Ensure the Total Tenants KPI shows the expected value specifically
    const tenantsLabel = screen.getByText(/Total Tenants/i);
    const tenantsContainer = tenantsLabel.parentElement as HTMLElement;
    expect(within(tenantsContainer).getByText('5')).toBeInTheDocument();
  });
});
