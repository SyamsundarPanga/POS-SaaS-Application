import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../../../components/layout/Sidebar';

import * as reduxHooks from '../../../store/hooks';

jest.mock('../../../store/hooks');

const mockDispatch = jest.fn();

describe('Sidebar Component', () => {
  beforeEach(() => {
    jest.spyOn(reduxHooks, 'useAppDispatch').mockReturnValue(mockDispatch);

    jest.spyOn(reduxHooks, 'useAppSelector').mockImplementation((selector: any) =>
      selector({
        auth: {
          user: {
            username: 'admin',
            roles: ['ROLE_STORE_ADMIN'],
          },
        },

        branches: {
          selectedBranch: {
            id: 1,
            name: 'Main Branch',
          },
        },

        ui: {
          sidebar: {
            isOpen: true,
            isCollapsed: false,
          },
        },
      }),
    );
  });

  const renderSidebar = () =>
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>,
    );

  test('renders sidebar correctly', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('shows dashboard navigation item', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
