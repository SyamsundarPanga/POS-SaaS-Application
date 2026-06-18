import React from 'react';
import { render, screen } from '../../test-utils';
import Analytics from '../../../components/LandingComponents/Analytics';

// 1. Mock Framer Motion properly to prevent prop leakage
jest.mock('framer-motion', () => ({
  motion: {
    // Destructure animation props so they aren't passed to the DOM element
    div: ({
      children,
      whileInView,
      initial,
      viewport,
      whileHover,
      whileTap,
      animate,
      transition,
      ...props
    }: any) => <div {...props}>{children}</div>,
    h2: ({ children, whileInView, initial, viewport, transition, ...props }: any) => (
      <h2 {...props}>{children}</h2>
    ),
    p: ({ children, whileInView, initial, viewport, transition, ...props }: any) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Analytics Component', () => {
  it('renders the section heading and subheading', () => {
    render(<Analytics />);

    // Use getAllByText for 'Analytics' since it appears multiple times,
    // or better yet, verify the specific Heading variant
    expect(screen.getByText(/Advanced/i)).toBeInTheDocument();

    // We check that at least one instance of "Analytics" exists
    const analyticsElements = screen.getAllByText(/Analytics/i);
    expect(analyticsElements.length).toBeGreaterThan(0);

    expect(screen.getByText(/& BI/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Gain deep insights into your business performance/i),
    ).toBeInTheDocument();
  });

  it('renders all key feature cards', () => {
    render(<Analytics />);

    expect(screen.getByText('Real-Time Dashboards')).toBeInTheDocument();
    expect(screen.getByText('Sales Analytics')).toBeInTheDocument();
    expect(screen.getByText('Customer Insights')).toBeInTheDocument();
  });

  it('renders the predictive engine technical stats', () => {
    render(<Analytics />);

    expect(screen.getByText(/Predictive Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/₹84,500/i)).toBeInTheDocument();
    expect(screen.getByText(/\+23%/i)).toBeInTheDocument();
  });

  it('contains the 3D cube visual container', () => {
    const { container } = render(<Analytics />);

    // Target by class name or more generic style check to be safer in JSDOM
    const cubeContainer = container.querySelector('.relative.w-full.max-w-sm');
    expect(cubeContainer).toBeInTheDocument();
  });

  it('is accessible with proper heading hierarchy', () => {
    render(<Analytics />);

    // Check for the H2 specifically to ensure SEO/A11y compliance
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/Advanced/i);
  });
});
