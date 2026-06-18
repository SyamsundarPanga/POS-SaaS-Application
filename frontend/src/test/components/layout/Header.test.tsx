import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import Header from '../../../components/layout/Header';

// ✅ Mock ONLY services (NOT the slice)
import authService from '../../../services/authService';
import userService from '../../../services/userService';

jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    logout: jest.fn(),
  },
}));

jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: {
    getProfile: jest.fn(() =>
      Promise.resolve({
        data: {
          username: 'JohnDoe',
          storeName: 'Central Branch',
        },
      }),
    ),
  },
}));

describe('Header Component', () => {
  const mockUser = {
    username: 'JohnDoe',
    storeName: 'Central Branch',
    email: 'john@example.com',
    role: 'ADMIN',
  };

  const preloadedState = {
    auth: { user: mockUser, isLoggedIn: true, loading: false, error: null },
    notifications: {
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      preferences: {
        lowStockAlerts: true,
        paymentAlerts: true,
        subscriptionAlerts: true,
        systemAlerts: true,
        emailNotifications: true,
      },
      page: 0,
      hasMore: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user and store information', () => {
    render(<Header />, { preloadedState });

    expect(screen.getByText('Central Branch')).toBeInTheDocument();
    expect(screen.getByText('JohnDoe')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument(); // Avatar initial
  });

  it('reveals the user account menu on hover', async () => {
    render(<Header />, { preloadedState });

    // 1. Find the trigger wrapper (the div with onMouseEnter)
    // We search for the username then find its parent container
    const profileTrigger = screen.getByText('JohnDoe').closest('.relative');

    if (!profileTrigger) throw new Error('Trigger not found');

    // 2. Simulate Hover
    fireEvent.mouseEnter(profileTrigger);

    // 3. Verify the correct text appears (User Account, not Your Profile)
    // findByText is used to handle Framer Motion transition time
    const accountHeader = await screen.findByText(/User Account/i);
    expect(accountHeader).toBeInTheDocument();

    // Verify email is visible in the menu
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('dispatches logout and calls service when logout is clicked', async () => {
    render(<Header />, { preloadedState });

    // 1. Find the element that triggers the hover (the username or its container)
    const profileTrigger = screen.getByText('JohnDoe').closest('.relative');

    // 2. Simulate HOVER instead of CLICK
    fireEvent.mouseEnter(profileTrigger!);

    // 3. Now the Logout button should be in the DOM
    const logoutBtn = await screen.findByText(/Logout Session/i);
    fireEvent.click(logoutBtn);

    // 4. Verify logout was called
    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
    });
  });
});
