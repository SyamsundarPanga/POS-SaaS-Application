import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import ScrollToTop from '../../../components/LandingComponents/ScrollToTop';

describe('ScrollToTop Component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isVisible is false', () => {
    const { container } = render(<ScrollToTop isVisible={false} onClick={mockOnClick} />);

    // The component returns null, so the container should be empty
    expect(container.firstChild).toBeNull();

    // queryByRole returns null instead of throwing an error if not found
    const button = screen.queryByRole('button', { name: /scroll to top/i });
    expect(button).not.toBeInTheDocument();
  });

  it('renders correctly when isVisible is true', () => {
    render(<ScrollToTop isVisible={true} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /scroll to top/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-emerald-500');
  });

  it('calls onClick when the button is clicked', () => {
    render(<ScrollToTop isVisible={true} onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /scroll to top/i });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('is accessible for screen readers', () => {
    render(<ScrollToTop isVisible={true} onClick={mockOnClick} />);

    const button = screen.getByLabelText(/scroll to top/i);
    expect(button).toBeInTheDocument();
  });
});
