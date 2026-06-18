import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewCategoryDetailsModal from '../../../components/modal/ViewCategoryDetailsModal';

describe('ViewCategoryDetailsModal Component', () => {
  const mockOnClose = jest.fn();
  const mockCategory = {
    name: 'Electronics',
    description: 'All kinds of gadgets and electronic items.',
    imageUrl: 'http://example.com/electronics.png',
    displayOrder: 5,
    status: 'ACTIVE',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render anything if category is null', () => {
    // @ts-ignore: Testing runtime safety
    const { container } = render(<ViewCategoryDetailsModal open={true} onClose={mockOnClose} category={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all category details correctly', () => {
    render(<ViewCategoryDetailsModal open={true} onClose={mockOnClose} category={mockCategory} />);

    expect(screen.getByText('Category Details')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('All kinds of gadgets and electronic items.')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    
    const image = screen.getByAltText('Electronics');
    expect(image).toHaveAttribute('src', 'http://example.com/electronics.png');
  });

  it('renders a fallback "No Image" placeholder when imageUrl is missing', () => {
    const categoryNoImage = { ...mockCategory, imageUrl: '' };
    render(<ViewCategoryDetailsModal open={true} onClose={mockOnClose} category={categoryNoImage} />);

    expect(screen.getByText(/No Image/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('displays default description when none is provided', () => {
    const categoryNoDesc = { ...mockCategory, description: '' };
    render(<ViewCategoryDetailsModal open={true} onClose={mockOnClose} category={categoryNoDesc} />);

    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });

  it('applies the correct badge color based on status', () => {
    const { rerender } = render(<ViewCategoryDetailsModal open={true} onClose={mockOnClose} category={mockCategory} />);
    
    // Check Active status color
    let statusBadge = screen.getByText('ACTIVE');
    expect(statusBadge).toHaveClass('bg-emerald-50', 'text-emerald-600');

    // Check Inactive status color
    const inactiveCategory = { ...mockCategory, status: 'INACTIVE' };
    rerender(<ViewCategoryDetailsModal open={true} onClose={mockOnClose} category={inactiveCategory} />);
    
    statusBadge = screen.getByText('INACTIVE');
    expect(statusBadge).toHaveClass('bg-slate-50', 'text-slate-500');
  });

it('calls onClose when the Close button is clicked', () => {
  render(<ViewCategoryDetailsModal open={true} onClose={mockOnClose} category={mockCategory} />);

  // FORCE-PASS: Target the specific button that contains the text "Close" 
  // and NOT the icon button labeled "close"
  const closeBtn = screen.getByRole('button', { name: /^Close$/ });
  fireEvent.click(closeBtn);

  expect(mockOnClose).toHaveBeenCalledTimes(1);
});
});