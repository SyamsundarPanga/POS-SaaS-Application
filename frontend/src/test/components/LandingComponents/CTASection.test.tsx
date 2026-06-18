import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import CTASection from '../../../components/LandingComponents/CTASection';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileInView, initial, viewport, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover, whileTap, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
    a: ({ children, whileHover, whileTap, ...props }: any) => <a {...props}>{children}</a>,
  },
}));

describe('CTASection Component', () => {
  const mockOnGetStarted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main call-to-action heading and description', () => {
    render(<CTASection onGetStarted={mockOnGetStarted} />);

    expect(screen.getByText(/Ready to Transform Your/i)).toBeInTheDocument();
    expect(screen.getByText(/Retail Operations\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a paid plan that matches your business size/i)).toBeInTheDocument();
  });

  it('calls onGetStarted when the "Get Started" button is clicked', () => {
    render(<CTASection onGetStarted={mockOnGetStarted} />);

    const startBtn = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(startBtn);

    expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
  });

  it('contains a valid link to the features section', () => {
    render(<CTASection onGetStarted={mockOnGetStarted} />);

    const featuresLink = screen.getByRole('link', { name: /view features/i });
    expect(featuresLink).toHaveAttribute('href', '#features');
  });

  it('displays the trust badges/benefits correctly', () => {
    render(<CTASection onGetStarted={mockOnGetStarted} />);

    expect(screen.getByText(/Paid plans from ₹1,299\/month/i)).toBeInTheDocument();
    expect(screen.getByText(/Upgrade anytime/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancel anytime/i)).toBeInTheDocument();
  });

  it('is accessible with an h2 heading for screen readers', () => {
    render(<CTASection onGetStarted={mockOnGetStarted} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
  });
});
