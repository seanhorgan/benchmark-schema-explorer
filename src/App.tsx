/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as yaml from 'js-yaml';
import { 
  ChevronRight, 
  ChevronDown, 
  FileJson, 
  FileCode, 
  Search, 
  Layout, 
  Database, 
  Info,
  ExternalLink,
  Copy,
  Check,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { JsonSchema, SchemaNode } from './types';

// Use local files in production (Cloud Run)
const DEFAULT_SCHEMA_URL = process.env.NODE_ENV === "production"
  ? "/br_v0_2_json_schema.json"
  : "https://raw.githubusercontent.com/llm-d/llm-d-benchmark/main/benchmark_report/br_v0_2_json_schema.json";
const DEFAULT_DATA_URL = process.env.NODE_ENV === "production"
  ? "/br_v0_2_example.yaml"
  : "https://raw.githubusercontent.com/llm-d/llm-d-benchmark/main/benchmark_report/br_v0_2_example.yaml";

const resolveRef = (ref: string, root: any): any => {
  if (!ref.startsWith('#/')) return {};
  const refParts = ref.split('/').slice(1);
  let curr = root;
  for (const p of refParts) {
    curr = curr[p];
    if (!curr) return {};
  }
  return curr;
};

const getSchemaForPath = (path: string, schema: JsonSchema | null): JsonSchema | null => {
  if (!schema) return null;
  const parts = path.split('.');
  let current: any = schema;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (current.$ref) current = resolveRef(current.$ref, schema);
    
    // Handle anyOf/oneOf
    const options = current.anyOf || current.oneOf || (current.allOf ? [current] : null);
    if (options) {
      const found = options.find((s: any) => {
        const resolved = s.$ref ? resolveRef(s.$ref, schema) : s;
        return resolved.properties && resolved.properties[part];
      });
      if (found) current = found.$ref ? resolveRef(found.$ref, schema) : found;
    }

    if (current.properties && current.properties[part]) {
      current = current.properties[part];
    } else if (current.items && !Array.isArray(current.items)) {
      current = current.items;
    } else {
      return null;
    }
  }
  if (current?.$ref) current = resolveRef(current.$ref, schema);
  return current;
};

export default function App() {
  const [schema, setSchema] = useState<JsonSchema | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataViewMode, setDataViewMode] = useState<'tree' | 'flat'>('tree');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [dataNavigationPath, setDataNavigationPath] = useState<string[]>([]);

  // Key metrics to highlight
  const keyMetrics = useMemo(() => {
    if (!data) return [];
    const highlights: { label: string; value: any; path: string }[] = [];
    
    // Helper to find value by path
    const getValue = (obj: any, path: string) => {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const metricsToFind = [
      { label: 'Model Name', path: 'system_inputs.model_config.model_name' },
      { label: 'Precision', path: 'system.inputs.model_config.precision' },
      { label: 'Framework', path: 'system.inputs.framework_config.framework_name' },
      { label: 'Hardware', path: 'system.inputs.hardware_config.hardware_name' },
      { label: 'Total Requests', path: 'workload.total_requests' },
      { label: 'Avg TTFT (ms)', path: 'results.ttft.avg' },
      { label: 'P99 TTFT (ms)', path: 'results.ttft.p99' },
      { label: 'Avg TPOT (ms)', path: 'results.tpot.avg' },
      { label: 'Throughput (req/s)', path: 'results.throughput.req_per_sec' },
    ];

    metricsToFind.forEach(m => {
      const val = getValue(data, m.path);
      if (val !== undefined) {
        highlights.push({ label: m.label, value: val, path: m.path });
      }
    });

    return highlights;
  }, [data]);

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
        // For Miller columns, we want to show the column that contains the match.
        // If it's a leaf, we want to show the parent's children.
        // If it's an object, we want to show its children (so it's selected in its parent column).
        const navPath = pathParts.slice(1, -1); 
        setDataNavigationPath(navPath);
        setSelectedPath(match.path);
      }
    }
  }, [searchIndex, searchResults, dataViewMode]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [schemaRes, dataRes] = await Promise.all([
          fetch(DEFAULT_SCHEMA_URL),
          fetch(DEFAULT_DATA_URL)
        ]);

        if (!schemaRes.ok) throw new Error("Failed to fetch schema");
        if (!dataRes.ok) throw new Error("Failed to fetch example data");

        const schemaJson = await schemaRes.json();
        const dataYaml = await dataRes.text();
        const dataJson = yaml.load(dataYaml);

        setSchema(schemaJson);
        setData(dataJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDataNavigate = (key: string, depth: number) => {
    setDataNavigationPath(prev => {
      const next = prev.slice(0, depth);
      next.push(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm tracking-widest uppercase opacity-50">Initializing Schema Explorer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-mono p-8">
        <div className="max-w-md w-full border border-red-500/50 p-6 bg-red-500/5">
          <h2 className="text-red-500 font-bold mb-2 uppercase tracking-tighter">Initialization Error</h2>
          <p className="text-sm opacity-80 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase hover:bg-red-600 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-4 flex items-center justify-between sticky top-0 bg-[#E4E3E0] z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#141414] flex items-center justify-center">
            <Layout className="w-5 h-5 text-[#E4E3E0]" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tighter uppercase">Schema Explorer</h1>
            <p className="text-[10px] opacity-50 uppercase font-mono tracking-wider">v0.2.0 / LLM-D Benchmark</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/llm-d/llm-d-benchmark" 
            target="_blank" 
            rel="noreferrer"
            className="p-2 hover:bg-[#141414]/5 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden">
        {/* Left Panel: Tree Explorer */}
        <section className="flex-1 overflow-hidden border-r border-[#141414]">
          <div className="p-6 h-full flex flex-col">
            <div className="mb-8">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input 
                  type="text"
                  placeholder="SEARCH BENCHMARK PROPERTIES..."
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
                <button className="p-1.5 border border-[#141414]/20 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all">
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 border border-[#141414]/20 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

            {keyMetrics.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 mb-4">Key Highlights</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {keyMetrics.map((m, i) => (
                    <div 
                      key={i} 
                      className="bg-[#141414] text-[#E4E3E0] p-4 border-l-4 border-white/20 hover:border-white transition-all cursor-pointer"
                      onClick={() => setSelectedPath(m.path)}
                    >
                      <span className="text-[9px] font-mono uppercase opacity-50 block mb-1">{m.label}</span>
                      <span className="text-lg font-bold tracking-tighter truncate block">
                        {typeof m.value === 'number' ? m.value.toLocaleString() : String(m.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <div className="grid grid-cols-1 gap-1">
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
                        <span className="text-xs font-mono bg-[#141414]/5 px-2 py-1 rounded-sm group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-all">
                          {String(item.value)}
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
              {yaml.dump(data)}
            </pre>
          </div>
        </aside>
      </main>
    </div>
  );
}

function CascadingDataView({ 
  data, 
  schema,
  navigationPath, 
  onNavigate,
  onSelect,
  selectedPath,
  searchQuery
}: { 
  data: any; 
  schema: JsonSchema | null;
  navigationPath: string[]; 
  onNavigate: (key: string, depth: number) => void;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  searchQuery?: string;
}) {
  const columns = useMemo(() => {
    const cols = [{ name: 'root', data, path: 'root' }];
    let current = data;
    let currentPath = 'root';

    for (let i = 0; i < navigationPath.length; i++) {
      const key = navigationPath[i];
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
        currentPath = `${currentPath}.${key}`;
        cols.push({ name: key, data: current, path: currentPath });
      } else {
        break;
      }
    }
    return cols;
  }, [data, navigationPath]);

  return (
    <div className="flex h-full overflow-x-auto custom-scrollbar pb-4 gap-0 items-start">
      {columns.map((col, depth) => (
        <div 
          key={col.path} 
          className="flex-shrink-0 w-80 border-r border-[#141414]/10 h-full flex flex-col"
        >
          <div className="px-4 py-2 bg-[#141414]/5 border-b border-[#141414]/10 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase opacity-40">{col.name}</span>
            <span className="text-[9px] font-mono opacity-30">
              {Array.isArray(col.data) ? `Array(${col.data.length})` : typeof col.data === 'object' ? 'Object' : typeof col.data}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {typeof col.data === 'object' && col.data !== null ? (
              Object.entries(col.data).map(([key, value]) => {
                const itemPath = `${col.path}.${key}`;
                const isSelected = navigationPath[depth] === key;
                const isLeaf = typeof value !== 'object' || value === null;
                const isActive = selectedPath === itemPath;
                const itemSchema = getSchemaForPath(itemPath, schema);
                const isSearchMatch = searchQuery && (
                  key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  itemPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (itemSchema?.description && itemSchema.description.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                return (
                  <div 
                    key={key}
                    onClick={() => {
                      onSelect(itemPath);
                      if (!isLeaf) onNavigate(key, depth);
                    }}
                    className={cn(
                      "relative group p-3 border transition-all cursor-pointer",
                      isSelected || isActive
                        ? "bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-lg translate-x-1" 
                        : isSearchMatch 
                          ? "bg-yellow-500/10 border-yellow-500/50 hover:bg-yellow-500/20"
                          : "bg-white/50 border-[#141414]/10 hover:border-[#141414]/30 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-xs font-mono font-bold truncate pr-2",
                          isSearchMatch && !isSelected && !isActive && "text-yellow-700"
                        )}>{key}</span>
                        {itemSchema?.title && itemSchema.title !== key && (
                          <span className="text-[9px] opacity-40 uppercase tracking-tighter">{itemSchema.title}</span>
                        )}
                      </div>
                      {!isLeaf && (
                        <ChevronRight className={cn("w-3 h-3 opacity-40", isSelected && "opacity-100")} />
                      )}
                    </div>

                    {itemSchema?.description && (
                      <p className={cn(
                        "text-[10px] font-serif italic mb-2 leading-tight line-clamp-2 group-hover:line-clamp-none transition-all",
                        isSearchMatch && !isSelected && !isActive && itemSchema.description.toLowerCase().includes(searchQuery.toLowerCase()) ? "text-yellow-700 opacity-100" : "opacity-50"
                      )}>
                        {itemSchema.description}
                      </p>
                    )}

                    {isLeaf ? (
                      <div className="text-[11px] font-mono opacity-60 break-all line-clamp-2">
                        {String(value)}
                      </div>
                    ) : (
                      <div className="text-[9px] font-mono opacity-40 uppercase tracking-tighter">
                        {Array.isArray(value) 
                          ? `${value.length} items` 
                          : `${Object.keys(value).length} properties`}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.keys(value).slice(0, 3).map(k => (
                            <span key={k} className="px-1 bg-[#141414]/5 rounded-[1px]">{k}</span>
                          ))}
                          {Object.keys(value).length > 3 && <span>...</span>}
                        </div>
                      </div>
                    )}

                    {/* Visual Connector Line */}
                    {isSelected && (
                      <div className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-[10px] h-[1px] bg-[#141414] z-10" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center opacity-30 italic text-xs font-serif">
                Leaf node value: {String(col.data)}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Visual placeholder for next level */}
      {typeof columns[columns.length - 1].data === 'object' && columns[columns.length - 1].data !== null && (
        <div className="flex-shrink-0 w-80 h-full border-r border-[#141414]/5 opacity-20 flex items-center justify-center">
          <div className="text-[10px] font-mono uppercase tracking-widest vertical-text opacity-30">
            Next Level
          </div>
        </div>
      )}
    </div>
  );
}

function Inspector({ path, schema, data }: { path: string; schema: JsonSchema | null; data: any }) {
  const parts = path.split('.');
  const nodeName = parts[parts.length - 1];
  
  // Find the schema for this path
  const nodeSchema = useMemo(() => {
    return getSchemaForPath(path, schema);
  }, [path, schema]);

  // Get the actual data value for this path
  const nodeValue = useMemo(() => {
    if (!data) return null;
    let current = data;
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }, [path, data]);

  // Generate raw source with highlighting
  const rawSource = useMemo(() => {
    if (!data) return "";
    const fullJson = JSON.stringify(data, null, 2);
    if (!path || path === 'root') return fullJson;

    // Very simple highlighting: find the key in the JSON
    // This is a heuristic but works for most cases in this demo
    const searchKey = `"${nodeName}":`;
    const lines = fullJson.split('\n');
    return lines.map((line, i) => {
      const isHighlighted = line.includes(searchKey);
      return (
        <div key={i} className={cn("whitespace-pre font-mono text-[10px]", isHighlighted && "bg-yellow-500/20 text-yellow-200 -mx-2 px-2 border-l-2 border-yellow-500")}>
          {line}
        </div>
      );
    });
  }, [data, path, nodeName]);

  if (!nodeSchema) return null;

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h3 className="text-2xl font-bold tracking-tighter uppercase mb-1">{nodeName}</h3>
        <div className="flex gap-2 mb-4">
          <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-sm uppercase">
            {Array.isArray(nodeSchema.type) ? nodeSchema.type.join(' | ') : (nodeSchema.type || 'object')}
          </span>
          {nodeSchema.format && (
            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-sm uppercase">
              {nodeSchema.format}
            </span>
          )}
        </div>
        {nodeSchema.description && (
          <p className="text-sm font-serif italic opacity-70 leading-relaxed">
            {nodeSchema.description}
          </p>
        )}
      </header>

      {nodeValue !== undefined && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 border-b border-white/10 pb-2">Current Value</h4>
          <div className="bg-white/5 p-4 rounded-sm border border-white/10">
            <pre className="text-xs font-mono break-all whitespace-pre-wrap">
              {typeof nodeValue === 'object' ? JSON.stringify(nodeValue, null, 2) : String(nodeValue)}
            </pre>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 border-b border-white/10 pb-2">Constraints</h4>
        <div className="grid grid-cols-2 gap-4 text-[11px] font-mono">
          {nodeSchema.minLength !== undefined && (
            <div>
              <span className="opacity-40 uppercase block mb-1">Min Length</span>
              <span>{nodeSchema.minLength}</span>
            </div>
          )}
          {nodeSchema.maxLength !== undefined && (
            <div>
              <span className="opacity-40 uppercase block mb-1">Max Length</span>
              <span>{nodeSchema.maxLength}</span>
            </div>
          )}
          {nodeSchema.minimum !== undefined && (
            <div>
              <span className="opacity-40 uppercase block mb-1">Minimum</span>
              <span>{nodeSchema.minimum}</span>
            </div>
          )}
          {nodeSchema.maximum !== undefined && (
            <div>
              <span className="opacity-40 uppercase block mb-1">Maximum</span>
              <span>{nodeSchema.maximum}</span>
            </div>
          )}
          {nodeSchema.pattern && (
            <div className="col-span-2">
              <span className="opacity-40 uppercase block mb-1">Pattern</span>
              <code className="bg-white/5 p-1 rounded-sm block break-all">{nodeSchema.pattern}</code>
            </div>
          )}
          {nodeSchema.enum && (
            <div className="col-span-2">
              <span className="opacity-40 uppercase block mb-1">Allowed Values</span>
              <div className="flex flex-wrap gap-2">
                {nodeSchema.enum.map((val, i) => (
                  <span key={i} className="bg-white/10 px-2 py-0.5 rounded-sm">{String(val)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 border-b border-white/10 pb-2">Raw Source</h4>
        <div className="bg-black/40 p-4 rounded-sm border border-white/5 h-96 overflow-y-auto custom-scrollbar">
          {rawSource}
        </div>
      </div>
    </div>
  );
}
