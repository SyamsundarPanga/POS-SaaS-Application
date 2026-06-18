import React from 'react';
import { render, screen } from '../../test-utils';
import Features from '../../../components/LandingComponents/Features';

describe('Features Component', () => {
  it('renders the main section heading and description', () => {
    render(<Features />);

    // Check for the main section title (handling the span split)
    expect(screen.getByText(/Powerful/i)).toBeInTheDocument();
    expect(screen.getByText(/Features/i)).toBeInTheDocument();

    // Check for the introductory text
    expect(
      screen.getByText(/Everything you need to run your retail business efficiently/i),
    ).toBeInTheDocument();
  });

  it('renders all six feature cards with correct titles', () => {
    render(<Features />);

    const featureTitles = [
      'Multi-Tenancy',
      'Payment Processing',
      'Inventory Management',
      'Analytics Dashboard',
      'Customer Management',
      'Subscription Billing',
    ];

    featureTitles.forEach((title) => {
      // Find each title heading
      const heading = screen.getByRole('heading', { name: title, level: 3 });
      expect(heading).toBeInTheDocument();
    });
  });

  it('renders the descriptions for the feature cards', () => {
    render(<Features />);

    // Verify a few specific descriptions to ensure data binding is correct
    expect(
      screen.getByText(/Serve unlimited retail businesses from a single codebase/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Real-time inventory tracking across all locations/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Accept all major payment methods/i)).toBeInTheDocument();
  });

  it('applies background images to the feature cards', () => {
    const { container } = render(<Features />);

    // Find all card divs. Since they have a specific style attribute for background-image
    const cards = container.querySelectorAll('.bg-cover');
    expect(cards.length).toBe(6);

    // Verify that the first card has the specific multi-tenancy image URL
    expect(cards[0]).toHaveStyle(
      'background-image: url(https://www.cisco.com/content/dam/cisco-cdc/site/images/legacy/assets/swa/img/anchor-info/what-is-multitenant-sd-wan-628x353.jpg)',
    );
  });

  it('has correct section ID for navigation', () => {
    const { container } = render(<Features />);
    const section = container.querySelector('section');
    expect(section).toHaveAttribute('id', 'features');
  });
});
