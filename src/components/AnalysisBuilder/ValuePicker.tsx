import React, { useState } from 'react';
import { useAnalysis } from '../../state/analysis-store';

interface ValuePickerProps {
  path: string;
  values: any[];
  onApply: (selected: any[]) => void;
}

export default function ValuePicker({ path, values, onApply }: ValuePickerProps) {
  const { state } = useAnalysis();

  // Initialize from current filter if one exists
  const existingFilter = state.scenarioFilters.find(f => f.path === path);
  const initialSelected = existingFilter?.values
    ? new Set<any>(existingFilter.values)
    : new Set<any>(values);

  const [selected, setSelected] = useState<Set<any>>(initialSelected);

  const toggleValue = (val: any) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
      } else {
        next.add(val);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(values));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={selectAll}
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[#141414]/20 rounded-sm hover:bg-[#141414]/5 transition-colors"
        >
          Select All
        </button>
        <button
          onClick={clearAll}
          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[#141414]/20 rounded-sm hover:bg-[#141414]/5 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="max-h-[180px] overflow-y-auto space-y-1">
        {values.map((val, i) => (
          <label
            key={`${val}-${i}`}
            className="flex items-center gap-2 text-xs cursor-pointer py-0.5 px-1 rounded-sm hover:bg-[#141414]/5"
          >
            <input
              type="checkbox"
              checked={selected.has(val)}
              onChange={() => toggleValue(val)}
              className="accent-[#141414]"
            />
            <span className="font-mono truncate">{String(val)}</span>
          </label>
        ))}
      </div>

      <button
        onClick={() => onApply(Array.from(selected))}
        disabled={selected.size === 0}
        className="mt-3 w-full text-xs font-mono uppercase tracking-wider py-1.5 bg-[#141414] text-[#E4E3E0] rounded-sm hover:bg-[#141414]/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Apply
      </button>
    </div>
  );
}
