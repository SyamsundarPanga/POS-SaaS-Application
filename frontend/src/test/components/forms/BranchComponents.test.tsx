import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { BranchFormField, BranchActionModal } from '../../../components/forms/BranchFormComponents';

describe('Branch Management Components', () => {
  describe('BranchFormField', () => {
    it('renders as a standard input by default', () => {
      render(<BranchFormField label="Branch Name" placeholder="Enter name" />);

      expect(screen.getByText(/Branch Name/i)).toBeInTheDocument();
      const input = screen.getByPlaceholderText('Enter name');
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('autocomplete', 'off');
    });

    it('renders as a select dropdown when children are provided', () => {
      render(
        <BranchFormField label="Status">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </BranchFormField>,
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('autocomplete', 'off');
      expect(screen.getByText('Active')).toBeInTheDocument();
      // Verify the chevron icon is rendered
      const icon = select.parentElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays error message and applies red border', () => {
      render(<BranchFormField label="Email" error="Invalid email address" />);

      const errorMessage = screen.getByText('Invalid email address');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-red-500');

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });

    it('handles value changes correctly', () => {
      const onChange = jest.fn();
      render(<BranchFormField label="Location" onChange={onChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New York' } });

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('BranchActionModal', () => {
    const mockOnClose = jest.fn();

    it('does not render when isOpen is false', () => {
      const { container } = render(
        <BranchActionModal isOpen={false} onClose={mockOnClose} title="Add Branch">
          <p>Modal Content</p>
        </BranchActionModal>,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders title and children when open', () => {
      render(
        <BranchActionModal isOpen={true} onClose={mockOnClose} title="Edit Branch">
          <div data-testid="child-content">Branch Data Form</div>
        </BranchActionModal>,
      );

      expect(screen.getByText(/edit branch/i)).toBeInTheDocument();
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', () => {
      render(
        <BranchActionModal isOpen={true} onClose={mockOnClose} title="Delete Branch">
          <p>Are you sure?</p>
        </BranchActionModal>,
      );

      // Find button containing the SVG close icon
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    it('has correct layout classes for accessibility and styling', () => {
      render(
        <BranchActionModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Content</p>
        </BranchActionModal>,
      );

      const contentElement = screen.getByText('Content');

      // Modal body wrapper (the scrollable div)
      const modalBody = contentElement.closest('div');

      expect(modalBody).toHaveClass('scrollbar-hide');
      expect(modalBody).toHaveClass('overflow-y-auto');
    });
  });
});
