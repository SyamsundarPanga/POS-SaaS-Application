import React from 'react';
import { render, screen } from '../../test-utils';
import SuperAdminSettingsPage from '../../../../src/pages/superadmin/SuperAdminSettingsPage';

describe('SuperAdminSettingsPage', () => {
  it('renders settings page content', () => {
    render(<SuperAdminSettingsPage />);

    expect(screen.getByText(/Platform Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Developer Access/i)).toBeInTheDocument();
    // Match the badge exactly to avoid matching the paragraph text that contains 'restricted'
    expect(screen.getByText((content) => content.trim() === 'RESTRICTED')).toBeInTheDocument();
  });
});
