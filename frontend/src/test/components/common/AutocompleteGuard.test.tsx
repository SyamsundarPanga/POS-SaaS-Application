import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import AutocompleteGuard from '../../../components/common/AutocompleteGuard';

describe('AutocompleteGuard', () => {
  it('disables autocomplete for forms and supported controls', async () => {
    const { container } = render(
      <>
        <AutocompleteGuard />
        <form data-testid="guarded-form">
          <input name="branchName" placeholder="Branch name" />
          <input name="password" type="password" placeholder="Password" />
          <textarea name="notes" aria-label="Notes" />
          <select name="country" aria-label="Country">
            <option value="IN">India</option>
          </select>
        </form>
      </>,
    );

    const form = screen.getByTestId('guarded-form');
    const branchInput = screen.getByPlaceholderText('Branch name');
    const passwordInput = screen.getByPlaceholderText('Password');
    const notes = screen.getByLabelText('Notes');
    const country = screen.getByLabelText('Country');

    await waitFor(() => {
      expect(form).toHaveAttribute('autocomplete', 'off');
    });

    expect(branchInput).toHaveAttribute('autocomplete', 'off');
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
    expect(notes).toHaveAttribute('autocomplete', 'off');
    expect(country).toHaveAttribute('autocomplete', 'off');
    expect(form.querySelector('[data-autocomplete-blocker="username"]')).toBeInTheDocument();
    expect(form.querySelector('[data-autocomplete-blocker="password"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-lpignore="true"]').length).toBeGreaterThan(0);
  });

  it('respects explicit allow flags and existing autocomplete values', async () => {
    render(
      <>
        <AutocompleteGuard />
        <form data-testid="opt-out-form" data-allow-autocomplete="true">
          <input
            name="email"
            placeholder="Email"
            data-allow-autocomplete="true"
            autoComplete="email"
          />
        </form>
      </>,
    );

    const form = screen.getByTestId('opt-out-form');
    const input = screen.getByPlaceholderText('Email');

    await waitFor(() => {
      expect(input).toHaveAttribute('autocomplete', 'email');
    });

    expect(form).not.toHaveAttribute('data-lpignore', 'true');
    expect(form).not.toHaveAttribute('autocomplete', 'off');
    expect(input).not.toHaveAttribute('data-lpignore', 'true');
  });
});
