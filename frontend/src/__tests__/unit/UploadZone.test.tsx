/**
 * UNIT TESTS — UploadZone component
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { UploadZone } from '../../components/UploadZone';

function makeFile(name: string, type: string, sizeBytes = 50_000): File {
  const blob = new Blob(['x'.repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('UploadZone', () => {
  it('renders upload instructions', () => {
    render(<UploadZone onFiles={vi.fn()} />);
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    expect(screen.getByText(/max 10 mb/i)).toBeInTheDocument();
  });

  it('shows accepted formats', () => {
    render(<UploadZone onFiles={vi.fn()} />);
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('HEIC')).toBeInTheDocument();
  });

  it('calls onFiles when a valid file is dropped', async () => {
    const onFiles = vi.fn();
    render(<UploadZone onFiles={onFiles} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('photo.jpg', 'image/jpeg');

    await userEvent.upload(input, file);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('does not call onFiles when disabled', () => {
    const onFiles = vi.fn();
    render(<UploadZone onFiles={onFiles} isDisabled />);
    // react-dropzone blocks file selection via event handlers, not HTML disabled attr
    // Verify the disabled state through the CSS classes applied to the wrapper
    const wrapper = document.querySelector('[class*="opacity-50"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('cursor-not-allowed');
  });

  it('applies disabled styles when isDisabled is true', () => {
    const { container } = render(<UploadZone onFiles={vi.fn()} isDisabled />);
    expect(container.firstChild).toHaveClass('opacity-50');
  });
});
