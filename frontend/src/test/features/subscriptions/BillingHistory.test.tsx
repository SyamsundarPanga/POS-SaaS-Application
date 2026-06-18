import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BillingHistory from '../../../features/subscriptions/BillingHistory';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({
      subscription: {
        billingHistory: [
          { id: 1, date: '2026-01-01', amount: 99, status: 'PAID', invoiceUrl: 'https://example.com/inv-1.pdf' },
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
  selectBillingHistory: (state: any) => state.subscription.billingHistory,
  selectSubscriptionLoading: (state: any) => state.subscription.loading,
}));

jest.mock('../../../components/ui', () => ({
  DataTable: ({ data, columns }: any) => (
    <div>
      {data.map((row: any) => (
        <div key={row.id}>{columns[3].render(row.invoiceUrl, row)}</div>
      ))}
    </div>
  ),
  LoadingSkeleton: () => <div>Loading</div>,
  EmptyState: ({ title }: any) => <div>{title}</div>,
}));

describe('BillingHistory', () => {
  it('renders billing screen and handles actions', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(<BillingHistory />);

    expect(screen.getByText('Billing History')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back to Subscription'));
    expect(mockNavigate).toHaveBeenCalledWith('/subscription');

    fireEvent.click(screen.getAllByText('Download')[0]);
    expect(openSpy).toHaveBeenCalledWith('https://example.com/inv-1.pdf', '_blank');
    openSpy.mockRestore();
  });
});
