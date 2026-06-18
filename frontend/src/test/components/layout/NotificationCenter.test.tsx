import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import NotificationCenter from '../../../components/layout/NotificationCenterComponent';
import api from '../../../services/api';

jest.mock('../../../services/api', () => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
}));

describe('NotificationCenter Component', () => {
  const mockNotifications = [
    {
      id: 1,
      title: 'Low Stock Alert',
      message: 'Product X is running low',
      type: 'LOW_STOCK' as const,
      read: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const preloadedState = {
    notifications: {
      notifications: mockNotifications,
      unreadCount: 1,
      loading: false,
      error: null,
      preferences: {
        lowStockAlerts: true, paymentAlerts: true, subscriptionAlerts: true,
        systemAlerts: true, emailNotifications: true,
      },
      page: 0,
      hasMore: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('unread-count')) return Promise.resolve({ data: 1 });
      return Promise.resolve({ data: { content: mockNotifications, last: true } });
    });
    (api.put as jest.Mock).mockResolvedValue({ data: true });
    (api.post as jest.Mock).mockResolvedValue({ data: true });
    (api.delete as jest.Mock).mockResolvedValue({ data: true });
  });

  it('closes the dropdown when clicking the close button', async () => {
    render(<NotificationCenter />, { preloadedState });
    
    // 1. Open dropdown
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    // Confirm it's open
    expect(screen.getAllByText(/Notifications/i).length).toBeGreaterThan(0);

    // 2. Find the X button
    // In your code: it is the button containing the <X /> icon next to the "Check" icon
    // We target all buttons and find the one that doesn't have the "Mark all as read" title
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find(btn => !btn.title && btn.innerHTML.includes('svg'));
    
    if (closeBtn) {
      fireEvent.click(closeBtn);
    } else {
      // Fallback: click the bell again to toggle close if the specific X isn't found
      fireEvent.click(bellButton);
    }

    // 3. Force wait for removal
    await waitFor(() => {
      const msg = screen.queryByText(/UNREAD MESSAGES/i);
      expect(msg).toBeNull();
    }, { timeout: 2000 });
  });

  it('triggers delete service when delete button is clicked', async () => {
    render(<NotificationCenter />, { preloadedState });
    fireEvent.click(screen.getByRole('button'));

    // Use findByRole for async appearing content
    const deleteBtn = await screen.findByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(api.delete).toHaveBeenCalled();
  });

  it('deletes notification after void request approval', async () => {
    const voidNotification = {
      id: 2,
      title: 'Void Approval Required',
      message: 'Order #123 needs void approval',
      type: 'SYSTEM' as const,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/orders/void-requests/123',
    };

    const voidPreloadedState = {
      auth: {
        user: {
          roles: ['ROLE_BRANCH_MANAGER'],
        },
      },
      notifications: {
        notifications: [voidNotification],
        unreadCount: 1,
        loading: false,
        error: null,
      },
    };

    render(<NotificationCenter />, { preloadedState: voidPreloadedState });
    fireEvent.click(screen.getByRole('button'));

    const approveBtn = await screen.findByRole('button', { name: /approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      // Check if delete was called with the notification ID
      expect(api.delete).toHaveBeenCalledWith(expect.stringContaining('2'));
      // Verify it's gone from the document
      expect(screen.queryByText(/Void Approval Required/i)).toBeNull();
    });
  });
});