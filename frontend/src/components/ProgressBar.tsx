import React from 'react';

interface Props {
  percent: number;
  label?: string;
  color?: string;
}

export function ProgressBar({ percent, label, color = 'bg-blue-500' }: Props) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
