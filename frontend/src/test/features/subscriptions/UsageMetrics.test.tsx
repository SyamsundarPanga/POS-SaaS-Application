import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UsageMetrics from '../../../features/subscriptions/UsageMetrics';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('UsageMetrics', () => {
  const metrics = {
    branches: { used: 5, limit: 5 },
    users: { used: 20, limit: 25 },
    products: { used: 100, limit: 200 },
    lastUpdated: new Date('2026-03-01T10:00:00Z').toISOString(),
  };

  it('shows warnings and triggers upgrade action', () => {
    render(<UsageMetrics metrics={metrics as any} />);
    expect(screen.getByText('Usage Metrics')).toBeInTheDocument();
    expect(screen.getByText(/limit reached/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /upgrade plan/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/subscription/upgrade');
  });
});

