import React from 'react';
import { render, screen } from '../../test-utils';
import StatCard from '../../../components/common/StatCard';

describe('StatCard Component', () => {
  it('renders title and value correctly', () => {
    render(<StatCard title="Total Sales" value="$12,500" color="blue" />);

    expect(screen.getByText(/Total Sales/i)).toBeInTheDocument();
    expect(screen.getByText('$12,500')).toBeInTheDocument();
  });

  it('renders the default icon when no icon is provided', () => {
    render(<StatCard title="Test" value="0" color="blue" />);

    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('renders a custom icon when provided', () => {
    render(<StatCard title="Test" value="0" color="blue" icon="🚀" />);

    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.queryByText('📊')).not.toBeInTheDocument();
  });

  it('applies green styling for positive trends (+)', () => {
    render(<StatCard title="Growth" value="10%" trend="+5.2%" color="green" />);

    const trendBadge = screen.getByText('+5.2%');
    expect(trendBadge).toHaveClass('bg-green-100');
    expect(trendBadge).toHaveClass('text-green-700');
  });

  it('applies red styling for negative trends (-)', () => {
    render(<StatCard title="Loss" value="5%" trend="-2.1%" color="red" />);

    const trendBadge = screen.getByText('-2.1%');
    expect(trendBadge).toHaveClass('bg-red-100');
    expect(trendBadge).toHaveClass('text-red-700');
  });

  it('applies correct color classes based on the color prop', () => {
    const { container, rerender } = render(<StatCard title="Metric" value="100" color="blue" />);

    // Check for blue bg class in the icon container
    const iconWrapper = container.querySelector('.rounded-2xl');
    expect(iconWrapper).toHaveClass('bg-blue-50');

    // Change to orange and verify
    rerender(<StatCard title="Metric" value="100" color="orange" />);
    expect(iconWrapper).toHaveClass('bg-orange-50');
  });

  it('does not render the trend badge if no trend is provided', () => {
    render(<StatCard title="Static" value="500" color="blue" />);

    // Check that no span with trend-like text exists
    const badge = screen.queryByText(/[+-]\d+/);
    expect(badge).not.toBeInTheDocument();
  });
});
