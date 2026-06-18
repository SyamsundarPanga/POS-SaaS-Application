import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import Navigation from '../../../components/LandingComponents/Navigation';

describe('Navigation Component', () => {
  const mockScrollToSection = jest.fn();
  const mockOnGetStarted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the logo and brand identity', () => {
    render(
      <Navigation
        isScrolled={false}
        scrollToSection={mockScrollToSection}
        onGetStarted={mockOnGetStarted}
      />,
    );

    const logo = screen.getByAltText(/Paypoint Logo/i);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/Paypoint 2.png');
  });

  it('triggers scrollToSection with correct ID when links are clicked', () => {
    render(
      <Navigation
        isScrolled={false}
        scrollToSection={mockScrollToSection}
        onGetStarted={mockOnGetStarted}
      />,
    );

    // Test Solutions link
    const solutionsLink = screen.getByText(/Solutions/i);
    fireEvent.click(solutionsLink);
    expect(mockScrollToSection).toHaveBeenCalledWith('solutions');

    // Test Features (MultiTenant) link
    const featuresLink = screen.getByText(/Features/i);
    fireEvent.click(featuresLink);
    expect(mockScrollToSection).toHaveBeenCalledWith('MultiTenant');

    // Test Pricing link
    const pricingLink = screen.getByText(/Pricing/i);
    fireEvent.click(pricingLink);
    expect(mockScrollToSection).toHaveBeenCalledWith('pricing');
  });

  it('calls onGetStarted when the "Get Started" button is clicked', () => {
    render(
      <Navigation
        isScrolled={false}
        scrollToSection={mockScrollToSection}
        onGetStarted={mockOnGetStarted}
      />,
    );

    const getStartedBtn = screen.getByRole('button', { name: /Get Started/i });
    fireEvent.click(getStartedBtn);

    expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
  });

 it('applies border-b class when isScrolled is true', () => {
    const { container } = render(
      <Navigation
        isScrolled={true} 
        scrollToSection={mockScrollToSection}
        onGetStarted={mockOnGetStarted}
      />
    );

    const navElement = container.querySelector('nav');
    expect(navElement).toHaveClass('border-b');
  });

  it('does not have shadow-lg class when isScrolled is false', () => {
    const { container } = render(
      <Navigation
        isScrolled={false}
        scrollToSection={mockScrollToSection}
        onGetStarted={mockOnGetStarted}
      />,
    );

    const navElement = container.querySelector('nav');
    expect(navElement).not.toHaveClass('shadow-lg');
  });
});
