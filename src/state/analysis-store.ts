import React, { createContext, useContext, useReducer, useMemo } from 'react';
import type { AnalysisState, AnalysisAction, ScenarioFilter, FlatRow } from '../data/types';
import { buildUnifiedSchema } from '../data/schema-union';
import { buildFlatTable } from '../data/flat-table';
import { classifyColumns, buildScenarioTable } from '../components/ScenarioSelector/scenario-utils';

const initialState: AnalysisState = {
  reports: [],
  schema: null,
  unifiedSchema: null,
  flatTable: [],
  columns: [],
  scenarioFilters: [],
  configKeys: [],
  xAxis: null,
  yAxis: null,
  y2Axis: null,
  plotType: 'auto',
  xScale: 'linear',
  yScale: 'linear',
  slo: null,
  showParetoFrontier: true,
  selectedScenarioIndex: null,
  numericSplits: {},
  yAxisDirection: 'higher',
  y2AxisDirection: 'higher',
  mode: 'explorer',
};

function rebuildDerivedState(state: AnalysisState): AnalysisState {
  if (state.reports.length === 0) {
    return { ...state, unifiedSchema: null, flatTable: [], columns: [] };
  }
  const unifiedSchema = buildUnifiedSchema(state.reports, state.schema);
  const flatTable = buildFlatTable(state.reports);
  const columns = collectColumns(unifiedSchema);
  return { ...state, unifiedSchema, flatTable, columns };
}

function collectColumns(node: NonNullable<AnalysisState['unifiedSchema']>): AnalysisState['columns'] {
  const cols: AnalysisState['columns'] = [];
  if (node.columnMeta) {
    cols.push(node.columnMeta);
  }
  for (const child of node.children) {
    cols.push(...collectColumns(child));
  }
  return cols;
}

function applyFilters(flatTable: FlatRow[], filters: ScenarioFilter[]): FlatRow[] {
  return flatTable.filter(row => {
    return filters.every(f => {
      const val = row[f.path];
      if (val === undefined || val === null) return false;
      if (f.type === 'exact' && f.values) {
        return f.values.includes(val);
      }
      if (f.type === 'range' && f.range) {
        const num = Number(val);
        return !isNaN(num) && num >= f.range.min && num <= f.range.max;
      }
      return true;
    });
  });
}

function countTraces(filteredRows: FlatRow[], configKeys: string[]): number {
  if (configKeys.length === 0) return filteredRows.length > 0 ? 1 : 0;
  const seen = new Set<string>();
  for (const row of filteredRows) {
    const key = configKeys.map(k => String(row[k] ?? '')).join('|||');
    seen.add(key);
  }
  return seen.size;
}

function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'LOAD_REPORTS': {
      const next = { ...state, reports: [...state.reports, ...action.reports] };
      return rebuildDerivedState(next);
    }
    case 'REMOVE_REPORT': {
      const next = { ...state, reports: state.reports.filter(r => r.id !== action.id) };
      return rebuildDerivedState(next);
    }
    case 'SET_SCHEMA': {
      const next = { ...state, schema: action.schema };
      return state.reports.length > 0 ? rebuildDerivedState(next) : next;
    }
    case 'ADD_SCENARIO_FILTER': {
      const existing = state.scenarioFilters.findIndex(f => f.path === action.filter.path);
      const filters = [...state.scenarioFilters];
      if (existing >= 0) {
        filters[existing] = action.filter;
      } else {
        filters.push(action.filter);
      }
      return { ...state, scenarioFilters: filters };
    }
    case 'REMOVE_SCENARIO_FILTER':
      return { ...state, scenarioFilters: state.scenarioFilters.filter(f => f.path !== action.path) };
    case 'UPDATE_SCENARIO_FILTER': {
      const filters = state.scenarioFilters.map(f => f.path === action.filter.path ? action.filter : f);
      return { ...state, scenarioFilters: filters };
    }
    case 'ADD_CONFIG_KEY':
      if (state.configKeys.includes(action.path)) return state;
      return { ...state, configKeys: [...state.configKeys, action.path] };
    case 'REMOVE_CONFIG_KEY':
      return { ...state, configKeys: state.configKeys.filter(k => k !== action.path) };
    case 'SET_X_AXIS':
      return { ...state, xAxis: action.path };
    case 'SET_Y_AXIS':
      return { ...state, yAxis: action.path };
    case 'SET_Y2_AXIS':
      return { ...state, y2Axis: action.path };
    case 'SET_PLOT_TYPE':
      return { ...state, plotType: action.plotType };
    case 'SET_X_SCALE':
      return { ...state, xScale: action.scale };
    case 'SET_Y_SCALE':
      return { ...state, yScale: action.scale };
    case 'SET_SLO':
      return { ...state, slo: action.slo };
    case 'SET_PARETO_FRONTIER':
      return { ...state, showParetoFrontier: action.show };
    case 'SET_Y_AXIS_DIRECTION':
      return { ...state, yAxisDirection: action.direction };
    case 'SET_Y2_AXIS_DIRECTION':
      return { ...state, y2AxisDirection: action.direction };
    case 'SET_SELECTED_SCENARIO':
      return { ...state, selectedScenarioIndex: action.index };
    case 'SET_NUMERIC_SPLITS': {
      const numericSplits = { ...state.numericSplits, [action.path]: action.splits.slice().sort((a, b) => a - b) };
      // Reset scenario selection when splits change since table rows change
      return { ...state, numericSplits, selectedScenarioIndex: null };
    }
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'LOAD_CONFIG': {
      const c = action.config;
      return {
        ...state,
        scenarioFilters: c.scenarioFilters,
        configKeys: c.configKeys,
        xAxis: c.xAxis,
        yAxis: c.yAxis,
        y2Axis: c.y2Axis,
        plotType: c.plotType,
        xScale: c.xScale,
        yScale: c.yScale,
        slo: c.slo,
        showParetoFrontier: c.showParetoFrontier,
        numericSplits: c.numericSplits ?? {},
        yAxisDirection: c.yAxisDirection ?? 'higher',
        y2AxisDirection: c.y2AxisDirection ?? 'higher',
        selectedScenarioIndex: null,
      };
    }
    case 'CLEAR_ANALYSIS':
      return {
        ...state,
        scenarioFilters: [],
        configKeys: [],
        xAxis: null,
        yAxis: null,
        y2Axis: null,
        plotType: 'auto',
        slo: null,
        showParetoFrontier: true,
        selectedScenarioIndex: null,
        numericSplits: {},
        yAxisDirection: 'higher',
        y2AxisDirection: 'higher',
      };
    default:
      return state;
  }
}

interface AnalysisContextValue {
  state: AnalysisState;
  dispatch: React.Dispatch<AnalysisAction>;
  /** Rows after applying scenario filters (used by ScenarioSelector to build the table) */
  filteredRows: FlatRow[];
  /** Rows narrowed to the selected scenario (used by PlotView) */
  plotRows: FlatRow[];
  traceCount: number;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);

  const filteredRows = useMemo(
    () => applyFilters(state.flatTable, state.scenarioFilters),
    [state.flatTable, state.scenarioFilters]
  );

  // Narrow to selected scenario row
  const plotRows = useMemo(() => {
    if (state.selectedScenarioIndex === null) return filteredRows;

    const scenarioFilterPaths = state.scenarioFilters.map((f) => f.path);
    const { categorical, numeric } = classifyColumns(state.columns, scenarioFilterPaths);
    const scenarios = buildScenarioTable(filteredRows, categorical, numeric, state.numericSplits);

    const selected = scenarios[state.selectedScenarioIndex];
    if (!selected) return filteredRows;

    return selected.matchingRowIndices.map((i) => filteredRows[i]);
  }, [filteredRows, state.selectedScenarioIndex, state.columns, state.scenarioFilters, state.numericSplits]);

  const traceCount = useMemo(
    () => countTraces(plotRows, state.configKeys),
    [plotRows, state.configKeys]
  );

  const value = useMemo(
    () => ({ state, dispatch, filteredRows, plotRows, traceCount }),
    [state, dispatch, filteredRows, plotRows, traceCount]
  );

  return React.createElement(AnalysisContext.Provider, { value }, children);
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}

export function getRoleForPath(state: AnalysisState, path: string): string | null {
  if (state.scenarioFilters.some(f => f.path === path)) return 'filter';
  if (state.configKeys.includes(path)) return 'key';
  if (state.xAxis === path) return 'x-axis';
  if (state.yAxis === path) return 'y-axis';
  if (state.y2Axis === path) return 'y2-axis';
  return null;
}
