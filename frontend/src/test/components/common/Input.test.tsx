import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import Input from '../../../components/common/Input';

describe('Input Component', () => {
  it('renders correctly with a label', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    
    // Check if label exists
    expect(screen.getByText('Username')).toBeInTheDocument();
    // Check if input exists via placeholder
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('displays an error message and applies red border class', () => {
    const errorMessage = 'Email is required';
    render(<Input error={errorMessage} />);
    
    // Check if error text is visible
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Check if the input element has the red border class
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveClass('border-red-500');
  });

  it('updates value correctly on change', () => {
    render(<Input placeholder="Type here" />);
    const inputElement = screen.getByPlaceholderText('Type here') as HTMLInputElement;
    
    fireEvent.change(inputElement, { target: { value: 'Hello World' } });
    
    expect(inputElement.value).toBe('Hello World');
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Input disabled placeholder="Can't touch this" />);
    const inputElement = screen.getByPlaceholderText("Can't touch this");
    
    expect(inputElement).toBeDisabled();
    expect(inputElement).toHaveProperty('disabled', true);
  });

  it('supports forwarded refs', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} label="Ref Input" />);
    
    // Verify that the ref points to the actual input element
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('passes extra props like name and type to the input element', () => {
    render(<Input name="email" type="email" placeholder="email-input" />);
    const inputElement = screen.getByPlaceholderText('email-input');
    
    expect(inputElement).toHaveAttribute('name', 'email');
    expect(inputElement).toHaveAttribute('type', 'email');
  });

  it('disables autocomplete by default', () => {
    render(<Input placeholder="autocomplete-input" />);

    expect(screen.getByPlaceholderText('autocomplete-input')).toHaveAttribute('autocomplete', 'off');
  });
});
