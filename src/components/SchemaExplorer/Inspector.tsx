import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { JsonSchema } from '../../types';
import { getSchemaForPath } from './CascadingDataView';

interface InspectorProps {
  path: string;
  schema: JsonSchema | null;
  data: any;
}

export default function Inspector({ path, schema, data }: InspectorProps) {
  const parts = path.split('.');
  const nodeName = parts[parts.length - 1];

  const nodeSchema = useMemo(() => getSchemaForPath(path, schema), [path, schema]);

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

  const rawSource = useMemo(() => {
    if (!data) return "";
    const fullJson = JSON.stringify(data, null, 2);
    if (!path || path === 'root') return fullJson;
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
            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-sm uppercase">{nodeSchema.format}</span>
          )}
        </div>
        {nodeSchema.description && (
          <p className="text-sm font-serif italic opacity-70 leading-relaxed">{nodeSchema.description}</p>
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
          {nodeSchema.minLength !== undefined && <div><span className="opacity-40 uppercase block mb-1">Min Length</span><span>{nodeSchema.minLength}</span></div>}
          {nodeSchema.maxLength !== undefined && <div><span className="opacity-40 uppercase block mb-1">Max Length</span><span>{nodeSchema.maxLength}</span></div>}
          {nodeSchema.minimum !== undefined && <div><span className="opacity-40 uppercase block mb-1">Minimum</span><span>{nodeSchema.minimum}</span></div>}
          {nodeSchema.maximum !== undefined && <div><span className="opacity-40 uppercase block mb-1">Maximum</span><span>{nodeSchema.maximum}</span></div>}
          {nodeSchema.pattern && (
            <div className="col-span-2"><span className="opacity-40 uppercase block mb-1">Pattern</span><code className="bg-white/5 p-1 rounded-sm block break-all">{nodeSchema.pattern}</code></div>
          )}
          {nodeSchema.enum && (
            <div className="col-span-2">
              <span className="opacity-40 uppercase block mb-1">Allowed Values</span>
              <div className="flex flex-wrap gap-2">
                {nodeSchema.enum.map((val, i) => <span key={i} className="bg-white/10 px-2 py-0.5 rounded-sm">{String(val)}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 border-b border-white/10 pb-2">Raw Source</h4>
        <div className="bg-black/40 p-4 rounded-sm border border-white/5 h-96 overflow-y-auto custom-scrollbar">{rawSource}</div>
      </div>
    </div>
  );
}
