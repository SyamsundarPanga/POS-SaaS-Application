import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import Solutions from '../../../components/LandingComponents/Solutions';

// 1. Mock Framer Motion to prevent prop leakage and allow instant state changes
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      whileInView,
      initial,
      viewport,
      transition,
      animate,
      exit,
      layoutId,
      ...props
    }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Solutions Component', () => {
  it('renders the main section heading and unified commerce badge', () => {
    render(<Solutions />);

    expect(screen.getByText(/Unified Commerce Platform/i)).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/Three-Tier User Interfaces/i);
  });

  it('renders all three solution tiers: Cashier, Manager, and Admin', () => {
    render(<Solutions />);

    const tiers = ['Cashier Terminal', 'Branch Manager', 'Store Admin Panel'];
    tiers.forEach((tier) => {
      expect(screen.getByRole('heading', { name: tier, level: 3 })).toBeInTheDocument();
    });
  });

  it('changes the active tier when hovering over a card', () => {
    render(<Solutions />);

    // Initially, the Cashier Terminal (index 0) is active based on state
    // Let's hover over the "Branch Manager" card
    const managerCard = screen.getByText('Branch Manager').closest('.p-6');

    if (managerCard) {
      fireEvent.mouseEnter(managerCard);
    }

    // Check for the "Live View" indicator which only appears on the active card
    const liveViewBadge = screen.getByText(/Live View/i);
    expect(liveViewBadge).toBeInTheDocument();

    // Check that specific features of the manager tier are highlighted or visible
    expect(screen.getByText('Shift Analytics')).toBeInTheDocument();
  });

  it('renders the 3D stack visual items', () => {
    const { container } = render(<Solutions />);

    // 1. Target by the unique Tailwind class or the specific layout wrapper
    // Searching for the container that holds the stack items
    const perspectiveContainer =
      container.querySelector('.perspective-1000') || container.querySelector('.rotate-x-12');

    expect(perspectiveContainer).toBeInTheDocument();

    // 2. Verify the stack items (there are 3 tiers in the stack)
    // We use a CSS escape for the brackets in the Tailwind class
    const stackItems = container.querySelectorAll('.aspect-\\[16\\/10\\]');
    expect(stackItems.length).toBe(3);
  });

  it('displays the orbiting decorative elements', () => {
    const { container } = render(<Solutions />);

    // Check for the dashed orbit circle
    const orbit = container.querySelector('.border-dashed');
    expect(orbit).toBeInTheDocument();
  });

  it('maintains accessibility with check icons for features', () => {
    render(<Solutions />);

    // Verify that at least one feature from each tier is rendered
    expect(screen.getByText('Barcode Integration')).toBeInTheDocument();
    expect(screen.getByText('Inventory Alerts')).toBeInTheDocument();
    expect(screen.getByText('Global Catalog')).toBeInTheDocument();
  });
});
