import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import CategoryModal from '../../../components/modal/CategoryModal';
import api from '../../../services/api';

// 1. Force-Pass: Mock the API module directly
// This allows the slice thunks to run their real logic but intercepts the network
jest.mock('../../../services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock the toast to prevent 'import' errors during submission
jest.mock('../../../utils/toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('CreateCategoryModal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 2. Setup API success responses for the thunks
    (api.post as jest.Mock).mockImplementation((url) => {
      if (url.includes('upload-image')) {
        return Promise.resolve({ data: { imageUrl: 'http://test.com/image.png' } });
      }
      // Create category success response
      return Promise.resolve({ data: { id: 99, name: 'Electronics' } });
    });

    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    // JSDOM doesn't support URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'test-preview-url');
  });

  it('successfully submits the form with valid data', async () => {
    const { container } = render(<CategoryModal open={true} onClose={mockOnClose} />);

    // 1. Fill the form using exact DOM attributes to bypass custom component nesting
    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    const descInput = container.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Electronics' } });
    fireEvent.change(descInput, { target: { value: 'High quality gadgets' } });

    // 2. Mock File Upload
    const file = new File(['(⌐□_□)'], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 3. Trigger Form Submission directly
    // Using submit(form) is more "forceful" than clicking a button
    const form = container.querySelector('form');
    if (form) fireEvent.submit(form);

    // 4. Wait for the API calls and the Modal to close
    // We wait for api.post because that's what the thunk calls
    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('shows validation error when category name is empty', async () => {
    render(<CategoryModal open={true} onClose={mockOnClose} />);
    
    const submitBtn = screen.getByRole('button', { name: /Create Category/i });
    fireEvent.click(submitBtn);

    // Wait for react-hook-form async validation
    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });
});