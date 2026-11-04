import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Inject runtime config used by api.ts
(window as any).__CONFIG__ = {
  API_URL: 'http://localhost:3000',
};

// jsdom doesn't implement URL.createObjectURL — mock it
global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
global.URL.revokeObjectURL = vi.fn();

// Suppress noisy console errors in test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('act(')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });
