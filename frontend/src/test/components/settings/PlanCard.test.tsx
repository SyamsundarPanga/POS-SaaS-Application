import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import PlanCard from '../../../components/settings/PlanCard';

describe('PlanCard', () => {
  it('renders plan details and features', () => {
    render(
      <PlanCard
        type="Pro"
        price={1299}
        isCurrent={false}
        features={['Feature A', 'Feature B']}
        actionLabel="Upgrade Now"
      />
    );

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText(/₹1,299\/month/)).toBeInTheDocument();
    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upgrade Now' })).toBeInTheDocument();
  });

  it('shows current plan state and disables action', () => {
    render(
      <PlanCard
        type="Basic"
        price={199}
        isCurrent={true}
        features={['Feature X']}
        actionLabel="Upgrade"
      />
    );

    expect(screen.getByText('Active Plan')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Current Plan' });
    expect(button).toBeDisabled();
  });

  it('calls onAction when action button is clicked', () => {
    const onAction = jest.fn();
    render(
      <PlanCard
        type="Enterprise"
        price={999}
        isCurrent={false}
        features={['Support']}
        actionLabel="Choose Plan"
        onAction={onAction}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose Plan' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
