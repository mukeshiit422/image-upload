import React from 'react';
import { ImageStatus } from '../types';

interface Props {
  status: ImageStatus | 'uploading' | 'processing' | 'error';
  small?: boolean;
}

const CONFIG: Record<string, { label: string; className: string }> = {
  [ImageStatus.ACCEPTED]: {
    label: 'Accepted',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  [ImageStatus.REJECTED]: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  [ImageStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [ImageStatus.PROCESSING]: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  uploading: {
    label: 'Uploading',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  processing: {
    label: 'Validating',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export function StatusBadge({ status, small }: Props) {
  const conf = CONFIG[status] ?? CONFIG[ImageStatus.PENDING];
  const isAnimated =
    status === 'uploading' ||
    status === 'processing' ||
    status === ImageStatus.PENDING ||
    status === ImageStatus.PROCESSING;

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-medium ${
        small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${conf.className}`}
    >
      {isAnimated && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${conf.className}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${conf.className}`} />
        </span>
      )}
      {conf.label}
    </span>
  );
}
