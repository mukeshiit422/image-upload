import axios, { AxiosProgressEvent } from 'axios';
import {
  ApiResponse,
  ImageRecord,
  ImageStatus,
  PaginatedResponse,
  UploadedImageResponse,
} from '../types';

const apiUrl =
  (window as any).__CONFIG__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000';

const api = axios.create({
  baseURL: `${apiUrl}/api`,
  timeout: 60_000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export async function uploadImage(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadedImageResponse> {
  const form = new FormData();
  form.append('image', file);

  const response = await api.post<ApiResponse<UploadedImageResponse>>(
    '/images/upload',
    form,
    {
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error ?? 'Upload failed');
  }
  return response.data.data;
}

export async function getImageStatus(id: string): Promise<ImageRecord> {
  const response = await api.get<ApiResponse<ImageRecord>>(`/images/${id}`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error ?? 'Failed to fetch image');
  }
  return response.data.data;
}

export async function listImages(params?: {
  status?: ImageStatus;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<ImageRecord>> {
  const response = await api.get<ApiResponse<PaginatedResponse<ImageRecord>>>('/images', {
    params,
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error ?? 'Failed to fetch images');
  }
  return response.data.data;
}

export async function deleteImage(id: string): Promise<void> {
  const response = await api.delete<ApiResponse>(`/images/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error ?? 'Failed to delete image');
  }
}

export async function getStats(): Promise<{
  accepted: number;
  rejected: number;
  pending: number;
  processing: number;
  total: number;
  queueLength: number;
}> {
  const response = await api.get<ApiResponse>('/images/stats');
  if (!response.data.success) throw new Error('Failed to fetch stats');
  return response.data.data as ReturnType<typeof getStats> extends Promise<infer T> ? T : never;
}
