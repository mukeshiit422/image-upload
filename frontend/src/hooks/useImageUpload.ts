import { useCallback, useEffect, useRef, useState } from 'react';
import { uuidv4 } from '../utils/uuid';
import { uploadImage, getImageStatus } from '../services/api';
import { ImageStatus, UploadItem } from '../types';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

function validateFileClient(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeOk = ALLOWED_TYPES.includes(file.type);
  const extOk = ALLOWED_EXTENSIONS.includes(`.${ext}`);

  if (!mimeOk && !extOk) {
    return `Invalid format. Allowed: JPEG, PNG, HEIC. Got: ${file.type || ext}`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large. Maximum size is 10MB. Got: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
  }
  if (file.size === 0) {
    return 'File is empty';
  }
  return null;
}

function createPreviewUrl(file: File): string {
  // HEIC files may not preview natively in browser
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'heic' || ext === 'heif') {
    return '';
  }
  return URL.createObjectURL(file);
}

export function useImageUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const pollTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const updateItem = useCallback(
    (localId: string, patch: Partial<UploadItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
      );
    },
    []
  );

  const pollStatus = useCallback(
    (localId: string, imageId: string, attempts = 0) => {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        updateItem(localId, {
          status: 'error',
          error: 'Processing timed out. Please try again.',
        });
        return;
      }

      const timer = setTimeout(async () => {
        try {
          const record = await getImageStatus(imageId);

          if (
            record.status === ImageStatus.PENDING ||
            record.status === ImageStatus.PROCESSING
          ) {
            pollStatus(localId, imageId, attempts + 1);
          } else {
            updateItem(localId, {
              status: 'done',
              imageRecord: record,
            });
            pollTimers.current.delete(localId);
          }
        } catch (err) {
          pollStatus(localId, imageId, attempts + 1);
        }
      }, POLL_INTERVAL_MS);

      pollTimers.current.set(localId, timer);
    },
    [updateItem]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const newItems: UploadItem[] = files.map((file) => {
        const localId = uuidv4();
        const validationError = validateFileClient(file);
        const previewUrl = createPreviewUrl(file);

        return {
          localId,
          file,
          previewUrl,
          uploadProgress: 0,
          status: validationError ? 'error' : 'pending',
          imageRecord: null,
          error: validationError,
        } as UploadItem;
      });

      setItems((prev) => [...newItems, ...prev]);

      for (const item of newItems) {
        if (item.status === 'error') continue;

        updateItem(item.localId, { status: 'uploading' });

        try {
          const response = await uploadImage(item.file, (progress) => {
            updateItem(item.localId, { uploadProgress: progress });
          });

          updateItem(item.localId, {
            status: 'processing',
            uploadProgress: 100,
          });

          pollStatus(item.localId, response.id);
        } catch (err) {
          updateItem(item.localId, {
            status: 'error',
            error: (err as Error).message,
          });
        }
      }
    },
    [updateItem, pollStatus]
  );

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.localId === localId);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.localId !== localId);
    });

    const timer = pollTimers.current.get(localId);
    if (timer) {
      clearTimeout(timer);
      pollTimers.current.delete(localId);
    }
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    pollTimers.current.forEach((timer) => clearTimeout(timer));
    pollTimers.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      pollTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const accepted = items.filter(
    (i) => i.status === 'done' && i.imageRecord?.status === ImageStatus.ACCEPTED
  );
  const rejected = items.filter(
    (i) =>
      (i.status === 'done' && i.imageRecord?.status === ImageStatus.REJECTED) ||
      i.status === 'error'
  );
  const pending = items.filter(
    (i) => i.status === 'uploading' || i.status === 'processing' || i.status === 'pending'
  );

  return {
    items,
    accepted,
    rejected,
    pending,
    addFiles,
    removeItem,
    clearAll,
  };
}
