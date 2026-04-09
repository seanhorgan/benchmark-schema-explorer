import React, { useState } from 'react';
import { useAnalysis } from '../../state/analysis-store';

interface RangePickerProps {
  path: string;
  min: number;
  max: number;
  values: number[];
  onApply: (min: number, max: number) => void;
}

function buildHistogram(values: number[], min: number, max: number, bins: number = 10) {
  const counts = new Array(bins).fill(0);
  if (max === min) {
    // All values are the same
    counts[0] = values.length;
    return counts;
  }
  const binWidth = (max - min) / bins;
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  return counts;
}

export default function RangePicker({ path, min, max, values, onApply }: RangePickerProps) {
  const { state } = useAnalysis();

  // Initialize from current filter if one exists
  const existingFilter = state.scenarioFilters.find(f => f.path === path);
  const [localMin, setLocalMin] = useState<number>(existingFilter?.range?.min ?? min);
  const [localMax, setLocalMax] = useState<number>(existingFilter?.range?.max ?? max);

  const BIN_COUNT = 10;
  const counts = buildHistogram(values, min, max, BIN_COUNT);
  const maxCount = Math.max(...counts, 1);

  return (
    <div>
      {/* Mini histogram */}
      <div className="flex items-end gap-px h-16 mb-3">
        {counts.map((count, i) => (
          <div
            key={i}
            className="flex-1 bg-[#141414]/20 rounded-t-sm transition-all"
            style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '2px' : '0px' }}
            title={`${count} values`}
          />
        ))}
      </div>

      {/* Range inputs */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          <label className="text-[10px] font-mono uppercase tracking-wider opacity-50 block mb-1">
            Min
          </label>
          <input
            type="number"
            value={localMin}
            onChange={e => setLocalMin(Number(e.target.value))}
            className="w-full text-xs font-mono px-2 py-1.5 border border-[#141414]/20 rounded-sm focus:outline-none focus:border-[#141414]/50"
          />
        </div>
        <span className="text-xs opacity-30 mt-4">&ndash;</span>
        <div className="flex-1">
          <label className="text-[10px] font-mono uppercase tracking-wider opacity-50 block mb-1">
            Max
          </label>
          <input
            type="number"
            value={localMax}
            onChange={e => setLocalMax(Number(e.target.value))}
            className="w-full text-xs font-mono px-2 py-1.5 border border-[#141414]/20 rounded-sm focus:outline-none focus:border-[#141414]/50"
          />
        </div>
      </div>

      <button
        onClick={() => onApply(localMin, localMax)}
        disabled={localMin > localMax}
        className="w-full text-xs font-mono uppercase tracking-wider py-1.5 bg-[#141414] text-[#E4E3E0] rounded-sm hover:bg-[#141414]/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Apply
      </button>
    </div>
  );
}
