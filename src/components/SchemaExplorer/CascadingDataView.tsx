import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { JsonSchema } from '../../types';

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

export const getSchemaForPath = (path: string, schema: JsonSchema | null): JsonSchema | null => {
  if (!schema) return null;
  const parts = path.split('.');
  let current: any = schema;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (current.$ref) current = resolveRef(current.$ref, schema);
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

interface CascadingDataViewProps {
  data: any;
  schema: JsonSchema | null;
  navigationPath: string[];
  onNavigate: (key: string, depth: number) => void;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  searchQuery?: string;
}

export default function CascadingDataView({
  data, schema, navigationPath, onNavigate, onSelect, selectedPath, searchQuery
}: CascadingDataViewProps) {
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
        <div key={col.path} className="flex-shrink-0 w-80 border-r border-[#141414]/10 h-full flex flex-col">
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
                    onClick={() => { onSelect(itemPath); if (!isLeaf) onNavigate(key, depth); }}
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
                        <span className={cn("text-xs font-mono font-bold truncate pr-2", isSearchMatch && !isSelected && !isActive && "text-yellow-700")}>{key}</span>
                        {itemSchema?.title && itemSchema.title !== key && (
                          <span className="text-[9px] opacity-40 uppercase tracking-tighter">{itemSchema.title}</span>
                        )}
                      </div>
                      {!isLeaf && <ChevronRight className={cn("w-3 h-3 opacity-40", isSelected && "opacity-100")} />}
                    </div>
                    {itemSchema?.description && (
                      <p className={cn(
                        "text-[10px] font-serif italic mb-2 leading-tight line-clamp-2 group-hover:line-clamp-none transition-all",
                        isSearchMatch && !isSelected && !isActive && itemSchema.description.toLowerCase().includes(searchQuery!.toLowerCase()) ? "text-yellow-700 opacity-100" : "opacity-50"
                      )}>{itemSchema.description}</p>
                    )}
                    {isLeaf ? (
                      <div className="text-[11px] font-mono opacity-60 break-all line-clamp-2">{String(value)}</div>
                    ) : (
                      <div className="text-[9px] font-mono opacity-40 uppercase tracking-tighter">
                        {Array.isArray(value) ? `${value.length} items` : `${Object.keys(value as object).length} properties`}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.keys(value as object).slice(0, 3).map(k => (
                            <span key={k} className="px-1 bg-[#141414]/5 rounded-[1px]">{k}</span>
                          ))}
                          {Object.keys(value as object).length > 3 && <span>...</span>}
                        </div>
                      </div>
                    )}
                    {isSelected && <div className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-[10px] h-[1px] bg-[#141414] z-10" />}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center opacity-30 italic text-xs font-serif">Leaf node value: {String(col.data)}</div>
            )}
          </div>
        </div>
      ))}
      {typeof columns[columns.length - 1].data === 'object' && columns[columns.length - 1].data !== null && (
        <div className="flex-shrink-0 w-80 h-full border-r border-[#141414]/5 opacity-20 flex items-center justify-center">
          <div className="text-[10px] font-mono uppercase tracking-widest vertical-text opacity-30">Next Level</div>
        </div>
      )}
    </div>
  );
}
