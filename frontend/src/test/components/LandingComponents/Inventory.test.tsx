import React from 'react';
import { render, screen } from '../../test-utils';
import Inventory from '../../../components/LandingComponents/Inventory';

// 1. Mock Framer Motion to prevent prop leakage and immediate rendering
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

describe('Inventory Component', () => {
  it('renders the section heading and subheading', () => {
    render(<Inventory />);

    // 1. Target the H2 specifically to avoid multiple matches
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();

    // 2. Check that the heading contains the expected words
    // This handles the <span> split automatically
    expect(heading).toHaveTextContent(/Real-Time/i);
    expect(heading).toHaveTextContent(/Inventory/i);
    expect(heading).toHaveTextContent(/Management/i);

    // 3. Check for the descriptive text separately
    expect(
      screen.getByText(/Track stock levels across all locations in real-time/i),
    ).toBeInTheDocument();
  });
  it('renders all inventory feature cards', () => {
    render(<Inventory />);

    const features = ['Smart Alerts', 'Demand Forecasting', 'Multi-Location Sync'];

    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('displays the live sync status and warehouse statistics', () => {
    render(<Inventory />);

    // Verify the "Live Sync" indicator in the mockup
    expect(screen.getByText(/Live Sync Active/i)).toBeInTheDocument();

    // Verify the hardcoded stats inside the 3D-styled core
    expect(screen.getByText(/1,284,092/i)).toBeInTheDocument();
    expect(screen.getByText(/14 Sites/i)).toBeInTheDocument();
    expect(screen.getByText(/Optimized/i)).toBeInTheDocument();
  });

  it('renders the floating stock alert cards', () => {
    render(<Inventory />);

    // Verify individual product alerts in the visual mockup
    expect(screen.getByText(/SKU: DENIM-32/i)).toBeInTheDocument();
    expect(screen.getByText(/Low Stock: 12 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Cotton T-Shirt/i)).toBeInTheDocument();
    expect(screen.getByText(/842 Units/i)).toBeInTheDocument();
  });

  it('contains the 3D visual perspective container', () => {
    const { container } = render(<Inventory />);

    // 1. Target by the unique Tailwind class combination
    const visualRoot = container.querySelector('.relative.w-full.max-w-sm');

    // 2. Verify it exists
    expect(visualRoot).toBeInTheDocument();

    // 3. Optional: If you must check the style, check the object property
    // JSDOM stores styles in an object, not just a raw string
    const htmlElement = visualRoot as HTMLElement;
    expect(htmlElement.style.perspective).toBe('1500px');
  });

  it('maintains proper heading hierarchy for accessibility', () => {
    render(<Inventory />);

    // Ensure the main section title is an H2
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toHaveTextContent(/Inventory/i);
  });
});
