import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import ErrorBoundary from '../../../components/common/ErrorBoundary';

// 1. Component that intentionally crashes
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test Error Message');
  }
  return <div>Component is healthy</div>;
};

describe('ErrorBoundary Component', () => {
  // Prevent console.error from flooding the terminal during expected crashes
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="healthy-child">Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
  });

  it('catches an error and displays the default fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test Error Message')).toBeInTheDocument();
  });

  it('renders a custom fallback component if provided', () => {
    const CustomFallback = <div>Custom Error UI</div>;
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
  });

  it('calls the onError callback when an error is caught', () => {
    const handleError = jest.fn();
    
    render(
      <ErrorBoundary onError={handleError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

it('shows error details only in development environment', () => {
    // 1. Save the original environment
    const originalEnv = process.env.NODE_ENV;

    // 2. Force change the environment to development
    // We use @ts-ignore because NODE_ENV is technically read-only
    // @ts-ignore
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // 3. Verify that the "Error Details:" header is now visible
    // We use a regex /.../i to be more flexible with the search
    expect(screen.getByText(/Error Details:/i)).toBeInTheDocument();
    expect(screen.getByText(/Component Stack:/i)).toBeInTheDocument();

    // 4. Cleanup: Restore the environment to 'test'
    // @ts-ignore
    process.env.NODE_ENV = originalEnv;
  });

  // --- CORRECTED WINDOW.LOCATION RELOAD TEST ---
  it('handles reload page button click', () => {
    const reloadMock = jest.fn();
    const originalLocation = window.location;

    // We mock the location property on the window object
    // This avoids the 'not assignable' TypeScript error
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadBtn = screen.getByRole('button', { name: /reload page/i });
    fireEvent.click(reloadBtn);

    expect(reloadMock).toHaveBeenCalled();

    // Cleanup: Restore original window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('handles "Go Home" button click', () => {
    // We can't easily mock assignment to window.location.href, 
    // but we can mock the property descriptor similarly to reload
    const originalLocation = window.location;
    const locationMock = {
      ...originalLocation,
      href: '',
    };

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationMock,
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const goHomeBtn = screen.getByRole('button', { name: /go home/i });
    fireEvent.click(goHomeBtn);

    // After clicking handleGoHome, href should be set to '/'
    expect(window.location.href).toBe('/');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});