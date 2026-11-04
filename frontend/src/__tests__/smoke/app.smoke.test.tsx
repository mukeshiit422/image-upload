/**
 * SMOKE TESTS — does the app render at all?
 */
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/api';

vi.mock('../../services/api');
const mockApi = vi.mocked(api);

beforeEach(() => {
  mockApi.listImages.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  mockApi.getStats.mockResolvedValue({ accepted: 0, rejected: 0, pending: 0, processing: 0, total: 0, queueLength: 0 });
});

describe('App smoke tests', () => {
  it('renders without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('shows the upload zone', () => {
    render(<App />);
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
  });

  it('renders a file input element', () => {
    render(<App />);
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it('shows accepted file formats', () => {
    render(<App />);
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
  });

  it('API_URL is set from runtime config', () => {
    expect((window as any).__CONFIG__.API_URL).toBeDefined();
  });
});
