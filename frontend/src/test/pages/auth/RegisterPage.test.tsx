import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import RegisterPage from '../../../pages/auth/RegisterPage';
import authService from '../../../services/authService';

jest.mock('../../../services/authService');

const mockedAuthService = authService as jest.Mocked<typeof authService>;

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

describe('RegisterPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fillForm = () => {
    fireEvent.change(screen.getByPlaceholderText(/Global Retail Inc./i), { target: { value: 'Test Store' } });
    fireEvent.change(screen.getByPlaceholderText(/johndoe/i), { target: { value: 'testadmin' } });
    fireEvent.change(screen.getByPlaceholderText(/admin@enterprise.com/i), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/\*{8}/i), { target: { value: 'Password123!' } });
  };

  test('successfully registers with Basic plan and redirects', async () => {
    mockedAuthService.register.mockResolvedValueOnce({
      sessionToken: 'pending-session-token',
      adminEmail: 'admin@test.com',
      storeName: 'Test Store',
      plan: 'BASIC',
      billingCycle: 'MONTHLY',
      emailVerified: false,
      completed: false,
    } as any);

    render(<RegisterPage />);
    fillForm();

    const submitButton = screen.getByRole('button', { name: /Create Account & Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/pending-verification');
    });
  });
});
