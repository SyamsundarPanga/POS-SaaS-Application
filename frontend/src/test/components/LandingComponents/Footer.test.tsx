import React from 'react';
import { render, screen } from '../../test-utils';
import Footer from '../../../components/LandingComponents/Footer';

describe('Footer Component', () => {
  it('renders the brand name and description', () => {
    render(<Footer />);

    expect(screen.getByText('PayPoint')).toBeInTheDocument();
    expect(screen.getByText(/Enterprise POS solution for modern retailers/i)).toBeInTheDocument();
  });

 it('renders all navigation categories and links', () => {
    render(<Footer />);

    // Verify Headings
    expect(screen.getByRole('heading', { name: /Product/i, level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Company/i, level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Contact/i, level: 4 })).toBeInTheDocument();

    // Verify specific links - updated to match your actual component's hrefs
    expect(screen.getByRole('link', { name: /Features/i })).toHaveAttribute('href', '#inventory');
    expect(screen.getByRole('link', { name: /Pricing/i })).toHaveAttribute('href', '#pricing');
    
    // Change these from '/about' and '/careers' to '#' to match your Footer.tsx
    expect(screen.getByRole('link', { name: /About Us/i })).toHaveAttribute('href', '#');
    expect(screen.getByRole('link', { name: /Careers/i })).toHaveAttribute('href', '#');
  });
  
  it('renders correct contact information', () => {
    render(<Footer />);

    const emailLink = screen.getByRole('link', { name: /support@paypoint.com/i });
    const phoneLink = screen.getByRole('link', { name: /\+1 \(234\) 567-890/i });

    expect(emailLink).toHaveAttribute('href', 'mailto:support@paypoint.com');
    expect(phoneLink).toHaveAttribute('href', 'tel:+1234567890');
  });

  it('displays the dynamic current year in the copyright notice', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();

    // Check if the copyright text contains the current year
    expect(screen.getByText(new RegExp(`© ${currentYear} PayPoint`, 'i'))).toBeInTheDocument();
  });

  it('renders legal links in the footer bottom bar', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: /Terms of Service/i })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: /Cookie Policy/i })).toHaveAttribute(
      'href',
      '/cookies',
    );
  });
});
