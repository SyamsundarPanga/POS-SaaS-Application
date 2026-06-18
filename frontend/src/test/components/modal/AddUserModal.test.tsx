import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import AddUserModal from '../../../components/modal/AddUserModal';
import userService from '../../../services/userService';
import branchService from '../../../services/branchService';

jest.mock('../../../services/userService');
jest.mock('../../../services/branchService');

describe('AddUserModal Component', () => {
  const mockBranches = [{ id: 1, name: 'Main Branch' }];

  beforeEach(() => {
    jest.clearAllMocks();
    (branchService.getBranches as jest.Mock).mockResolvedValue(mockBranches);
  });

  it('displays error message when API call fails', async () => {
    const errorResponse = {
      response: { data: { message: 'Username already exists' } }
    };
    (userService.createUser as jest.Mock).mockRejectedValue(errorResponse);

    render(<AddUserModal onClose={jest.fn()} onSuccess={jest.fn()} />);

    // 1. Wait for branches to load
    await screen.findByText('Main Branch');

    // 2. Fill out the form fields with SPECIFIC selectors
    // Use exact strings or start/end anchors to avoid multiple matches
    fireEvent.change(screen.getByPlaceholderText(/^ankit_v$/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/example@gmail.com/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'password123' } });
    
    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'Ankit' } });
    fireEvent.change(screen.getByPlaceholderText(/Last Name/i), { target: { value: 'Kumar' } });

    // 3. Trigger the submit
    const submitBtn = screen.getByRole('button', { name: /Confirm/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // 4. Wait for the error message
    await waitFor(() => {
      expect(screen.getByText('Username already exists')).toBeInTheDocument();
    });
  });
});
