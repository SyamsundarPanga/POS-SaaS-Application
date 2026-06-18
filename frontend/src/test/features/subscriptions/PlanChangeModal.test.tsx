import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlanChangeModal from '../../../features/subscriptions/PlanChangeModal';

const mockDispatch = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
const mockNavigate = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({
      ui: {
        modals: {
          planChange: {
            isOpen: true,
            data: {
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
              plan: {
                id: 'PRO',
                name: 'PRO',
                price: 2999,
                billingCycle: 'MONTHLY',
                features: {
                  maxBranches: 100,
                  maxUsers: 500,
                  maxProducts: 9000,
                  includedFeatures: ['Advanced reporting', 'Shift management features'],
                },
              },
            },
          },
        },
      },
    }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../store/slices/uiSlice', () => ({
  closeModal: jest.fn((id: string) => ({ type: 'ui/closeModal', payload: id })),
  selectModalState: (id: string) => (state: any) => state.ui.modals[id] || { isOpen: false, data: undefined },
}));

jest.mock('../../../store/slices/subscriptionSlice', () => ({
  upgradePlan: jest.fn(() => ({ type: 'subscription/upgrade' })),
}));

jest.mock('../../../components/ui/EnhancedModal', () => {
  return ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null);
});

jest.mock('../../../utils/toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('PlanChangeModal', () => {
  it('enables confirm after accepting terms and triggers dispatch', () => {
    render(<PlanChangeModal />);

    const confirmBtn = screen.getByRole('button', { name: /confirm upgrade/i });
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText('Shift management features')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(confirmBtn).not.toBeDisabled();

    const before = mockDispatch.mock.calls.length;
    fireEvent.click(confirmBtn);
    expect(mockDispatch.mock.calls.length).toBeGreaterThan(before);
  });
});
