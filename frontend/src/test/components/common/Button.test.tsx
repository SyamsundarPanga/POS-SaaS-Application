import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import Button from '../../../components/common/Button';

describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveClass('bg-emerald-600'); // Default primary variant
  });

  it('applies the correct variant classes', () => {
    const { rerender } = render(<Button variant="danger">Delete</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-50');

    rerender(<Button variant="secondary">Cancel</Button>);
    expect(button).toHaveClass('bg-slate-100');
  });

  it('applies the correct size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3 py-1.5');

    rerender(<Button size="md">Medium</Button>);
    expect(button).toHaveClass('px-6 py-2.5');
  });

  it('triggers onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Action</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-70');
  });

  it('shows a loading spinner and is disabled when loading is true', () => {
    render(<Button loading>Submit</Button>);

    const button = screen.getByRole('button');

    // 1. Check if button is disabled
    expect(button).toBeDisabled();

    // 2. Check if the SVG spinner exists
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');

    // 3. Verify text is still present alongside spinner
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('does not trigger onClick while loading', () => {
    const handleClick = jest.fn();
    render(
      <Button loading onClick={handleClick}>
        Submit
      </Button>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });
});
