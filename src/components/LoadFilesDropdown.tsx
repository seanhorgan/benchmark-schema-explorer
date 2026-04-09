import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FolderOpen, Link, X } from 'lucide-react';
import { useAnalysis } from '../state/analysis-store';
import { loadFromFiles, loadFromFileArray, loadFromUrl } from '../data/loader';
import { cn } from '../lib/utils';

const SUPPORTED_EXT = /\.(ya?ml|json)$/i;

export default function LoadFilesDropdown() {
  const { state, dispatch } = useAnalysis();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  // Directory upload state
  const [dirFiles, setDirFiles] = useState<File[]>([]);
  const [regexInput, setRegexInput] = useState('');
  const [regexError, setRegexError] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Matched files derived from dirFiles + regex
  const matchedFiles = useMemo(() => {
    if (dirFiles.length === 0) return [];
    if (!regexInput.trim()) return dirFiles;

    try {
      const re = new RegExp(regexInput);
      setRegexError(false);
      return dirFiles.filter(f => {
        const path = (f as any).webkitRelativePath || f.name;
        return re.test(path);
      });
    } catch {
      setRegexError(true);
      return dirFiles; // show all on invalid regex
    }
  }, [dirFiles, regexInput]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const reports = await loadFromFiles(files);
      dispatch({ type: 'LOAD_REPORTS', reports });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDirChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Filter to supported extensions only
    const supported = Array.from(files as FileList).filter((f: File) => SUPPORTED_EXT.test(f.name));
    setDirFiles(supported);
    setRegexInput('');
    setRegexError(false);
    setError(null);
  }

  async function handleImportMatched() {
    if (matchedFiles.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const reports = await loadFromFileArray(matchedFiles);
      dispatch({ type: 'LOAD_REPORTS', reports });
      setDirFiles([]);
      setRegexInput('');
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (dirInputRef.current) dirInputRef.current.value = '';
    }
  }

  async function handleFetchUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const report = await loadFromUrl(url.trim());
      dispatch({ type: 'LOAD_REPORTS', reports: [report] });
      setUrl('');
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#141414]/20 rounded',
          'hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors',
          open && 'bg-[#141414] text-[#E4E3E0]'
        )}
      >
        Load Files
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[400px] bg-white border border-[#141414]/20 shadow-lg p-4 rounded z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Load Data</span>
            <button
              onClick={() => setOpen(false)}
              className="text-[#141414]/40 hover:text-[#141414] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Upload Files */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/60 mb-1.5 block">
              Upload Files
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[#141414]/20 rounded',
                'text-[11px] font-medium text-[#141414]/60 hover:border-[#141414]/40 hover:text-[#141414] transition-colors',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Upload size={14} />
              {loading ? 'Loading...' : 'Choose .yaml, .yml, or .json files'}
            </button>
          </div>

          {/* Load Directory */}
          <div className="mb-4 pt-3 border-t border-[#141414]/10">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/60 mb-1.5 block">
              Load Directory
            </label>
            <input
              ref={dirInputRef}
              type="file"
              // @ts-ignore - webkitdirectory is non-standard but widely supported
              webkitdirectory=""
              multiple
              onChange={handleDirChange}
              className="hidden"
            />
            <button
              onClick={() => dirInputRef.current?.click()}
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[#141414]/20 rounded',
                'text-[11px] font-medium text-[#141414]/60 hover:border-[#141414]/40 hover:text-[#141414] transition-colors',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <FolderOpen size={14} />
              Choose a directory
            </button>

            {dirFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {/* Regex filter */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider opacity-40 block mb-1">
                    Filter regex
                  </label>
                  <input
                    type="text"
                    value={regexInput}
                    onChange={(e) => setRegexInput(e.target.value)}
                    placeholder="e.g. run\d+ or results/.*\.yaml"
                    className={cn(
                      'w-full px-2 py-1.5 text-[11px] font-mono border rounded outline-none',
                      regexError
                        ? 'border-red-400 bg-red-50'
                        : 'border-[#141414]/20 focus:border-[#141414]/40'
                    )}
                  />
                  {regexError && (
                    <span className="text-[10px] text-red-500 mt-0.5 block">Invalid regex</span>
                  )}
                </div>

                {/* Match count */}
                <div className="text-[11px] font-mono">
                  <span className="font-bold">{matchedFiles.length}</span>
                  <span className="opacity-50"> of {dirFiles.length} files</span>
                </div>

                {/* File list */}
                <div className="max-h-48 overflow-y-auto border border-[#141414]/10 rounded">
                  {matchedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="px-2 py-1 text-[11px] font-mono truncate border-b border-[#141414]/5 last:border-b-0"
                      title={(f as any).webkitRelativePath || f.name}
                    >
                      {(f as any).webkitRelativePath || f.name}
                    </div>
                  ))}
                  {matchedFiles.length === 0 && (
                    <div className="px-2 py-3 text-[11px] text-center opacity-40">
                      No files match
                    </div>
                  )}
                </div>

                {/* Import button */}
                <button
                  onClick={handleImportMatched}
                  disabled={loading || matchedFiles.length === 0}
                  className={cn(
                    'w-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded',
                    'bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/80 transition-colors',
                    (loading || matchedFiles.length === 0) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {loading ? 'Importing...' : `Import ${matchedFiles.length} file${matchedFiles.length === 1 ? '' : 's'}`}
                </button>
              </div>
            )}
          </div>

          {/* Fetch URL */}
          <div className="pt-3 border-t border-[#141414]/10">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/60 mb-1.5 block">
              Fetch URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-[#141414]/20 rounded overflow-hidden">
                <span className="pl-2 text-[#141414]/40">
                  <Link size={12} />
                </span>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  placeholder="https://..."
                  className="flex-1 px-2 py-1.5 text-[11px] outline-none bg-transparent"
                />
              </div>
              <button
                onClick={handleFetchUrl}
                disabled={loading || !url.trim()}
                className={cn(
                  'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded',
                  'bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/80 transition-colors',
                  (loading || !url.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 text-[10px] text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {/* Loaded Reports */}
          {state.reports.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#141414]/10">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/60 mb-1.5 block">
                Loaded Reports ({state.reports.length})
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {state.reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[#141414]/5 rounded group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-mono truncate block">{r.filename}</span>
                      <span className="text-[9px] text-[#141414]/40 uppercase">{r.source}</span>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_REPORT', id: r.id })}
                      className="opacity-0 group-hover:opacity-100 text-[#141414]/40 hover:text-red-500 transition-all flex-shrink-0"
                      title="Remove report"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
