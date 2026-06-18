import React from 'react';
import { render, screen } from '../test-utils';
import NotFoundPage from '../../pages/NotFoundPage';

describe('NotFoundPage', () => {
  it('shows 404 and a link to home', () => {
    render(<NotFoundPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Home/i })).toBeInTheDocument();
  });
});
