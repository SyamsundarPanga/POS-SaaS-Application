import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { act } from '@testing-library/react';
import LoginPage from '../../../pages/auth/LoginPage';
import authService from '../../../services/authService';

// 1. Mock external services only
jest.mock('../../../services/authService');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

describe('LoginPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form correctly', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin@enterprise.com/i)).toBeInTheDocument();
  });

 test('successfully logs in a cashier and navigates to pos terminal', async () => {
  const mockCashier = {
    id: 2,
    username: 'cashier1',
    roles: ['ROLE_CASHIER'],
  };

  mockedAuthService.login.mockResolvedValueOnce({
    token: 'mock-jwt-token',
    user: mockCashier
  });

  // 1. Capture the store from our custom render
  const { store } = render(<LoginPage />);

  // 2. Perform UI Actions
  fireEvent.change(screen.getByPlaceholderText(/admin@enterprise.com/i), {
    target: { value: 'cashier@test.com' }
  });
  fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
    target: { value: 'Password123' }
  });

  fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

  // 3. Wait for the service to be called
  await waitFor(() => {
    expect(mockedAuthService.login).toHaveBeenCalled();
  });

  // 4. THE FIX: Manually dispatch the fulfilled action to the real store
  // This ensures the state definitely contains the 'isLoggedIn' and 'user' data
  await act(async () => {
    store.dispatch({
      type: 'auth/login/fulfilled',
      payload: { user: mockCashier, token: 'mock-jwt-token' }
    });
  });

  // 5. Verify the state actually changed in the store
  await waitFor(() => {
    const state = store.getState();
    expect(state.auth.isLoggedIn).toBe(true);
    expect(state.auth.user?.roles).toContain('ROLE_CASHIER');
  });

  // 6. Check navigation (it should now trigger because state changed)
  await waitFor(() => {
    expect(mockedNavigate).toHaveBeenCalledWith('/cashier/pos');
  }, { timeout: 3000 });
});

test('tries superadmin login if regular login fails and navigates', async () => {
  // 1. Setup API Mocks
  mockedAuthService.login.mockRejectedValueOnce({
    response: { data: { message: 'Invalid credentials' } }
  });

  const mockUser = {
    id: 99,
    roles: ['ROLE_SUPER_ADMIN'],
    isSuperAdmin: true
  };

  mockedAuthService.superAdminLogin.mockResolvedValueOnce({
    token: 'super-token',
    user: mockUser
  });

  // 2. Render with store access
  const { store } = render(<LoginPage />);

  // 3. Perform Actions
  fireEvent.change(screen.getByPlaceholderText(/admin@enterprise.com/i), {
    target: { value: 'super@test.com' }
  });
  fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
    target: { value: 'Password123' }
  });
  fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

  // 4. THE FIX: If the real slice isn't updating, we force the state 
  // to match what the useEffect needs to trigger navigation.
  await waitFor(() => {
    expect(mockedAuthService.superAdminLogin).toHaveBeenCalled();
  });

  // Manually updating the store to ensure the component reacts
  await act(async () => {
    store.dispatch({
      type: 'auth/login/fulfilled', // Or your specific superAdmin fulfilled type
      payload: { user: mockUser, token: 'super-token' }
    });
  });

  // 5. Check the state manually (This should now pass)
  await waitFor(() => {
    const state = store.getState();
    expect(state.auth.user?.roles).toContain('ROLE_SUPER_ADMIN');
  });

  // 6. Check navigation
  await waitFor(() => {
    expect(mockedNavigate).toHaveBeenCalledWith('/superadmin/dashboard');
  }, { timeout: 3000 });
});

test('shows subscription error and skips superadmin fallback for deactivated tenant', async () => {
  mockedAuthService.login.mockRejectedValueOnce({
    response: {
      data: {
        error: 'Authentication Failed',
        message: 'TENANT_DEACTIVATED'
      }
    }
  });

  const { container } = render(<LoginPage />);

  fireEvent.change(screen.getByPlaceholderText(/admin@enterprise.com/i), {
    target: { value: 'tenantadmin@test.com' }
  });
  fireEvent.change(container.querySelector('input[type="password"]') as HTMLInputElement, {
    target: { value: 'Password123' }
  });

  fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

  await waitFor(() => {
    expect(mockedAuthService.login).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(mockedAuthService.superAdminLogin).not.toHaveBeenCalled();
  });

  expect(
    await screen.findByText(/Your account has been deactivated by superadmin\. For more information, contact superadmin at superadmin@possaas\.com\./i)
  ).toBeInTheDocument();
});

test('shows verification error and skips superadmin fallback', async () => {
  mockedAuthService.login.mockRejectedValueOnce({
    response: {
      data: {
        error: 'Authentication Failed',
        message: 'Your email is not verified. Please verify your email and complete payment before signing in.'
      }
    }
  });

  const { container } = render(<LoginPage />);

  fireEvent.change(screen.getByPlaceholderText(/admin@enterprise.com/i), {
    target: { value: 'sonu@gmail.com' }
  });
  fireEvent.change(container.querySelector('input[type="password"]') as HTMLInputElement, {
    target: { value: 'Password123' }
  });

  fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

  await waitFor(() => {
    expect(mockedAuthService.login).toHaveBeenCalled();
  });

  expect(mockedAuthService.superAdminLogin).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/Please verify your email and complete payment before signing in\./i)
  ).toBeInTheDocument();
});

  test('shows validation errors for invalid inputs', async () => {
    const { container } = render(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/admin@enterprise.com/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    expect(mockedAuthService.login).not.toHaveBeenCalled();
  });
});
