import React, { useState } from 'react';
import type { UnifiedColumn } from '../../data/types';
import { useAnalysis, getRoleForPath } from '../../state/analysis-store';
import { X } from 'lucide-react';
import ValuePicker from './ValuePicker';
import RangePicker from './RangePicker';

interface RolePopoverProps {
  path: string;
  column: UnifiedColumn;
  onClose: () => void;
}

type RoleOption = 'filter' | 'key' | 'x-axis' | 'y-axis' | 'y2-axis' | 'none';

const roleOptions: { value: RoleOption; label: string }[] = [
  { value: 'filter', label: 'Scenario Filter' },
  { value: 'key', label: 'Configuration Key' },
  { value: 'x-axis', label: 'X-axis' },
  { value: 'y-axis', label: 'Y-axis' },
  { value: 'y2-axis', label: 'Y2 (Pareto)' },
  { value: 'none', label: 'None' },
];

export default function RolePopover({ path, column, onClose }: RolePopoverProps) {
  const { state, dispatch } = useAnalysis();
  const currentRole = getRoleForPath(state, path) as RoleOption | null;
  const [selectedRole, setSelectedRole] = useState<RoleOption>(currentRole ?? 'none');

  const clearCurrentRole = () => {
    if (currentRole === 'filter') {
      dispatch({ type: 'REMOVE_SCENARIO_FILTER', path });
    } else if (currentRole === 'key') {
      dispatch({ type: 'REMOVE_CONFIG_KEY', path });
    } else if (currentRole === 'x-axis') {
      dispatch({ type: 'SET_X_AXIS', path: null });
    } else if (currentRole === 'y-axis') {
      dispatch({ type: 'SET_Y_AXIS', path: null });
    } else if (currentRole === 'y2-axis') {
      dispatch({ type: 'SET_Y2_AXIS', path: null });
    }
  };

  const applyRole = (role: RoleOption) => {
    // Clear the previous role first
    clearCurrentRole();

    if (role === 'none') {
      // Already cleared
    } else if (role === 'filter') {
      // Filter will be applied via ValuePicker/RangePicker
      // Don't dispatch yet -- wait for sub-picker apply
    } else if (role === 'key') {
      dispatch({ type: 'ADD_CONFIG_KEY', path });
    } else if (role === 'x-axis') {
      dispatch({ type: 'SET_X_AXIS', path });
    } else if (role === 'y-axis') {
      dispatch({ type: 'SET_Y_AXIS', path });
    } else if (role === 'y2-axis') {
      dispatch({ type: 'SET_Y2_AXIS', path });
    }

    setSelectedRole(role);
  };

  const handleFilterApplyValues = (selected: any[]) => {
    dispatch({
      type: 'ADD_SCENARIO_FILTER',
      filter: { path, type: 'exact', values: selected },
    });
    onClose();
  };

  const handleFilterApplyRange = (min: number, max: number) => {
    dispatch({
      type: 'ADD_SCENARIO_FILTER',
      filter: { path, type: 'range', range: { min, max } },
    });
    onClose();
  };

  return (
    <div className="absolute left-8 top-full z-50 bg-white border border-[#141414]/20 shadow-xl p-4 rounded-sm min-w-[280px]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-xs font-semibold">{path}</p>
          <p className="text-[11px] opacity-50 mt-0.5">Type: {column.type}</p>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-[#141414]/10 rounded-sm transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs space-y-1 mb-3 border-b border-[#141414]/10 pb-3">
        <p>
          Availability: {column.availableIn}/{column.totalReports} reports
        </p>
        {column.type === 'number' && column.range && (
          <p>
            Range: {column.range[0]} &ndash; {column.range[1]}
          </p>
        )}
        {column.type === 'string' && column.uniqueValues && (
          <p>{column.uniqueValues.length} unique values</p>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        <p className="text-[10px] font-mono uppercase tracking-wider opacity-50 mb-2">
          Assign Role
        </p>
        {roleOptions.map(opt => (
          <label
            key={opt.value}
            className="flex items-center gap-2 text-xs cursor-pointer py-0.5 hover:bg-[#141414]/5 px-1 rounded-sm"
          >
            <input
              type="radio"
              name={`role-${path}`}
              value={opt.value}
              checked={selectedRole === opt.value}
              onChange={() => applyRole(opt.value)}
              className="accent-[#141414]"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {selectedRole === 'filter' && column.type === 'string' && column.uniqueValues && (
        <div className="border-t border-[#141414]/10 pt-3">
          <ValuePicker
            path={path}
            values={column.uniqueValues}
            onApply={handleFilterApplyValues}
          />
        </div>
      )}

      {selectedRole === 'filter' && column.type === 'number' && column.range && (
        <div className="border-t border-[#141414]/10 pt-3">
          <RangePicker
            path={path}
            min={column.range[0]}
            max={column.range[1]}
            values={column.uniqueValues as number[] ?? []}
            onApply={handleFilterApplyRange}
          />
        </div>
      )}
    </div>
  );
}
