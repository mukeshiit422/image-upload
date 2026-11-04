import React, { useEffect, useRef, useState } from 'react';
import { listImages } from '../services/api';
import { ImageRecord, ImageStatus, REJECTION_REASON_LABELS } from '../types';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 400;

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const data = await listImages({ search: q, limit: 50 });
      setResults(data.items);
      setSearched(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-search once query reaches MIN_CHARS, with debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      setSearched(false);
      setError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(q);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Search input */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 p-3 border-b border-gray-100">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by file name… (min 3 chars)"
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all placeholder:text-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          )}
          Search
        </button>
      </form>

      {/* Hint when typing but not enough chars yet */}
      {query.trim().length > 0 && query.trim().length < MIN_CHARS && !loading && (
        <p className="px-4 py-2 text-xs text-gray-400">
          Type {MIN_CHARS - query.trim().length} more character{MIN_CHARS - query.trim().length !== 1 ? 's' : ''} to search…
        </p>
      )}

      {/* Results */}
      {error && (
        <div className="p-4 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {searched && !loading && (
        <div>
          {results.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">No images found</p>
              <p className="text-xs text-gray-400 mt-1">No files matching <span className="font-medium">"{query}"</span></p>
            </div>
          ) : (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs text-gray-400">
                {results.length} result{results.length !== 1 ? 's' : ''} for <span className="font-medium text-gray-600">"{query}"</span>
              </p>
              <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {results.map((img) => (
                  <SearchResultRow key={img.id} image={img} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultRow({ image }: { image: ImageRecord }) {
  const isAccepted = image.status === ImageStatus.ACCEPTED;
  const isRejected = image.status === ImageStatus.REJECTED;

  const statusStyle = isAccepted
    ? 'bg-green-100 text-green-700'
    : isRejected
    ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700';

  const reasons = image.rejectionReasons
    .map((r) => REJECTION_REASON_LABELS[r] ?? r)
    .join(', ');

  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {image.thumbnailUrl || image.storageUrl ? (
          <img
            src={image.thumbnailUrl || image.storageUrl || ''}
            alt={image.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{image.originalName}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">
            {formatBytes(image.sizeBytes)}
            {image.width && image.height && ` · ${image.width}×${image.height}`}
          </span>
          {isRejected && reasons && (
            <span className="text-xs text-red-400 truncate max-w-[180px]" title={reasons}>
              {reasons}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusStyle}`}>
        {image.status.charAt(0) + image.status.slice(1).toLowerCase()}
      </span>
    </li>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
