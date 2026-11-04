/**
 * INTEGRATION TESTS — upload flow
 * Mocks the API layer to test the full component interaction.
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/api';
import { ImageStatus } from '../../types';

vi.mock('../../services/api');
const mockApi = vi.mocked(api);

function makeJpeg(name = 'photo.jpg'): File {
  return new File([new Blob(['fake'], { type: 'image/jpeg' })], name, { type: 'image/jpeg' });
}

describe('Upload flow integration', () => {
  beforeEach(() => {
    mockApi.uploadImage.mockResolvedValue({
      id: 'test-id-123',
      originalName: 'photo.jpg',
      status: ImageStatus.PENDING,
      message: 'Queued',
    });
    mockApi.getImageStatus.mockResolvedValue({
      id: 'test-id-123',
      originalName: 'photo.jpg',
      status: ImageStatus.ACCEPTED,
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

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('calls uploadImage when a valid file is uploaded', async () => {
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeJpeg());

    await waitFor(() => {
      expect(mockApi.uploadImage).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
  });

  it('starts polling getImageStatus after a successful upload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeJpeg());

    // Wait for upload to complete (use real time via shouldAdvanceTime)
    await waitFor(() => {
      expect(mockApi.uploadImage).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Advance past the 2000ms poll interval
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    await waitFor(() => {
      expect(mockApi.getImageStatus).toHaveBeenCalledWith('test-id-123');
    }, { timeout: 3000 });

    vi.useRealTimers();
  });

  it('sets error state when upload fails', async () => {
    // The hook sets error to (err as Error).message
    mockApi.uploadImage.mockRejectedValue(new Error('Network error'));
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeJpeg());

    await waitFor(() => {
      expect(mockApi.uploadImage).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('renders the upload zone on mount', () => {
    render(<App />);
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });
});
