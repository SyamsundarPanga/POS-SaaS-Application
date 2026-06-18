import React from 'react';
import { render, screen } from '../../test-utils';
import MultiTenant from '../../../components/LandingComponents/MultiTenant';

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

describe('MultiTenant Component', () => {
  it('renders the section heading and subheading', () => {
    render(<MultiTenant />);

    // Check for the main H2 using role to isolate from other mentions
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/Multi-Tenant Architecture/i);

    // Verify the descriptive marketing text
    expect(
      screen.getByText(/Built from the ground up for enterprise retailers/i),
    ).toBeInTheDocument();
  });

  it('renders the core infrastructure features', () => {
    render(<MultiTenant />);

    const features = [
      { title: 'Data Isolation', desc: /Each tenant's data is completely isolated/i },
      { title: 'Security First', desc: /Bank-grade encryption/i },
      {
        title: 'Instant Scaling',
        desc: /automatically handles thousands of concurrent transactions/i,
      },
    ];

    features.forEach((feature) => {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
      expect(screen.getByText(feature.desc)).toBeInTheDocument();
    });
  });

  it('displays the technical specs in the Hyper-Scale Core visual', () => {
    render(<MultiTenant />);

    // Verify indicators inside the dark visual module
    expect(screen.getByText(/Hyper-Scale Core/i)).toBeInTheDocument();
    expect(screen.getByText(/AES-256/i)).toBeInTheDocument();
    expect(screen.getByText(/9ms/i)).toBeInTheDocument();
  });

  it('renders the floating tenant layer labels', () => {
    render(<MultiTenant />);

    // Verify tenant identification labels in the 3D stack
    expect(screen.getByText(/TENANT_ALPHA/i)).toBeInTheDocument();
    expect(screen.getByText(/TENANT_BETA/i)).toBeInTheDocument();
  });

  it('contains the 3D visual container with perspective', () => {
    const { container } = render(<MultiTenant />);

    // Target by the unique Tailwind class combination used for the visual root
    const visualRoot = container.querySelector('.relative.w-full.max-w-lg');
    expect(visualRoot).toBeInTheDocument();

    // Verify the perspective style is correctly applied to the wrapper
    const htmlElement = visualRoot as HTMLElement;
    expect(htmlElement.style.perspective).toBe('2000px');
  });
  it('has the correct section ID for scroll navigation', () => {
    const { container } = render(<MultiTenant />);

    // 1. Directly find the element by ID in the rendered container
    const section = container.querySelector('#MultiTenant');

    // 2. Verify it exists and is a section tag
    expect(section).toBeInTheDocument();
    expect(section?.tagName).toBe('SECTION');
  });
});
