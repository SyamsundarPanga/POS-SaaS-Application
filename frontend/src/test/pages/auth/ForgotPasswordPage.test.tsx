import { render, screen, fireEvent, waitFor } from '../../test-utils'; // Path to your custom render file
import ForgotPasswordPage from '../../../pages/auth/ForgotPasswordPage';
import authService from '../../../services/authService';

// Mock authService
jest.mock('../../../services/authService');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Mock useNavigate from react-router-dom
const mockedUsedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedUsedNavigate,
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders initial request step correctly', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText(/Reset Password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin@enterprise.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
  });

  test('shows validation error for invalid email', async () => {
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByPlaceholderText(/admin@enterprise.com/i);
    const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    expect(await screen.findByText(/Invalid email address/i)).toBeInTheDocument();
  });

  test('successfully requests reset link', async () => {
    mockedAuthService.requestPasswordResetLink.mockResolvedValueOnce({
      message: 'Reset link sent',
    });
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByPlaceholderText(/admin@enterprise.com/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));
    await waitFor(() => {
      expect(mockedAuthService.requestPasswordResetLink).toHaveBeenCalledWith('test@example.com');
    });
    expect(await screen.findByText(/Reset link sent/i)).toBeInTheDocument();
  });
});
