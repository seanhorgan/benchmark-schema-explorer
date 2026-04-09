import React, { useCallback, useRef, useState, useMemo } from 'react';
// @ts-ignore - no types for react-plotly.js
import Plot from 'react-plotly.js';
import { X, Plus } from 'lucide-react';

interface HistogramPanelProps {
  columnPath: string;
  values: number[];
  splits: number[];
  onSplitsChange: (splits: number[]) => void;
  onClose: () => void;
}

export default function HistogramPanel({
  columnPath,
  values,
  splits,
  onSplitsChange,
  onClose,
}: HistogramPanelProps) {
  const splitsRef = useRef(splits);
  splitsRef.current = splits;

  const [newSplitValue, setNewSplitValue] = useState('');

  const handleAddSplit = useCallback(() => {
    const num = Number(newSplitValue);
    if (isNaN(num)) return;
    if (splits.some((s) => Math.abs(s - num) < 1e-9)) return;
    onSplitsChange([...splits, num]);
    setNewSplitValue('');
  }, [newSplitValue, splits, onSplitsChange]);

  const handleAddSplitKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAddSplit();
    },
    [handleAddSplit],
  );

  // Handle shape drags via onRelayout
  const handleRelayout = useCallback(
    (layoutUpdate: any) => {
      if (!layoutUpdate) return;
      const newSplits = [...splitsRef.current].sort((a, b) => a - b);
      let changed = false;

      for (const key of Object.keys(layoutUpdate)) {
        const match = key.match(/^shapes\[(\d+)\]\.x0$/);
        if (match) {
          const idx = parseInt(match[1]);
          if (idx < newSplits.length) {
            newSplits[idx] = layoutUpdate[key];
            changed = true;
          }
        }
      }

      if (changed) onSplitsChange(newSplits);
    },
    [onSplitsChange],
  );

  const handleSplitValueChange = useCallback(
    (index: number, value: string) => {
      const num = Number(value);
      if (isNaN(num)) return;
      const sorted = [...splits].sort((a, b) => a - b);
      sorted[index] = num;
      onSplitsChange(sorted);
    },
    [splits, onSplitsChange],
  );

  const handleRemoveSplit = useCallback(
    (index: number) => {
      const sorted = [...splits].sort((a, b) => a - b);
      onSplitsChange(sorted.filter((_, i) => i !== index));
    },
    [splits, onSplitsChange],
  );

  const sortedSplits = useMemo(
    () => [...splits].sort((a, b) => a - b),
    [splits],
  );

  const shapes = sortedSplits.map((s) => ({
    type: 'line' as const,
    x0: s,
    x1: s,
    y0: 0,
    y1: 1,
    yref: 'paper' as const,
    line: { color: '#f97316', width: 2, dash: 'dash' as const },
    editable: true,
  }));

  const columnName = columnPath.split('.').pop() ?? columnPath;

  return (
    <div className="w-[350px] bg-[#141414] border-l border-[#141414] p-5 flex flex-col gap-4 flex-shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-wider text-orange-400">
          {columnName}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-sm transition-colors"
        >
          <X size={14} className="text-[#E4E3E0]" />
        </button>
      </div>

      <p className="text-[10px] font-mono text-[#E4E3E0]/40">
        Distribution across all filtered rows ({values.length} values)
      </p>

      <div className="bg-[#1a1a1a] rounded-sm overflow-hidden">
        <Plot
          data={[
            {
              x: values,
              type: 'histogram',
              marker: { color: '#555' },
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 40, r: 10, t: 10, b: 30 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'rgba(0,0,0,0.02)',
            font: { family: 'monospace', size: 10, color: '#888' },
            xaxis: { color: '#666' },
            yaxis: { color: '#666', title: { text: 'count' } },
            shapes,
            dragmode: false,
          }}
          config={{
            responsive: true,
            displayModeBar: false,
            doubleClick: false,
            editable: false,
            edits: { shapePosition: true },
          }}
          useResizeHandler
          style={{ width: '100%', height: '180px' }}
          onRelayout={handleRelayout}
        />
      </div>

      {/* Add split input */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#E4E3E0]/40 mb-2">
          Add Split
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={newSplitValue}
            onChange={(e) => setNewSplitValue(e.target.value)}
            onKeyDown={handleAddSplitKeyDown}
            placeholder="Enter value..."
            className="flex-1 bg-white/5 border border-white/10 rounded-sm px-3 py-1.5 text-[11px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleAddSplit}
            disabled={newSplitValue === '' || isNaN(Number(newSplitValue))}
            className="p-1.5 bg-orange-500/20 hover:bg-orange-500/30 rounded-sm transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <Plus size={14} className="text-orange-400" />
          </button>
        </div>
      </div>

      {/* Existing split boundary inputs */}
      {sortedSplits.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#E4E3E0]/40">
            Split Boundaries
          </p>
          {sortedSplits.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                value={s}
                onChange={(e) => handleSplitValueChange(i, e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-sm px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-white/30"
              />
              <button
                onClick={() => handleRemoveSplit(i)}
                className="p-1 hover:bg-white/10 rounded-sm transition-colors text-orange-400"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
