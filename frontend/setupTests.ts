import '@testing-library/jest-dom';

// Optional: Mock ResizeObserver if you use Recharts
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};