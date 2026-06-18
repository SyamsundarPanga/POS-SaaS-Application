import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../../../pages/admin/SettingsPage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../components/layout/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('../../../components/layout/Header', () => () => <div>Header</div>);
jest.mock('../../../components/settings/PlanCard', () => () => <div>PlanCard</div>);
jest.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => (props: any) =>
        React.createElement(tag, props, props.children),
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('../../../store/slices/notificationSlice', () => ({
  selectNotificationPreferences: (state: any) => state.notifications.preferences,
  updatePreferences: jest.fn((payload: any) => ({ type: 'notifications/update', payload })),
}));

jest.mock('../../../store/slices/subscriptionSlice', () => ({
  fetchSubscriptionData: jest.fn(() => ({ type: 'subscription/fetch' })),
  selectAvailablePlans: (state: any) => state.subscription.availablePlans,
  selectCurrentPlan: (state: any) => state.subscription.currentPlan,
  selectSubscriptionLoading: (state: any) => state.subscription.loading,
  upgradePlan: jest.fn((p: any) => ({ type: 'subscription/upgrade', payload: p })),
}));

jest.mock('../../../services/subscriptionService', () => ({
  __esModule: true,
  default: {
    getUsageStatistics: jest.fn().mockResolvedValue(null),
    getPaymentHistory: jest.fn().mockResolvedValue([]),
    getSubscriptionStatus: jest.fn().mockResolvedValue({
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      retryCount: 0,
    }),
    cancelSubscription: jest.fn().mockResolvedValue('Subscription cancellation scheduled for end of current billing cycle'),
    reactivateSubscription: jest.fn().mockResolvedValue('Subscription reactivated successfully'),
    createSubscriptionOrder: jest.fn().mockResolvedValue({
      id: 'order_123',
      amount: 1299,
      currency: 'INR',
      keyId: 'rzp_test_123',
    }),
    downloadInvoice: jest.fn(),
    verifySubscriptionPayment: jest.fn(),
  },
}));
jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: { getProfile: jest.fn().mockResolvedValue({ data: { email: 'admin@test.com' } }) },
}));
jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(jest.fn(() => ({ unwrap: async () => ({}) })));
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        auth: { user: { email: 'admin@test.com', storeName: 'PayPoint' } },
        notifications: {
          preferences: {
            lowStockAlerts: true,
            paymentAlerts: true,
            subscriptionAlerts: true,
            emailNotifications: true,
          },
        },
        subscription: {
          currentPlan: { name: 'BASIC', price: 1299, billingCycle: 'MONTHLY' },
          availablePlans: [],
          loading: false,
        },
      }),
    );
  });

  it('renders settings page', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
