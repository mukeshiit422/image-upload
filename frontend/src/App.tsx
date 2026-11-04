import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { ImageGrid } from './components/ImageGrid';
import { SearchBar } from './components/SearchBar';
import { useImageUpload } from './hooks/useImageUpload';
import { ImageStatus } from './types';

type Tab = 'all' | 'accepted' | 'rejected' | 'processing';

export default function App() {
  const { items, accepted, rejected, pending, addFiles, removeItem, clearAll } =
    useImageUpload();

  const [activeTab, setActiveTab] = useState<Tab>('all');

  const hasItems = items.length > 0;
  const total = items.length;

  const tabs: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'all', label: 'All', count: total, color: 'gray' },
    { id: 'processing', label: 'Processing', count: pending.length, color: 'blue' },
    { id: 'accepted', label: 'Accepted', count: accepted.length, color: 'green' },
    { id: 'rejected', label: 'Rejected', count: rejected.length, color: 'red' },
  ];

  const tabItems = {
    all: items,
    accepted,
    rejected,
    processing: pending,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <header className="bg-blue-50 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900 leading-tight">Image Upload Server</h1>
              <p className="text-xs text-gray-400 leading-tight">JPEG · PNG · HEIC</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Upload zone */}
        <UploadZone onFiles={addFiles} />

        {/* Search panel */}
         <SearchBar />

        {/* Stats + tabs — only show once something was uploaded */}
        {hasItems && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Accepted" value={accepted.length} color="green"
                icon={<CheckCircleIcon />} />
              <StatCard label="Rejected" value={rejected.length} color="red"
                icon={<XCircleIcon />} />
              <StatCard label="Processing" value={pending.length} color="blue"
                icon={<ClockIcon />} />
            </div>

            {/* Tab bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {tabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </div>

              <div className="p-5">
                <ImageGrid
                  items={tabItems[activeTab]}
                  onRemove={removeItem}
                  emptyMessage={
                    activeTab === 'accepted' ? 'No accepted images yet'
                    : activeTab === 'rejected' ? 'No rejected images'
                    : activeTab === 'processing' ? 'Nothing processing right now'
                    : 'Upload some images to get started'
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* Validation rules — shown when empty */}
        {!hasItems && <ValidationRules />}
      </main>
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: { id: string; label: string; count: number; color: string };
  active: boolean;
  onClick: () => void;
}) {
  const activeColors: Record<string, string> = {
    gray: 'border-gray-700 text-gray-700',
    green: 'border-green-500 text-green-600',
    red: 'border-red-500 text-red-600',
    blue: 'border-blue-500 text-blue-600',
  };

  const badgeColors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
        active
          ? `${activeColors[tab.color]} bg-white`
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {tab.label}
      {tab.count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
          active ? badgeColors[tab.color] : 'bg-gray-100 text-gray-500'
        }`}>
          {tab.count}
        </span>
      )}
    </button>
  );
}

function StatCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: 'green' | 'red' | 'blue'; icon: React.ReactNode;
}) {
  const styles = {
    green: 'from-green-50 to-emerald-50 border-green-200 text-green-700',
    red: 'from-red-50 to-rose-50 border-red-200 text-red-700',
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-700',
  };
  const iconStyles = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
  };

  return (
    <div className={`bg-gradient-to-br ${styles[color]} border rounded-2xl p-4 flex items-center gap-3`}>
      <div className={`${iconStyles[color]} shrink-0`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs font-medium mt-0.5 opacity-80">{label}</div>
      </div>
    </div>
  );
}

function ValidationRules() {
  const rules = [
    { icon: '📁', title: 'Format', desc: 'JPEG, PNG, HEIC only' },
    { icon: '📐', title: 'Resolution', desc: 'Min 200 × 200 px' },
    { icon: '⚡', title: 'File size', desc: 'Min 1 KB · Max 10 MB' },
    { icon: '🔍', title: 'Sharpness', desc: 'No blurry images' },
    { icon: '👥', title: 'Faces', desc: 'No multiple faces' },
    { icon: '🔁', title: 'Duplicates', desc: 'Similar images rejected' },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6">
      <p className="text-base font-bold text-gray-800 mb-4">Validation Rules</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rules.map((r, i) => (
          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
            <span className="text-lg leading-none mt-0.5">{r.icon}</span>
            <div>
              <p className="text-xs font-semibold text-gray-700">{r.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function XCircleIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
