import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Import all reducers
import branchReducer from '../store/slices/branchSlice';
import authReducer from '../store/slices/authSlice';
import notificationReducer from '../store/slices/notificationSlice';
import uiReducer from '../store/slices/uiSlice'; // ✅ Added UI Reducer

// Mock Axios globally to stop network errors in console
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  })),
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: any;
}

const customRender = (
  ui: ReactElement,
  {
    preloadedState = {},
    // Create a fresh store for every render to avoid state pollution between tests
    store = configureStore({
      reducer: {
        auth: authReducer,
        branches: branchReducer,
        notifications: notificationReducer,
        ui: uiReducer, // ✅ Registered the ui slice
      },
      preloadedState,
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {},
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <Provider store={store}>
        <MemoryRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          {children}
        </MemoryRouter>
      </Provider>
    );
  };

  return {
    store,
    ...rtlRender(ui, { wrapper: AllTheProviders, ...renderOptions }),
  };
};

export * from '@testing-library/react';
export { customRender as render };
