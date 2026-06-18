import React from 'react';
import { render, screen } from '../../test-utils';
import Loyalty from '../../../components/LandingComponents/Loyalty';

// Mock Framer Motion to prevent prop leakage and ensure instant rendering
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileInView, initial, viewport, transition, animate, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    h2: ({ children, whileInView, initial, viewport, transition, ...props }: any) => (
      <h2 {...props}>{children}</h2>
    ),
    p: ({ children, whileInView, initial, viewport, transition, ...props }: any) => (
      <p {...props}>{children}</p>
    ),
  },
}));

describe('Loyalty Component', () => {
  it('renders the section heading and the animated span', () => {
    render(<Loyalty />);

    // Check for the main H2 using role to isolate from other "Loyalty" mentions
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/Customer Loyalty Programs/i);

    // Verify the descriptive marketing text
    expect(screen.getByText(/Increase customer retention and lifetime value/i)).toBeInTheDocument();
  });

  it('renders the list of loyalty features with correct titles and descriptions', () => {
    render(<Loyalty />);

    const features = [
      { title: 'Flexible Rewards', desc: /Design custom loyalty programs/i },
      { title: 'Customer Engagement', desc: /Drive repeat purchases/i },
      { title: 'Tier-Based Programs', desc: /Create multi-level VIP tiers/i },
    ];

    features.forEach((feature) => {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
      expect(screen.getByText(feature.desc)).toBeInTheDocument();
    });
  });

  it('displays the reward vault stats and technical indicators', () => {
    render(<Loyalty />);

    // Verify indicators inside the dark visual module
    expect(screen.getByText(/Reward Core Active/i)).toBeInTheDocument();
    expect(screen.getByText(/₹14.2K/i)).toBeInTheDocument();
    expect(screen.getByText(/4.8K Users/i)).toBeInTheDocument();
  });

  it('renders the floating VIP tier card with points', () => {
    render(<Loyalty />);

    // Verify content within the floating gradient card
    expect(screen.getByText(/Platinum Tier/i)).toBeInTheDocument();
    expect(screen.getByText(/24,500 PTS/i)).toBeInTheDocument();
  });

  it('contains the 3D perspective container for the visual assets', () => {
    const { container } = render(<Loyalty />);

    // 1. Target by the unique Tailwind class combination instead of style string
    const visualWrapper = container.querySelector('.relative.w-full.max-w-sm');

    // 2. Verify it exists
    expect(visualWrapper).toBeInTheDocument();

    // 3. Robust style check (Check the object property directly)
    const htmlElement = visualWrapper as HTMLElement;
    expect(htmlElement.style.perspective).toBe('1500px');
  });

  it('maintains a clean HTML structure without leaked motion props', () => {
    render(<Loyalty />);

    // Check that one of our motion-mocked divs doesn't have the 'whileInView' attribute
    const badge = screen.getByText(/Retention Engine/i).parentElement;
    expect(badge).not.toHaveAttribute('whileInView');
    expect(badge).not.toHaveAttribute('initial');
  });
});
