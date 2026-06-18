import React from 'react';
import { render, screen } from '../../test-utils';
import Payment from '../../../components/LandingComponents/Payment';

// 1. Mock Framer Motion to strip animation props and avoid DOM warnings
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      whileInView,
      initial,
      viewport,
      transition,
      animate,
      whileHover,
      ...props
    }: any) => <div {...props}>{children}</div>,
    h2: ({ children, whileInView, initial, viewport, transition, ...props }: any) => (
      <h2 {...props}>{children}</h2>
    ),
    p: ({ children, whileInView, initial, viewport, transition, ...props }: any) => (
      <p {...props}>{children}</p>
    ),
  },
}));

describe('Payment Component', () => {
  it('renders the section title and descriptive text', () => {
    render(<Payment />);

    // Check main heading using role for uniqueness
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/Flexible Payment Processing/i);

    // Check main description
    expect(
      screen.getByText(/Accept all payment methods with industry-leading security/i),
    ).toBeInTheDocument();
  });

  it('renders all key payment feature items', () => {
    render(<Payment />);

    const features = ['Multiple Methods', 'PCI DSS Compliant', 'Instant Settlement'];

    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('displays the technical transaction details in the visual core', () => {
    render(<Payment />);

    // 1. Check for 'Authorized' (unique)
    expect(screen.getByText(/Authorized/i)).toBeInTheDocument();

    // 2. Check for currency (unique)
    expect(screen.getByText(/\+\$2,499\.00/i)).toBeInTheDocument();

    // 3. FIX: Handle multiple 'Encryption' strings
    // This verifies that "Encryption" is present in the document at least once
    const encryptionElements = screen.getAllByText(/Encryption/i);
    expect(encryptionElements.length).toBeGreaterThanOrEqual(1);

    // 4. Check for '0.2%' (unique)
    expect(screen.getByText(/0\.2%/i)).toBeInTheDocument();
  });

  it('renders the 3D credit card visual with brand info', () => {
    render(<Payment />);

    // Verify details on the credit card mockup
    expect(screen.getByText(/8824/i)).toBeInTheDocument();
    expect(screen.getByText(/PAYPOINT ENTERPRISE/i)).toBeInTheDocument();
  });

  it('contains the 3D visual container with perspective', () => {
    const { container } = render(<Payment />);

    // Target the specific wrapper used for the 3D card effect
    const visualRoot = container.querySelector('.relative.w-full.max-w-sm');
    expect(visualRoot).toBeInTheDocument();

    // Check that the perspective is correctly set on the HTMLElement style object
    const htmlElement = visualRoot as HTMLElement;
    expect(htmlElement.style.perspective).toBe('1500px');
  });

  it('verifies the gateway tier badge is present', () => {
    render(<Payment />);
    expect(screen.getByText(/Secure Gateway Tier/i)).toBeInTheDocument();
  });
});
