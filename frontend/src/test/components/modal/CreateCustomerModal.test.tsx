import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateCustomerModal from '../../../components/modal/CreateCustomerModal';
import customerService from '../../../services/customerService';
import toast from '../../../utils/toast';

// Mocking dependencies
jest.mock('../../../services/customerService');
jest.mock('../../../utils/toast');

describe('CreateCustomerModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fillForm = (data: { firstName: string; lastName: string; phone: string; email?: string }) => {
    fireEvent.change(screen.getByPlaceholderText(/John/i), { target: { name: 'firstName', value: data.firstName } });
    fireEvent.change(screen.getByPlaceholderText(/Doe/i), { target: { name: 'lastName', value: data.lastName } });
    fireEvent.change(screen.getByPlaceholderText(/\+91\.\.\./i), { target: { name: 'phone', value: data.phone } });
    if (data.email) {
      fireEvent.change(screen.getByPlaceholderText(/email@example\.com/i), { target: { name: 'email', value: data.email } });
    }
  };

  it('renders the modal when isOpen is true', () => {
    render(<CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('Create New Customer')).toBeInTheDocument();
  });

  it('shows validation errors for required fields on empty submit', async () => {
    render(<CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    const submitBtn = screen.getByRole('button', { name: /Create Customer/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
  });

  it('shows error for invalid email and phone formats', async () => {
    render(<CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fillForm({ firstName: 'Alice', lastName: 'Smith', phone: '123', email: 'invalid-email' });
    
    const submitBtn = screen.getByRole('button', { name: /Create Customer/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Invalid phone number format')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('successfully creates a customer and calls onSuccess', async () => {
    const mockApiResponse = {
      data: {
        id: 1,
        firstName: 'Ankit',
        lastName: 'Kumar',
        email: 'ankit@example.com',
        phone: '9876543210',
        loyaltyPoints: 100,
        loyaltyTier: 'SILVER',
      }
    };

    (customerService.create as jest.Mock).mockResolvedValue(mockApiResponse);

    render(<CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fillForm({ 
      firstName: 'Ankit', 
      lastName: 'Kumar', 
      phone: '9876543210', 
      email: 'ankit@example.com' 
    });

    const submitBtn = screen.getByRole('button', { name: /Create Customer/i });
    fireEvent.click(submitBtn);

    // Verify loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();

    await waitFor(() => {
      expect(customerService.create).toHaveBeenCalledWith({
        firstName: 'Ankit',
        lastName: 'Kumar',
        phone: '9876543210',
        email: 'ankit@example.com',
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        name: 'Ankit Kumar',
        loyaltyTier: 'SILVER'
      }));
    });

    // Form should reset
    expect(screen.getByPlaceholderText(/John/i)).toHaveValue('');
  });

  it('handles server errors gracefully using toast', async () => {
    const errorMessage = 'Email already exists';
    (customerService.create as jest.Mock).mockRejectedValue({
      response: { data: { message: errorMessage } }
    });

    render(<CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    fillForm({ firstName: 'Ankit', lastName: 'Kumar', phone: '9876543210' });

    const submitBtn = screen.getByRole('button', { name: /Create Customer/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
      expect(screen.getByText('Create Customer')).toBeInTheDocument(); // Loading finished
    });
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<CreateCustomerModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });
});