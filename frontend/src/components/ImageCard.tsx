import React, { useState } from 'react';
import { ImageStatus, REJECTION_REASON_LABELS, UploadItem } from '../types';
import { ProgressBar } from './ProgressBar';

interface Props {
  item: UploadItem;
  onRemove: (localId: string) => void;
}

export function ImageCard({ item, onRemove }: Props) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const record = item.imageRecord;

  const previewSrc = record?.thumbnailUrl || record?.storageUrl || item.previewUrl || null;
  const isAccepted = record?.status === ImageStatus.ACCEPTED;
  const isRejected = record?.status === ImageStatus.REJECTED || item.status === 'error';
  const isProcessing = item.status === 'uploading' || item.status === 'processing';

  const reasons =
    item.status === 'error' && !record
      ? [item.error ?? 'Unknown error']
      : (record?.rejectionReasons ?? []).map((r) => REJECTION_REASON_LABELS[r] ?? r);

  const fileSize = record ? formatBytes(record.sizeBytes) : formatBytes(item.file.size);
  const dimensions = record?.width && record?.height ? `${record.width}×${record.height}` : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-md ${
        isAccepted
          ? 'border-green-200 shadow-green-50'
          : isRejected
          ? 'border-red-200 shadow-red-50'
          : 'border-gray-200'
      } bg-white`}
    >
      {/* Image preview */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
        {previewSrc && !imgError ? (
          <img
            src={previewSrc}
            alt={item.file.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${hovered && !isProcessing ? 'scale-105' : 'scale-100'}`}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            {item.previewUrl === '' && (
              <span className="text-xs text-gray-400">HEIC preview</span>
            )}
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col items-center justify-end pb-4 gap-2">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-white text-xs font-medium">
                {item.status === 'uploading' ? 'Uploading…' : 'Validating…'}
              </span>
            </div>
            {item.status === 'uploading' && (
              <div className="w-3/4">
                <ProgressBar percent={item.uploadProgress} />
              </div>
            )}
          </div>
        )}

        {/* Result badge — top right */}
        {!isProcessing && record && (
          <div className={`absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm ${
            isAccepted ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {isAccepted ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {isAccepted ? 'Accepted' : 'Rejected'}
          </div>
        )}

        {/* Remove button — top left, visible on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.localId); }}
          className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 hover:bg-black/75 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 pt-2.5 pb-3 space-y-1.5">
        {/* Filename */}
        <p className="text-xs font-medium text-gray-700 truncate" title={item.file.name}>
          {item.file.name}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>{fileSize}</span>
          {dimensions && (
            <>
              <span className="text-gray-200">·</span>
              <span>{dimensions}</span>
            </>
          )}
        </div>

        {/* Rejection reasons */}
        {isRejected && reasons.length > 0 && (
          <div className="mt-1 space-y-1">
            {reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2 py-1">
                <svg className="w-3 h-3 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-red-600 leading-tight">{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
