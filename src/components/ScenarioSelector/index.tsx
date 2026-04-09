import React, { useMemo, useState, useCallback } from 'react';
import { useAnalysis } from '../../state/analysis-store';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { classifyColumns, buildScenarioTable } from './scenario-utils';
import HistogramPanel from './HistogramPanel';

export default function ScenarioSelector() {
  const { state, dispatch, filteredRows } = useAnalysis();
  const [histogramCol, setHistogramCol] = useState<string | null>(null);

  // Classify scenario columns
  const { categorical, numeric } = useMemo(
    () =>
      classifyColumns(
        state.columns,
        state.scenarioFilters.map((f) => f.path),
      ),
    [state.columns, state.scenarioFilters],
  );

  const allScenarioCols = useMemo(
    () => [...categorical, ...numeric],
    [categorical, numeric],
  );

  // Build scenario table
  const scenarios = useMemo(
    () =>
      buildScenarioTable(
        filteredRows,
        categorical,
        numeric,
        state.numericSplits,
      ),
    [filteredRows, categorical, numeric, state.numericSplits],
  );

  // Get histogram values for the active column
  const histogramValues = useMemo(() => {
    if (!histogramCol) return [];
    return filteredRows
      .map((r) => Number(r[histogramCol]))
      .filter((v) => !isNaN(v));
  }, [filteredRows, histogramCol]);

  const handleBack = useCallback(() => {
    dispatch({ type: 'SET_MODE', mode: 'analysis' });
  }, [dispatch]);

  const handleSelectScenario = useCallback(
    (index: number) => {
      dispatch({ type: 'SET_SELECTED_SCENARIO', index });
    },
    [dispatch],
  );

  const handleGeneratePlot = useCallback(() => {
    dispatch({ type: 'SET_MODE', mode: 'plot' });
  }, [dispatch]);

  const handleSplitsChange = useCallback(
    (splits: number[]) => {
      if (!histogramCol) return;
      dispatch({ type: 'SET_NUMERIC_SPLITS', path: histogramCol, splits });
    },
    [dispatch, histogramCol],
  );

  const handleColumnClick = useCallback(
    (col: string) => {
      if (!numeric.includes(col)) return;
      setHistogramCol((prev) => (prev === col ? null : col));
    },
    [numeric],
  );

  const formatCellValue = (
    value: string | [number, number],
  ): string => {
    if (typeof value === 'string') return value;
    const [min, max] = value;
    if (min === max) return String(min);
    return `${min} \u2013 ${max}`;
  };

  const colName = (path: string) => path.split('.').pop() ?? path;

  return (
    <main className="flex h-[calc(100vh-65px)] overflow-hidden">
      {/* Table section */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#141414]/20">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={14} />
            Back to Analysis Builder
          </button>
          <span className="text-[11px] font-mono uppercase tracking-wider opacity-40">
            Scenario Selector
          </span>
          <span className="text-[11px] font-mono opacity-40">
            {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {scenarios.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm font-mono uppercase opacity-40">
                No scenario columns defined. Add scenario filters in the
                Analysis Builder.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs font-mono border-collapse">
              <thead className="sticky top-0 bg-[#E4E3E0] z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider opacity-40 w-10">
                    &nbsp;
                  </th>
                  {allScenarioCols.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleColumnClick(col)}
                      className={cn(
                        'px-4 py-2.5 text-left text-[10px] uppercase tracking-wider border-b border-[#141414]/10',
                        numeric.includes(col)
                          ? 'text-orange-500 cursor-pointer hover:text-orange-400'
                          : 'opacity-40',
                        histogramCol === col && 'bg-orange-500/10',
                      )}
                    >
                      {colName(col)}
                      {numeric.includes(col) && ' ▼'}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider opacity-40 border-b border-[#141414]/10">
                    Rows
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario, i) => {
                  const selected = state.selectedScenarioIndex === i;
                  return (
                    <tr
                      key={i}
                      onClick={() => handleSelectScenario(i)}
                      className={cn(
                        'cursor-pointer transition-colors border-b border-[#141414]/5',
                        selected
                          ? 'bg-[#141414] text-[#E4E3E0]'
                          : 'hover:bg-[#141414]/5',
                      )}
                    >
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            'inline-block w-3 h-3 rounded-full border-2',
                            selected
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-[#141414]/30',
                          )}
                        />
                      </td>
                      {allScenarioCols.map((col) => (
                        <td key={col} className="px-4 py-2">
                          {formatCellValue(scenario.values[col])}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right opacity-50">
                        {scenario.rowCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Generate Plot button */}
        <div className="px-6 py-4 border-t border-[#141414]/20">
          <button
            onClick={handleGeneratePlot}
            disabled={state.selectedScenarioIndex === null}
            className="w-full py-3 bg-[#141414] text-[#E4E3E0] font-mono text-sm uppercase tracking-wider rounded-sm hover:bg-[#141414]/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            Generate Plot
          </button>
        </div>
      </section>

      {/* Histogram slide-out panel */}
      {histogramCol && (
        <HistogramPanel
          columnPath={histogramCol}
          values={histogramValues}
          splits={state.numericSplits[histogramCol] ?? []}
          onSplitsChange={handleSplitsChange}
          onClose={() => setHistogramCol(null)}
        />
      )}
    </main>
  );
}
