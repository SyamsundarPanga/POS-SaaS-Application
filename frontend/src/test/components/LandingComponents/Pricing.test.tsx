import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import Pricing from '../../../components/LandingComponents/Pricing';

describe('Pricing Component', () => {
  const mockOnGetStarted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section heading and description', () => {
    render(<Pricing onGetStarted={mockOnGetStarted} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Subscription/i);
    expect(heading).toHaveTextContent(/Pricing/i);
    expect(screen.getByText(/Transparent paid plans with clear usage limits/i)).toBeInTheDocument();
  });

  it('renders all three pricing tiers with correct names and prices', () => {
    render(<Pricing onGetStarted={mockOnGetStarted} />);

    expect(screen.getByRole('heading', { name: /Basic/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/₹1,299\/month/)).toBeInTheDocument();
    expect(screen.getByText(/₹2,999\/month/)).toBeInTheDocument();
    expect(screen.getByText(/₹4,999\/month/)).toBeInTheDocument();
  });

  it('displays the "MOST POPULAR" badge on the Pro plan', () => {
    render(<Pricing onGetStarted={mockOnGetStarted} />);
    expect(screen.getByText(/MOST POPULAR/i)).toBeInTheDocument();
  });

  it('renders specific features for different plans', () => {
    render(<Pricing onGetStarted={mockOnGetStarted} />);

    expect(screen.getByText(/Up to 10 branches/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift management features/i)).toBeInTheDocument();
    expect(screen.getByText(/White-label options/i)).toBeInTheDocument();
  });

  it('triggers onGetStarted when pricing buttons are clicked', () => {
    render(<Pricing onGetStarted={mockOnGetStarted} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockOnGetStarted).toHaveBeenCalledTimes(1);

    fireEvent.click(buttons[2]);
    expect(mockOnGetStarted).toHaveBeenCalledTimes(2);
  });

  it('has the correct section ID for navigation anchors', () => {
    const { container } = render(<Pricing onGetStarted={mockOnGetStarted} />);
    const section = container.querySelector('section');
    expect(section).toHaveAttribute('id', 'pricing');
  });
});
