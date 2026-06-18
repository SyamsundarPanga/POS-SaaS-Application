import React from 'react';
import { render, screen } from '../../test-utils';
import Testimonials from '../../../components/LandingComponents/Testimonials';

describe('Testimonials Component', () => {
  it('renders the section heading and introductory text', () => {
    render(<Testimonials />);

    // Check for main heading (handling the span split)
    expect(screen.getByText(/Trusted by/i)).toBeInTheDocument();
    expect(screen.getByText(/Retailers/i)).toBeInTheDocument();

    // Check for the descriptive paragraph
    expect(screen.getByText(/See what our customers have to say/i)).toBeInTheDocument();
  });

  it('renders all three testimonial cards with correct data', () => {
    render(<Testimonials />);

    const testimonials = [
      { name: 'John Doe', company: 'Fashion Boutique', initials: 'JD' },
      { name: 'Sarah Miller', company: 'Electronics Store', initials: 'SM' },
      { name: 'Mike Johnson', company: 'Grocery Chain', initials: 'MJ' },
    ];

    testimonials.forEach((item) => {
      // Verify Name and Company
      expect(screen.getByText(item.name)).toBeInTheDocument();
      expect(screen.getByText(item.company)).toBeInTheDocument();

      // Verify Initials Avatar
      expect(screen.getByText(item.initials)).toBeInTheDocument();
    });
  });

  it('renders the correct testimonial quotes', () => {
    render(<Testimonials />);

    // Verify a specific quote fragment to ensure text binding is working
    expect(
      screen.getByText(/The multi-tenant architecture allows us to manage all our stores/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/The inventory management is a game-changer/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The real-time sync between our POS terminals is incredible/i),
    ).toBeInTheDocument();
  });

  it('renders star ratings for each testimonial', () => {
    const { container } = render(<Testimonials />);

    // Each testimonial has 5 stars. 3 testimonials * 5 stars = 15 total stars
    // We target the SVG elements used for stars
    const stars = container.querySelectorAll('svg.text-emerald-500');
    expect(stars.length).toBe(15);
  });

  it('applies hover and transition classes for UI feedback', () => {
    const { container } = render(<Testimonials />);

    // Select the first card container
    const card = container.querySelector('.bg-emerald-50');

    // Verify essential styling classes are present
    expect(card).toHaveClass('transition-all');
    expect(card).toHaveClass('duration-300');
    expect(card).toHaveClass('hover:-translate-y-2');
  });
});
