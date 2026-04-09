import React, { useState, useRef } from 'react';
import { useAnalysis } from '../../state/analysis-store';
import { exportAnalysisConfig, importAnalysisConfig } from '../../data/loader';
import type { AnalysisConfig } from '../../data/types';
import { X, Save, Upload, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AnalysisConfig() {
  const { state, dispatch, filteredRows, traceCount } = useAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [configName, setConfigName] = useState('');
  const [savedConfigs, setSavedConfigs] = useState<AnalysisConfig[]>([]);
  const [activeConfigName, setActiveConfigName] = useState<string | null>(null);

  const canGeneratePlot = state.xAxis && state.yAxis;
  const hasConfig = state.scenarioFilters.length > 0 || state.configKeys.length > 0 || state.xAxis || state.yAxis;

  function handleSave() {
    const name = configName.trim() || 'Untitled';
    const yamlStr = exportAnalysisConfig(state, name);

    // Download as file
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.yaml`;
    a.click();
    URL.revokeObjectURL(url);

    // Also add to session list
    const config = importAnalysisConfig(yamlStr);
    setSavedConfigs(prev => {
      const filtered = prev.filter(c => c.name !== config.name);
      return [config, ...filtered];
    });
    setActiveConfigName(config.name);
  }

  async function handleLoadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const config = importAnalysisConfig(text);
      dispatch({ type: 'LOAD_CONFIG', config });
      setSavedConfigs(prev => {
        const filtered = prev.filter(c => c.name !== config.name);
        return [config, ...filtered];
      });
      setActiveConfigName(config.name);
      setConfigName(config.name);
    } catch (err) {
      alert(`Failed to load config: ${(err as Error).message}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSelectConfig(config: AnalysisConfig) {
    dispatch({ type: 'LOAD_CONFIG', config });
    setActiveConfigName(config.name);
    setConfigName(config.name);
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="font-serif italic text-xl text-[#E4E3E0]">Analysis Configuration</h2>

      {/* Save / Load section */}
      <section className="border border-[#E4E3E0]/10 rounded-sm p-3 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Config name..."
            className="flex-1 bg-white/5 border border-[#E4E3E0]/20 rounded-sm px-2 py-1.5 text-xs font-mono text-[#E4E3E0] placeholder:opacity-30 outline-none focus:border-[#E4E3E0]/40"
          />
          <button
            onClick={handleSave}
            disabled={!hasConfig}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors',
              'bg-[#E4E3E0] text-[#141414] hover:bg-white',
              !hasConfig && 'opacity-20 cursor-not-allowed'
            )}
          >
            <Save size={12} />
            Save
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            onChange={handleLoadFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border border-[#E4E3E0]/20 hover:bg-[#E4E3E0]/10 transition-colors"
          >
            <Upload size={12} />
            Load Config
          </button>
        </div>

        {/* Session config list */}
        {savedConfigs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider opacity-40">Saved Configs</p>
            {savedConfigs.map(config => (
              <div
                key={config.name}
                onClick={() => handleSelectConfig(config)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-xs font-mono transition-colors',
                  activeConfigName === config.name
                    ? 'bg-[#E4E3E0]/15 text-[#E4E3E0]'
                    : 'hover:bg-[#E4E3E0]/5 opacity-60'
                )}
              >
                {activeConfigName === config.name && <Check size={12} className="flex-shrink-0" />}
                <span className="truncate">{config.name}</span>
                <span className="ml-auto text-[10px] opacity-40 flex-shrink-0">
                  {config.scenarioFilters.length}F {config.configKeys.length}K
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Step 1: Scenario Filters */}
      <section className="border-l-2 border-orange-500 pl-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-orange-400 mb-1">
          Step 1: Scenario Filters
        </h3>
        <p className="text-[11px] opacity-50 mb-3">
          Filter rows to focus on specific scenarios or parameter ranges.
        </p>

        {state.scenarioFilters.length === 0 ? (
          <p className="text-xs opacity-30 italic">No filters applied</p>
        ) : (
          <div className="space-y-2">
            {state.scenarioFilters.map(filter => (
              <div
                key={filter.path}
                className="flex items-start justify-between bg-orange-500/10 border border-orange-500/20 rounded-sm px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs truncate">{filter.path}</p>
                  <p className="text-[10px] opacity-50 mt-0.5">
                    {filter.type === 'exact' && filter.values
                      ? `${filter.values.length} value${filter.values.length !== 1 ? 's' : ''}: ${filter.values.slice(0, 3).join(', ')}${filter.values.length > 3 ? '...' : ''}`
                      : filter.range
                        ? `Range: ${filter.range.min} - ${filter.range.max}`
                        : ''}
                  </p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_SCENARIO_FILTER', path: filter.path })}
                  className="p-0.5 hover:bg-orange-500/20 rounded-sm transition-colors ml-2 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] font-mono mt-3 opacity-60">
          Matching rows: {filteredRows.length} of {state.flatTable.length}
        </p>
      </section>

      {/* Step 2: Configuration Keys */}
      <section className="border-l-2 border-green-500 pl-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-green-400 mb-1">
          Step 2: Configuration Keys
        </h3>
        <p className="text-[11px] opacity-50 mb-3">
          Select columns that identify unique configurations (each becomes a plot trace).
        </p>

        {state.configKeys.length === 0 ? (
          <p className="text-xs opacity-30 italic">No configuration keys selected</p>
        ) : (
          <div className="space-y-2">
            {state.configKeys.map(key => (
              <div
                key={key}
                className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-sm px-3 py-2"
              >
                <p className="font-mono text-xs truncate">{key}</p>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_CONFIG_KEY', path: key })}
                  className="p-0.5 hover:bg-green-500/20 rounded-sm transition-colors ml-2 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] font-mono mt-3 opacity-60">
          Traces: {traceCount} unique configuration{traceCount !== 1 ? 's' : ''}
        </p>
      </section>

      {/* Step 3: Axes */}
      <section className="border-l-2 border-blue-500 pl-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-blue-400 mb-1">
          Step 3: Axes
        </h3>
        <p className="text-[11px] opacity-50 mb-3">
          Assign numeric columns to chart axes.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 w-14">X-axis</span>
            {state.xAxis ? (
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-blue-500/10 border border-blue-500/20 rounded-sm px-3 py-1.5">
                <p className="font-mono text-xs truncate flex-1">{state.xAxis}</p>
                <button
                  onClick={() => dispatch({ type: 'SET_X_AXIS', path: null })}
                  className="p-0.5 hover:bg-blue-500/20 rounded-sm transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs opacity-30 italic">Not assigned</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 w-14">Y-axis</span>
            {state.yAxis ? (
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-blue-500/10 border border-blue-500/20 rounded-sm px-3 py-1.5">
                <p className="font-mono text-xs truncate flex-1">{state.yAxis}</p>
                <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-blue-500/20 pl-2 ml-1">
                  <button
                    onClick={() => dispatch({ type: 'SET_Y_AXIS_DIRECTION', direction: 'higher' })}
                    title="Higher is better"
                    className={cn(
                      'p-0.5 rounded-sm transition-colors',
                      state.yAxisDirection === 'higher' ? 'bg-blue-500/30 text-blue-300' : 'opacity-30 hover:opacity-60',
                    )}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_Y_AXIS_DIRECTION', direction: 'lower' })}
                    title="Lower is better"
                    className={cn(
                      'p-0.5 rounded-sm transition-colors',
                      state.yAxisDirection === 'lower' ? 'bg-blue-500/30 text-blue-300' : 'opacity-30 hover:opacity-60',
                    )}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_Y_AXIS', path: null })}
                  className="p-0.5 hover:bg-blue-500/20 rounded-sm transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs opacity-30 italic">Not assigned</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 w-14">Y2</span>
            {state.y2Axis ? (
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-blue-500/10 border border-blue-500/20 rounded-sm px-3 py-1.5">
                <p className="font-mono text-xs truncate flex-1">{state.y2Axis}</p>
                <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-blue-500/20 pl-2 ml-1">
                  <button
                    onClick={() => dispatch({ type: 'SET_Y2_AXIS_DIRECTION', direction: 'higher' })}
                    title="Higher is better"
                    className={cn(
                      'p-0.5 rounded-sm transition-colors',
                      state.y2AxisDirection === 'higher' ? 'bg-blue-500/30 text-blue-300' : 'opacity-30 hover:opacity-60',
                    )}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_Y2_AXIS_DIRECTION', direction: 'lower' })}
                    title="Lower is better"
                    className={cn(
                      'p-0.5 rounded-sm transition-colors',
                      state.y2AxisDirection === 'lower' ? 'bg-blue-500/30 text-blue-300' : 'opacity-30 hover:opacity-60',
                    )}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_Y2_AXIS', path: null })}
                  className="p-0.5 hover:bg-blue-500/20 rounded-sm transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs opacity-30 italic">Not assigned</span>
            )}
          </div>
        </div>
      </section>

      {/* Debug: show flat table keys vs schema paths */}
      {state.flatTable.length > 0 && (
        <details className="text-[10px] font-mono opacity-40">
          <summary className="cursor-pointer hover:opacity-60">Debug: flat table info</summary>
          <div className="mt-1 max-h-40 overflow-y-auto bg-black/20 p-2 rounded">
            <p>Rows: {state.flatTable.length}</p>
            <p className="mt-1">First row keys:</p>
            {Object.keys(state.flatTable[0]).filter(k => !k.startsWith('_')).slice(0, 20).map(k => (
              <div key={k}>{k} = {JSON.stringify(state.flatTable[0][k])?.slice(0, 50)}</div>
            ))}
          </div>
        </details>
      )}

      {/* Select Scenario / Generate Plot buttons */}
      <button
        onClick={() => dispatch({ type: 'SET_MODE', mode: 'scenario' })}
        disabled={state.scenarioFilters.length === 0}
        className="w-full py-3 bg-[#E4E3E0] text-[#141414] font-mono text-sm uppercase tracking-wider rounded-sm hover:bg-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      >
        Select Scenario
      </button>
    </div>
  );
}
