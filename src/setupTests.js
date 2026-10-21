import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Three.js Canvas tests in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
