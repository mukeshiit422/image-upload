import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onFiles: (files: File[]) => void;
  isDisabled?: boolean;
}

const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
};

export function UploadZone({ onFiles, isDisabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted.length > 0) onFiles(accepted); },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: true,
    disabled: isDisabled,
    noClick: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative group rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer outline-none
        ${isDragReject
          ? 'border-red-400 bg-red-50'
          : isDragActive
          ? 'border-blue-400 bg-blue-50 scale-[1.01]'
          : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center py-14 px-8 text-center select-none">
        {/* Animated cloud icon */}
        <div className={`mb-5 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
          isDragActive ? 'bg-blue-100 scale-110' : isDragReject ? 'bg-red-100' : 'bg-gray-100 group-hover:bg-blue-100'
        }`}>
          {isDragReject ? (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          ) : (
            <svg className={`w-8 h-8 transition-colors ${isDragActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`}
              fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.632-8.664 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
          )}
        </div>

        {isDragReject ? (
          <p className="text-red-500 font-semibold text-base">Wrong file type — JPEG, PNG or HEIC only</p>
        ) : isDragActive ? (
          <>
            <p className="text-blue-600 font-semibold text-base">Drop to upload</p>
            <p className="text-blue-400 text-sm mt-1">Release your files</p>
          </>
        ) : (
          <>
            <p className="text-gray-700 font-semibold text-base">
              Drag & drop images here
            </p>
            <p className="text-gray-400 text-sm mt-1.5 mb-4">
              or click to browse your files
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {['JPEG', 'PNG', 'HEIC'].map((fmt) => (
                <span key={fmt} className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">
                  {fmt}
                </span>
              ))}
              <span className="text-xs text-gray-300 mx-1">·</span>
              <span className="text-xs text-gray-400">Max 10 MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
