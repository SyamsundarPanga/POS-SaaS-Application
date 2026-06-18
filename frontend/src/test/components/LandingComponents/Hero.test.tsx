import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import Hero from '../../../components/LandingComponents/Hero';

describe('Hero Component', () => {
  const mockOnGetStarted = jest.fn();

  it('renders the main headlines and branding', () => {
    render(<Hero onGetStarted={mockOnGetStarted} />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/Pay\s*Point/i);
  });

  it('renders the value proposition description', () => {
    render(<Hero onGetStarted={mockOnGetStarted} />);
    expect(screen.getByText(/Enterprise POS with multi-tenancy, payments/i)).toBeInTheDocument();
  });

  it('calls onGetStarted when the "Get Started" button is clicked', () => {
    render(<Hero onGetStarted={mockOnGetStarted} />);
    fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));
    expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
  });

  it('applies the correct layout classes', () => {
    const { container } = render(<Hero onGetStarted={mockOnGetStarted} />);
    expect(container.querySelector('main')).toBeInTheDocument();
  });
});
