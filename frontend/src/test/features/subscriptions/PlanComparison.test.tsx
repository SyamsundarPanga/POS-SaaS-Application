import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlanComparison from '../../../features/subscriptions/PlanComparison';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({
      subscription: {
        currentPlan: {
          id: 'BASIC',
          name: 'BASIC',
          price: 1299,
          billingCycle: 'MONTHLY',
          features: {
            maxBranches: 10,
            maxUsers: 50,
            maxProducts: 1000,
            includedFeatures: ['Advanced reporting'],
          },
        },
        availablePlans: [
          { id: 'BASIC', name: 'BASIC', price: 1299, billingCycle: 'MONTHLY', features: { maxBranches: 10, maxUsers: 50, maxProducts: 1000, includedFeatures: ['Advanced reporting'] } },
          { id: 'PRO', name: 'PRO', price: 2999, billingCycle: 'MONTHLY', features: { maxBranches: 100, maxUsers: 500, maxProducts: 9000, includedFeatures: ['Shift management features'] } },
          { id: 'ADVANCE', name: 'ADVANCE', price: 4999, billingCycle: 'MONTHLY', features: { maxBranches: 400, maxUsers: 5000, maxProducts: 50000, includedFeatures: ['Dedicated account manager'] } },
        ],
        loading: false,
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
  selectAvailablePlans: (state: any) => state.subscription.availablePlans,
  selectSubscriptionLoading: (state: any) => state.subscription.loading,
}));

jest.mock('../../../store/slices/uiSlice', () => ({
  openModal: jest.fn((payload: any) => ({ type: 'ui/openModal', payload })),
}));

jest.mock('../../../components/ui', () => ({
  LoadingSkeleton: () => <div>Loading</div>,
}));

jest.mock('../../../features/subscriptions/PlanChangeModal', () => () => <div>PlanChangeModal</div>);

describe('PlanComparison', () => {
  it('renders and dispatches plan selection', () => {
    render(<PlanComparison />);

    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    const before = mockDispatch.mock.calls.length;
    fireEvent.click(screen.getAllByRole('button', { name: /upgrade/i })[0]);

    expect(mockDispatch.mock.calls.length).toBeGreaterThan(before);
  });
});
