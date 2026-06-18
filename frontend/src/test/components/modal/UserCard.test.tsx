import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserCard from '../../../components/modal/UserCard';

describe('UserCard Component', () => {
  const mockUser = {
    username: 'ankit_v',
    email: 'ankit@example.com',
    firstName: 'ankit',
    lastName: 'kumar',
    role: 'ROLE_STORE_ADMIN',
    status: 'ACTIVE',
  };

  it('renders correctly and capitalizes user names', () => {
    render(<UserCard user={mockUser} />);

    // Check capitalized names
    expect(screen.getByText('Ankit Kumar')).toBeInTheDocument();
    
    // Check avatar initials
    expect(screen.getByText('AK')).toBeInTheDocument();
  });

  it('formats the role string correctly by removing ROLE_ prefix', () => {
    render(<UserCard user={mockUser} />);

    // ROLE_STORE_ADMIN should display as "store_admin" (capitalized via CSS class)
    expect(screen.getByText('store_admin')).toBeInTheDocument();
  });

  it('applies correct status colors for ACTIVE status', () => {
    const { container } = render(<UserCard user={mockUser} />);
    
    const statusBadge = screen.getByText('ACTIVE');
    expect(statusBadge).toHaveClass('text-emerald-600');
    expect(statusBadge).toHaveClass('bg-emerald-50');
  });

  it('applies fallback status colors for INACTIVE users', () => {
    const inactiveUser = { ...mockUser, status: 'INACTIVE' };
    render(<UserCard user={inactiveUser} />);
    
    const statusBadge = screen.getByText('INACTIVE');
    expect(statusBadge).toHaveClass('text-slate-600');
    expect(statusBadge).toHaveClass('bg-slate-50');
  });

  it('handles missing or null user data gracefully (Defensive Check)', () => {
    // @ts-ignore: Testing runtime safety for null props
    render(<UserCard user={null} />);

    // Should show N/A for email
    expect(screen.getByText('N/A')).toBeInTheDocument();
    
    // Should show unknown for role
    expect(screen.getByText('unknown')).toBeInTheDocument();
    
    // Status should fallback to UNKNOWN
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('handles empty strings for first and last names', () => {
    const emptyNamesUser = { ...mockUser, firstName: '', lastName: '' };
    render(<UserCard user={emptyNamesUser} />);

    // Name display should be an empty string (plus space)
    const nameHeader = screen.queryByRole('heading', { level: 2 });
    expect(nameHeader?.textContent?.trim()).toBe('');
  });
});