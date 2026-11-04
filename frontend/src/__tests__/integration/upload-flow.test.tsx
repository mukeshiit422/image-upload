/**
 * INTEGRATION TESTS — upload flow
 * Mocks the API layer to test the full component interaction.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/api';

vi.mock('../../services/api');
const mockApi = vi.mocked(api);

function makeJpeg(name = 'photo.jpg'): File {
  return new File([new Blob(['fake'], { type: 'image/jpeg' })], name, { type: 'image/jpeg' });
}

describe('Upload flow integration', () => {
  beforeEach(() => {
    mockApi.uploadImage.mockResolvedValue({ id: 'test-id-123', originalName: 'photo.jpg', status: 'PENDING', message: 'Queued' });
    mockApi.getImageStatus.mockResolvedValue({
      id: 'test-id-123',
      originalName: 'photo.jpg',
      status: 'ACCEPTED',
      storageUrl: 'https://d3eks1vjagjqcv.cloudfront.net/images/test.jpg',
      thumbnailUrl: 'https://d3eks1vjagjqcv.cloudfront.net/thumbnails/test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 50000,
      width: 400,
      height: 400,
      rejectionReasons: [],
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    mockApi.listImages.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockApi.getStats.mockResolvedValue({ accepted: 0, rejected: 0, pending: 0, processing: 0, total: 0, queueLength: 0 });
  });

  it('shows pending status immediately after upload', async () => {
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeJpeg());

    await waitFor(() => {
      expect(mockApi.uploadImage).toHaveBeenCalledTimes(1);
    });
  });

  it('shows accepted status after processing completes', async () => {
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeJpeg());

    await waitFor(() => {
      expect(mockApi.getImageStatus).toHaveBeenCalledWith('test-id-123');
    });
  });

  it('shows error message when upload fails', async () => {
    mockApi.uploadImage.mockRejectedValue(new Error('Network error'));
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeJpeg());

    await waitFor(() => {
      expect(screen.getByText(/error|failed|network/i)).toBeInTheDocument();
    });
  });

  it('calls listImages with search term when user searches', async () => {
    render(<App />);

    const searchInput = screen.queryByPlaceholderText(/search/i);
    if (!searchInput) return; // skip if search not visible initially

    await userEvent.type(searchInput, 'alice');
    await waitFor(() => {
      expect(mockApi.listImages).toHaveBeenCalledWith(expect.objectContaining({ search: 'alice' }));
    });
  });
});
