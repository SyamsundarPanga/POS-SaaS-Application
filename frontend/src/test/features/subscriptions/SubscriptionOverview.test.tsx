import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionOverview from '../../../features/subscriptions/SubscriptionOverview';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({
      subscription: {
        currentPlan: {
          id: 'PRO',
          name: 'PRO',
          price: 2999,
          billingCycle: 'MONTHLY',
          features: {
            maxBranches: 100,
            maxUsers: 500,
            maxProducts: 9000,
            includedFeatures: ['Shift management features', 'Priority API access'],
          },
        },
        usageMetrics: {
          branches: { used: 2, limit: 100 },
          users: { used: 10, limit: 500 },
          products: { used: 100, limit: 9000 },
          lastUpdated: new Date().toISOString(),
        },
        loading: false,
        error: null,
      },
    }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../store/slices/subscriptionSlice', () => ({
  fetchSubscriptionData: jest.fn(() => ({ type: 'subscription/fetchData' })),
  selectCurrentPlan: (state: any) => state.subscription.currentPlan,
  selectUsageMetrics: (state: any) => state.subscription.usageMetrics,
  selectSubscriptionLoading: (state: any) => state.subscription.loading,
  selectSubscriptionError: (state: any) => state.subscription.error,
}));

jest.mock('../../../components/ui', () => ({
  LoadingSkeleton: () => <div>Loading</div>,
}));

jest.mock('../../../utils/toast', () => ({
  toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
}));

jest.mock('../../../features/subscriptions/UsageMetrics', () => ({ metrics }: any) => (
  <div>Usage: {metrics.users.used}</div>
));

describe('SubscriptionOverview', () => {
  it('renders overview and routes to actions', () => {
    render(<SubscriptionOverview />);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Shift management features')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /upgrade plan/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/subscription/upgrade');

    fireEvent.click(screen.getByRole('button', { name: /billing history/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/subscription/billing');
  });
});
