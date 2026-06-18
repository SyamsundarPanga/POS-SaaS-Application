import { render, screen, fireEvent, waitFor } from '../../test-utils'; // Path to your custom render file
import ResetPasswordPage from '../../../pages/auth/ResetPasswordPage';
import authService from '../../../services/authService';

// 1. Mock authService (The actual API calls)
jest.mock('../../../services/authService');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// 2. Mock Navigation and SearchParams
const mockedUsedNavigate = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedUsedNavigate,
  useSearchParams: () => [mockSearchParams],
}));

describe('ResetPasswordPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default search params for valid link tests
    mockSearchParams.set('email', 'test@enterprise.com');
    mockSearchParams.set('token', 'valid-reset-token');
  });

  test('renders invalid link view when email or token is missing', () => {
    mockSearchParams.delete('email');
    mockSearchParams.delete('token');

    render(<ResetPasswordPage />);

    expect(screen.getByText(/Invalid Link/i)).toBeInTheDocument();
    expect(screen.getByText(/The security token provided in your URL is missing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request New OTP/i })).toBeInTheDocument();
  });

  test('renders reset password form correctly with valid params', () => {
    render(<ResetPasswordPage />);

    expect(screen.getByText(/Set New Password/i)).toBeInTheDocument();
    // 42 | Use anchors to ensure the first input is matched exclusively
expect(screen.getByPlaceholderText(/^Enter new password$/i)).toBeInTheDocument();

// 43 | Use anchors here as well for best practice
expect(screen.getByPlaceholderText(/^Re-enter new password$/i)).toBeInTheDocument();
  });

  test('shows validation error for weak password', async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getByPlaceholderText(/^Enter new password$/i);
    const submitButton = screen.getByRole('button', { name: /Update Password/i });

    // Entering a password that doesn't meet regex (no special char/uppercase)
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Password must be 8-64 chars/i)).toBeInTheDocument();
  });

  test('shows validation error when passwords do not match', async () => {
    render(<ResetPasswordPage />);
    
    // 62 | Use anchors to ensure the first input is matched exclusively
fireEvent.change(screen.getByPlaceholderText(/^Enter new password$/i), { 
  target: { value: 'StrongPass123!' } 
});

// 63 | Use anchors here as well for best practice
fireEvent.change(screen.getByPlaceholderText(/^Re-enter new password$/i), { 
  target: { value: 'DifferentPass123!' } 
});
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  test('successfully resets password and navigates to login', async () => {
    mockedAuthService.resetPassword.mockResolvedValueOnce({
      message: 'Success! Redirecting to login...'
    });

    render(<ResetPasswordPage />);

    // 77 | Use anchors (^ and $) to ensure the regex matches the full string only
fireEvent.change(screen.getByPlaceholderText(/^Enter new password$/i), { 
  target: { value: 'StrongPass123!' } 
});

// 78 | Apply the same logic here for consistency
fireEvent.change(screen.getByPlaceholderText(/^Re-enter new password$/i), { 
  target: { value: 'StrongPass123!' } 
});
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    // Verify service call with params from URL and form
    await waitFor(() => {
      expect(mockedAuthService.resetPassword).toHaveBeenCalledWith(
        'test@enterprise.com',
        'valid-reset-token',
        'StrongPass123!',
        'StrongPass123!'
      );
    });

    expect(await screen.findByText(/Success! Redirecting to login.../i)).toBeInTheDocument();

    // Verify navigation after timeout
    await waitFor(() => {
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 2000 });
  });

  test('handles server-side errors gracefully', async () => {
    const errorMsg = 'Token has expired';
    mockedAuthService.resetPassword.mockRejectedValueOnce({
      response: { data: { message: errorMsg } }
    });

    render(<ResetPasswordPage />);

    // 108 | Use anchors (^ and $) to ensure the regex matches the full string only
fireEvent.change(screen.getByPlaceholderText(/^Enter new password$/i), { 
  target: { value: 'StrongPass123!' } 
});

// 109 | Apply the same logic here for consistency
fireEvent.change(screen.getByPlaceholderText(/^Re-enter new password$/i), { 
  target: { value: 'StrongPass123!' } 
});
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    expect(await screen.findByText(errorMsg)).toBeInTheDocument();
  });
test('toggles password visibility when eye icon is clicked', () => {
  render(<ResetPasswordPage />);
  
  // Use a more specific regex or the exact string
  const passwordInput = screen.getByPlaceholderText(/^Enter new password$/i); 
  
  // Alternatively, if you want the second one:
  // const confirmInput = screen.getByPlaceholderText(/Re-enter new password/i);

  const toggleButton = screen.getByRole('button', { name: '' });

  expect(passwordInput).toHaveAttribute('type', 'password');
  
  fireEvent.click(toggleButton);
  expect(passwordInput).toHaveAttribute('type', 'text');
});
});