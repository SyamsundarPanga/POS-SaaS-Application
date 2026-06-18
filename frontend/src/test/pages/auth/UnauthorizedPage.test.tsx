import { render, screen, fireEvent } from '../../test-utils';
import UnauthorizedPage from '../../../pages/auth/UnauthorizedPage';

// Mock useNavigate from react-router-dom
const mockedUsedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedUsedNavigate,
}));

describe('UnauthorizedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders unauthorized message and security details', () => {
    render(<UnauthorizedPage />);

    // Check for main heading
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    
    // Check for description text
    expect(screen.getByText(/You don't have permission to view this specific segment/i)).toBeInTheDocument();
    
    // Check for compliance badges (Desktop view)
    expect(screen.getByText(/PCI-DSS LEVEL 1 COMPLIANT/i)).toBeInTheDocument();
    expect(screen.getByText(/ENCRYPTED KERNEL ACCESS/i)).toBeInTheDocument();
  });

  test('navigates to login page when "Sign In" button is clicked', () => {
    render(<UnauthorizedPage />);

    const signInButton = screen.getByRole('button', { name: /Sign In to Account/i });
    fireEvent.click(signInButton);

    expect(mockedUsedNavigate).toHaveBeenCalledWith('/login');
  });

  test('navigates to register page when "Create Enterprise ID" button is clicked', () => {
    render(<UnauthorizedPage />);

    const registerButton = screen.getByRole('button', { name: /Create Enterprise ID/i });
    fireEvent.click(registerButton);

    expect(mockedUsedNavigate).toHaveBeenCalledWith('/register');
  });

  test('contains a working mailto link for support', () => {
    render(<UnauthorizedPage />);
    
    const supportLink = screen.getByRole('link', { name: /Contact Systems Administrator/i });
    expect(supportLink).toHaveAttribute('href', 'mailto:support@paypoint.io');
  });

 test('renders the decorative "Secure Segment" card on medium screens and up', () => {
  render(<UnauthorizedPage />);
  
  // 1. DEBUG: Uncomment this to see exactly what Jest sees in the terminal
  // screen.debug();

  // 2. Use a case-insensitive regex search
  const secureSegmentCard = screen.getByText(/Secure Segment/i);
  
  // 3. Robust way to find the responsive wrapper
  // We search for the container that specifically has the responsive classes
  const responsiveWrapper = secureSegmentCard.closest('.md\\:flex');
  
  expect(responsiveWrapper).toBeInTheDocument();
  expect(responsiveWrapper).toHaveClass('hidden');
});
});