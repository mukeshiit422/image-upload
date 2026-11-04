import '@testing-library/jest-dom';

// Inject runtime config used by api.ts
(window as any).__CONFIG__ = {
  API_URL: 'http://localhost:3000',
};

// Suppress noisy console errors in test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('act(')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });
