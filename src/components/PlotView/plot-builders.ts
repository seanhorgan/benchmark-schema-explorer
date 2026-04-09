import type { FlatRow, ScenarioFilter } from '../../data/types';

/* ------------------------------------------------------------------ */
/*  Plot type auto-selection                                          */
/* ------------------------------------------------------------------ */

export function autoSelectPlotType(
  xAxis: string | null,
  yAxis: string | null,
  y2Axis: string | null,
): 'line' | 'pareto' {
  if (xAxis && yAxis && y2Axis) return 'pareto';
  return 'line';
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                    */
/* ------------------------------------------------------------------ */

const BASE_LAYOUT = {
  autosize: true,
  margin: { l: 60, r: 30, t: 60, b: 60 },
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(0,0,0,0.02)',
  font: { family: 'monospace', size: 11 },
};

export function formatFilterTitle(filters: ScenarioFilter[]): string {
  return filters
    .map((f) => {
      if (f.type === 'exact' && f.values) {
        return `${f.path} = ${f.values.join(', ')}`;
      }
      if (f.type === 'range' && f.range) {
        return `${f.path}: ${f.range.min}\u2013${f.range.max}`;
      }
      return f.path;
    })
    .join(' \u00b7 ');
}

function groupByConfigKeys(
  rows: FlatRow[],
  configKeys: string[],
): Map<string, FlatRow[]> {
  const groups = new Map<string, FlatRow[]>();
  for (const row of rows) {
    const label =
      configKeys.length > 0
        ? configKeys.map((k) => String(row[k] ?? '')).join(' / ')
        : 'all';
    let list = groups.get(label);
    if (!list) {
      list = [];
      groups.set(label, list);
    }
    list.push(row);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Line plot                                                         */
/* ------------------------------------------------------------------ */

export function buildLinePlot(params: {
  filteredRows: FlatRow[];
  configKeys: string[];
  xAxis: string;
  yAxis: string;
  scenarioFilters: ScenarioFilter[];
  xScale?: 'linear' | 'log';
  yScale?: 'linear' | 'log';
}): { data: any[]; layout: any } {
  const { filteredRows, configKeys, xAxis, yAxis, scenarioFilters, xScale, yScale } = params;
  const groups = groupByConfigKeys(filteredRows, configKeys);

  const data: any[] = [];
  for (const [label, rows] of groups) {
    const sorted = [...rows].sort((a, b) => {
      const va = Number(a[xAxis]);
      const vb = Number(b[xAxis]);
      return va - vb;
    });
    data.push({
      x: sorted.map((r) => r[xAxis]),
      y: sorted.map((r) => r[yAxis]),
      type: 'scatter',
      mode: 'lines+markers',
      name: label,
    });
  }

  const title = formatFilterTitle(scenarioFilters) || 'Line Plot';

  return {
    data,
    layout: {
      ...BASE_LAYOUT,
      title,
      xaxis: { title: { text: xAxis }, type: xScale ?? 'linear' },
      yaxis: { title: { text: yAxis }, type: yScale ?? 'linear' },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Pareto plot                                                       */
/* ------------------------------------------------------------------ */

function computeParetoFrontier(
  xs: number[],
  ys: number[],
  xHigherBetter: boolean,
  yHigherBetter: boolean,
): { x: number[]; y: number[] } {
  const points = xs.map((x, i) => ({ x, y: ys[i] }));
  points.sort((a, b) => a.x - b.x);

  const frontier: { x: number; y: number }[] = [];

  // Walk from the "best x" end toward the "worst x" end,
  // tracking the best y seen so far.
  if (xHigherBetter) {
    // Best x is highest — walk right to left
    let bestY = -Infinity;
    for (let i = points.length - 1; i >= 0; i--) {
      const isBetterY = yHigherBetter ? points[i].y >= bestY : points[i].y <= bestY;
      if (isBetterY || bestY === -Infinity) {
        bestY = points[i].y;
        frontier.push(points[i]);
      }
    }
  } else {
    // Best x is lowest — walk left to right
    let bestY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const isBetterY = yHigherBetter ? points[i].y >= bestY : points[i].y <= bestY;
      if (isBetterY || bestY === -Infinity) {
        bestY = points[i].y;
        frontier.push(points[i]);
      }
    }
  }

  frontier.sort((a, b) => a.x - b.x);
  return {
    x: frontier.map((p) => p.x),
    y: frontier.map((p) => p.y),
  };
}

/**
 * Choose the Plotly line shape for the Pareto staircase.
 * The staircase must enclose the dominated region:
 * - Both higher: 'vh' (vertical first, then horizontal)
 * - Both lower: 'hv' (horizontal first, then vertical)
 * - X higher, Y lower: 'hv'
 * - X lower, Y higher: 'vh'
 */
function paretoLineShape(xHigherBetter: boolean, yHigherBetter: boolean): 'vh' | 'hv' {
  return xHigherBetter === yHigherBetter ? 'vh' : 'hv';
}

export function buildParetoPlot(params: {
  filteredRows: FlatRow[];
  configKeys: string[];
  xAxis: string;
  yAxis: string;
  y2Axis: string;
  scenarioFilters: ScenarioFilter[];
  showFrontier: boolean;
  slo?: { metric: string; threshold: number } | null;
  xScale?: 'linear' | 'log';
  yScale?: 'linear' | 'log';
  xHigherBetter?: boolean;
  yHigherBetter?: boolean;
}): { data: any[]; layout: any } {
  const {
    filteredRows,
    configKeys,
    xAxis,
    yAxis,
    y2Axis,
    scenarioFilters,
    showFrontier,
    slo,
    xScale,
    yScale,
    xHigherBetter = true,
    yHigherBetter = true,
  } = params;

  const groups = groupByConfigKeys(filteredRows, configKeys);
  const data: any[] = [];

  const allXForFrontier: number[] = [];
  const allYForFrontier: number[] = [];

  for (const [label, rows] of groups) {
    const xVals = rows.map((r) => Number(r[yAxis]));
    const yVals = rows.map((r) => Number(r[y2Axis]));

    const hoverText = rows.map((r) => {
      const lines = [`${xAxis}: ${r[xAxis]}`];
      for (const k of configKeys) {
        lines.push(`${k}: ${r[k] ?? ''}`);
      }
      return lines.join('<br>');
    });

    let colors: string | string[] = '#141414';
    if (slo) {
      colors = rows.map((r) => {
        const val = Number(r[slo.metric]);
        return val <= slo.threshold ? '#22c55e' : '#ef4444';
      });
    }

    allXForFrontier.push(...xVals);
    allYForFrontier.push(...yVals);

    data.push({
      x: xVals,
      y: yVals,
      type: 'scatter',
      mode: 'markers',
      name: label,
      marker: {
        size: 10,
        color: colors,
        opacity: 0.8,
      },
      text: hoverText,
      hovertemplate: '%{text}<extra>%{fullData.name}</extra>',
    });
  }

  if (showFrontier && allXForFrontier.length > 0) {
    const frontier = computeParetoFrontier(allXForFrontier, allYForFrontier, xHigherBetter, yHigherBetter);
    data.push({
      x: frontier.x,
      y: frontier.y,
      type: 'scatter',
      mode: 'lines',
      name: 'Pareto Frontier',
      line: { dash: 'dot', color: '#888', shape: paretoLineShape(xHigherBetter, yHigherBetter) },
      showlegend: true,
    });
  }

  const title = formatFilterTitle(scenarioFilters) || 'Pareto Plot';

  return {
    data,
    layout: {
      ...BASE_LAYOUT,
      title,
      xaxis: { title: { text: yAxis }, type: xScale ?? 'linear' },
      yaxis: { title: { text: y2Axis }, type: yScale ?? 'linear' },
    },
  };
}

