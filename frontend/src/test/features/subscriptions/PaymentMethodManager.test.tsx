import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentMethodManager from '../../../features/subscriptions/PaymentMethodManager';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => ({}),
    handleSubmit: (cb: any) => (e: any) => {
      e?.preventDefault?.();
      cb({});
    },
    formState: { errors: {} },
    reset: jest.fn(),
  }),
}));

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({
      subscription: {
        paymentMethods: [{ id: 11, type: 'Visa', last4: '4242', expiryDate: '12/30', isDefault: false }],
        loading: false,
      },
      ui: { modals: {} },
    }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../store/slices/subscriptionSlice', () => ({
  fetchSubscriptionData: jest.fn(() => ({ type: 'subscription/fetchData' })),
  addPaymentMethod: jest.fn(),
  removePaymentMethod: jest.fn(),
  selectPaymentMethods: (state: any) => state.subscription.paymentMethods,
  selectSubscriptionLoading: (state: any) => state.subscription.loading,
}));

jest.mock('../../../store/slices/uiSlice', () => ({
  openModal: jest.fn((payload: any) => ({ type: 'ui/openModal', payload })),
  closeModal: jest.fn((id: string) => ({ type: 'ui/closeModal', payload: id })),
  selectModalState: (id: string) => (state: any) => state.ui.modals[id] || { isOpen: false, data: undefined },
}));

jest.mock('../../../components/ui', () => ({
  EnhancedModal: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
  LoadingSkeleton: () => <div>Loading</div>,
  EmptyState: ({ title }: any) => <div>{title}</div>,
}));

jest.mock('../../../utils/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('PaymentMethodManager', () => {
  it('opens add payment method modal action', () => {
    render(<PaymentMethodManager />);
    const callsBefore = mockDispatch.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /add payment method/i }));
    expect(mockDispatch.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
