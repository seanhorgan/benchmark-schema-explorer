/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as yaml from 'js-yaml';
import { Search, ChevronDown, Layout, Info, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';
import CascadingDataView, { getSchemaForPath } from './CascadingDataView';
import Inspector from './Inspector';
import { useAnalysis } from '../../state/analysis-store';

export default function SchemaExplorer() {
  const { state } = useAnalysis();
  const reports = state.reports;
  const schema = state.schema;

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [dataViewMode, setDataViewMode] = useState<'tree' | 'flat'>('tree');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [dataNavigationPath, setDataNavigationPath] = useState<string[]>([]);

  // Auto-select first report when reports change
  useEffect(() => {
    if (reports.length > 0 && (!selectedReportId || !reports.find(r => r.id === selectedReportId))) {
      setSelectedReportId(reports[0].id);
    }
    if (reports.length === 0) {
      setSelectedReportId(null);
    }
  }, [reports, selectedReportId]);

  // Reset navigation when switching reports
  useEffect(() => {
    setDataNavigationPath([]);
    setSelectedPath(null);
    setSearchQuery("");
  }, [selectedReportId]);

  const data = useMemo(() => {
    if (!selectedReportId) return null;
    return reports.find(r => r.id === selectedReportId)?.data ?? null;
  }, [reports, selectedReportId]);

  const flatData = useMemo(() => {
    if (!data) return [];
    const flat: { path: string; name: string; value: any; description?: string }[] = [];

    function flatten(obj: any, path: string = "root") {
      const nodeSchema = getSchemaForPath(path, schema);
      flat.push({
        path,
        name: path.split('.').pop() || "root",
        value: obj,
        description: nodeSchema?.description
      });

      if (typeof obj !== 'object' || obj === null) {
        return;
      }

      Object.entries(obj).forEach(([key, value]) => {
        const newPath = `${path}.${key}`;
        flatten(value, newPath);
      });
    }

    flatten(data);
    return flat;
  }, [data, schema]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return flatData.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.path.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }, [searchQuery, flatData]);

  useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (searchResults.length > 0 && dataViewMode === 'tree') {
      const match = searchResults[searchIndex];
      if (match) {
        const pathParts = match.path.split('.');
        const navPath = pathParts.slice(1, -1);
        setDataNavigationPath(navPath);
        setSelectedPath(match.path);
      }
    }
  }, [searchIndex, searchResults, dataViewMode]);

  const handleDataNavigate = (key: string, depth: number) => {
    setDataNavigationPath(prev => {
      const next = prev.slice(0, depth);
      next.push(key);
      return next;
    });
  };

  if (reports.length === 0) {
    return (
      <main className="flex h-[calc(100vh-65px)] items-center justify-center">
        <div className="text-center">
          <Layout className="w-12 h-12 mx-auto mb-4 opacity-20 stroke-[1]" />
          <p className="text-sm font-mono uppercase opacity-40">Load benchmark reports to explore</p>
          <p className="text-xs font-mono opacity-25 mt-2">Use "Load Files" in the header</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden">
      {/* Left Panel */}
      <section className="flex-1 overflow-hidden border-r border-[#141414]">
        <div className="p-6 h-full flex flex-col">
          <div className="mb-8">
            {/* Report selector */}
            {reports.length > 1 && (
              <div className="mb-4">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 block mb-2">Viewing Report</label>
                <select
                  value={selectedReportId ?? ''}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="w-full bg-[#141414]/5 border border-[#141414]/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#141414]/40"
                >
                  {reports.map(r => (
                    <option key={r.id} value={r.id}>{r.filename}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                placeholder="SEARCH PROPERTIES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414]/5 border-b-2 border-[#141414] pl-10 pr-32 py-3 text-sm font-mono focus:outline-none focus:bg-[#141414]/10 transition-all placeholder:opacity-30 uppercase tracking-wider"
              />
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-2 py-1 rounded-sm shadow-lg">
                  <span className="text-[10px] font-mono font-bold">
                    {searchIndex + 1}/{searchResults.length}
                  </span>
                  <div className="flex border-l border-white/20 ml-1 pl-1">
                    <button
                      onClick={() => setSearchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length)}
                      className="p-1 hover:bg-white/10 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3 rotate-180" />
                    </button>
                    <button
                      onClick={() => setSearchIndex(prev => (prev + 1) % searchResults.length)}
                      className="p-1 hover:bg-white/10 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-serif italic text-xl">Structure</h2>
              <div className="flex gap-2">
                <div className="flex bg-[#141414]/5 p-1 rounded-sm mr-2">
                  <button
                    onClick={() => setDataViewMode('tree')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold uppercase transition-all",
                      dataViewMode === 'tree' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/10"
                    )}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setDataViewMode('flat')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold uppercase transition-all",
                      dataViewMode === 'flat' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/10"
                    )}
                  >
                    Flat
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 h-full">
            {dataViewMode === 'tree' ? (
              <CascadingDataView
                data={data}
                schema={schema}
                navigationPath={dataNavigationPath}
                onNavigate={handleDataNavigate}
                onSelect={setSelectedPath}
                selectedPath={selectedPath}
                searchQuery={searchQuery}
              />
            ) : (
              <div className="grid grid-cols-1 gap-1 overflow-y-auto h-full">
                {flatData
                  .filter(item => !searchQuery || item.path.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 hover:bg-[#141414]/5 border-b border-[#141414]/5 group cursor-pointer"
                    onClick={() => setSelectedPath(item.path)}
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono opacity-30 uppercase">{item.path}</span>
                      <span className="text-xs font-bold">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono bg-[#141414]/5 px-2 py-1 rounded-sm group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-all truncate max-w-[200px]">
                      {typeof item.value === 'object' ? (Array.isArray(item.value) ? `[${item.value.length}]` : '{...}') : String(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Right Panel: Inspector */}
      <aside className="w-full lg:w-[450px] bg-[#141414] text-[#E4E3E0] overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-[#E4E3E0]/10">
          <div className="flex items-center gap-2 mb-4 opacity-50">
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Inspector</span>
          </div>

          {selectedPath ? (
            <Inspector path={selectedPath} schema={schema} data={data} />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center opacity-30">
              <Layout className="w-12 h-12 mb-4 stroke-[1]" />
              <p className="text-xs font-mono uppercase">Select a node to inspect its properties</p>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 font-mono text-[11px]">
          <div className="flex items-center justify-between mb-4">
            <span className="opacity-50 uppercase tracking-widest">Raw Source</span>
            <button className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Copy className="w-3 h-3" />
              <span className="uppercase">Copy</span>
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-all opacity-70 leading-relaxed">
            {data ? yaml.dump(data) : ''}
          </pre>
        </div>
      </aside>
    </main>
  );
}
