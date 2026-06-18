import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboardPage from '../../../pages/admin/DashboardPage';

jest.mock('recharts', () => {
  const Mock = () => null;
  return {
    Line: Mock,
    Area: Mock,
    BarChart: Mock,
    Bar: Mock,
    PieChart: Mock,
    Pie: Mock,
    Cell: Mock,
    XAxis: Mock,
    YAxis: Mock,
    CartesianGrid: Mock,
    Tooltip: Mock,
    ResponsiveContainer: Mock,
    Radar: Mock,
    RadarChart: Mock,
    ComposedChart: Mock,
    PolarGrid: Mock,
    PolarAngleAxis: Mock,
    PolarRadiusAxis: Mock,
    AreaChart: Mock,
    Legend: Mock,
    RadialBarChart: Mock,
    RadialBar: Mock,
  };
});

jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);

jest.mock('../../../services/dashboardService', () => ({
  getAdminDashboard: jest.fn().mockResolvedValue({ totalRevenue: 0 }),
  getRevenueTrends: jest.fn().mockResolvedValue([]),
  getCategoryDistribution: jest.fn().mockResolvedValue([]),
  getWeeklySales: jest.fn().mockResolvedValue([]),
  getBranchPerformanceData: jest.fn().mockResolvedValue([]),
  getInventoryStatus: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../services/subscriptionService', () => ({
  __esModule: true,
  default: {
    getCurrentPlan: jest.fn().mockResolvedValue(null),
    getUsageStatistics: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../../services/branchService', () => ({
  __esModule: true,
  default: { getBranches: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: { getUsers: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../../services/productService', () => ({
  __esModule: true,
  default: { getProducts: jest.fn().mockResolvedValue({ data: { content: [] } }) },
}));

jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
}));

describe('AdminDashboardPage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders dashboard shell', async () => {
    render(<AdminDashboardPage />);
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });
});
