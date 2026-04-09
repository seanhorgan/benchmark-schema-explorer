import React, { useCallback, useRef } from 'react';
import { useAnalysis } from '../../state/analysis-store';
import { ArrowLeft, Download, Table } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PlotType } from '../../data/types';

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                             */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 mb-3">
      {children}
    </h4>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 text-[11px] font-mono uppercase px-3 py-1.5 rounded-sm transition-colors',
            value === opt.value
              ? 'bg-white/15 text-white'
              : 'bg-white/5 text-white/40 hover:text-white/70',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function PlotOptions() {
  const { state, dispatch, plotRows: filteredRows } = useAnalysis();
  const plotRef = useRef<HTMLDivElement | null>(null);

  /* ---- handlers -------------------------------------------------- */

  const goBack = useCallback(() => {
    dispatch({ type: 'SET_MODE', mode: 'analysis' });
  }, [dispatch]);

  const setPlotType = useCallback(
    (t: string) => dispatch({ type: 'SET_PLOT_TYPE', plotType: t as PlotType }),
    [dispatch],
  );

  const setXScale = useCallback(
    (s: string) =>
      dispatch({ type: 'SET_X_SCALE', scale: s as 'linear' | 'log' }),
    [dispatch],
  );

  const setYScale = useCallback(
    (s: string) =>
      dispatch({ type: 'SET_Y_SCALE', scale: s as 'linear' | 'log' }),
    [dispatch],
  );

  const toggleSlo = useCallback(() => {
    if (state.slo) {
      dispatch({ type: 'SET_SLO', slo: null });
    } else {
      dispatch({
        type: 'SET_SLO',
        slo: { enabled: true, metric: state.yAxis ?? '', threshold: 0 },
      });
    }
  }, [dispatch, state.slo, state.yAxis]);

  const setSloThreshold = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!state.slo) return;
      dispatch({
        type: 'SET_SLO',
        slo: { ...state.slo, threshold: Number(e.target.value) },
      });
    },
    [dispatch, state.slo],
  );

  const toggleFrontier = useCallback(() => {
    dispatch({ type: 'SET_PARETO_FRONTIER', show: !state.showParetoFrontier });
  }, [dispatch, state.showParetoFrontier]);

  /* ---- export helpers -------------------------------------------- */

  const exportPng = useCallback(async () => {
    try {
      // Dynamically import Plotly for toImage
      const Plotly = await import('plotly.js-dist-min');
      const plotEl = document.querySelector('.js-plotly-plot') as HTMLElement | null;
      if (!plotEl) return;
      const url = await (Plotly as any).toImage(plotEl, {
        format: 'png',
        width: 1200,
        height: 800,
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plot.png';
      a.click();
    } catch {
      // silently fail if Plotly is not available
    }
  }, []);

  const exportCsv = useCallback(() => {
    if (filteredRows.length === 0) return;
    const keys = Object.keys(filteredRows[0]).filter((k) => !k.startsWith('_'));
    const header = keys.join(',');
    const rows = filteredRows.map((r) =>
      keys.map((k) => JSON.stringify(r[k] ?? '')).join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  /* ---- render ---------------------------------------------------- */

  return (
    <div ref={plotRef} className="p-6 space-y-6 text-[#E4E3E0]">
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
      >
        <ArrowLeft size={14} />
        Back to Analysis Builder
      </button>

      {/* Plot type */}
      <section className="border-t border-white/10 pt-5">
        <SectionLabel>Plot Type</SectionLabel>
        <ToggleGroup
          options={[
            { label: 'Line', value: 'line' },
            { label: 'Pareto', value: 'pareto' },
          ]}
          value={state.plotType === 'auto' ? 'line' : state.plotType}
          onChange={setPlotType}
        />
      </section>

      {/* X Scale */}
      <section className="border-t border-white/10 pt-5">
        <SectionLabel>X Scale</SectionLabel>
        <ToggleGroup
          options={[
            { label: 'Linear', value: 'linear' },
            { label: 'Log', value: 'log' },
          ]}
          value={state.xScale}
          onChange={setXScale}
        />
      </section>

      {/* Y Scale */}
      <section className="border-t border-white/10 pt-5">
        <SectionLabel>Y Scale</SectionLabel>
        <ToggleGroup
          options={[
            { label: 'Linear', value: 'linear' },
            { label: 'Log', value: 'log' },
          ]}
          value={state.yScale}
          onChange={setYScale}
        />
      </section>

      {/* SLO */}
      <section className="border-t border-white/10 pt-5">
        <SectionLabel>SLO Threshold</SectionLabel>
        <label className="flex items-center gap-2 text-[11px] font-mono cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={!!state.slo}
            onChange={toggleSlo}
            className="accent-white"
          />
          Enable SLO
        </label>
        {state.slo && (
          <input
            type="number"
            value={state.slo.threshold}
            onChange={setSloThreshold}
            className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-white/30"
            placeholder="Threshold value"
          />
        )}
      </section>

      {/* Pareto frontier */}
      <section className="border-t border-white/10 pt-5">
        <SectionLabel>Pareto</SectionLabel>
        <label className="flex items-center gap-2 text-[11px] font-mono cursor-pointer">
          <input
            type="checkbox"
            checked={state.showParetoFrontier}
            onChange={toggleFrontier}
            className="accent-white"
          />
          Show Pareto Frontier
        </label>
      </section>

      {/* Export */}
      <section className="border-t border-white/10 pt-5">
        <SectionLabel>Export</SectionLabel>
        <div className="flex gap-2">
          <button
            onClick={exportPng}
            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-[11px] font-mono uppercase px-3 py-2 rounded-sm transition-colors"
          >
            <Download size={12} />
            Export PNG
          </button>
          <button
            onClick={exportCsv}
            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-[11px] font-mono uppercase px-3 py-2 rounded-sm transition-colors"
          >
            <Table size={12} />
            Export CSV
          </button>
        </div>
      </section>
    </div>
  );
}
