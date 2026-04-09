import type { JsonSchema } from '../types';

export interface BenchmarkReport {
  id: string;
  data: Record<string, any>;
  source: 'upload' | 'url';
  filename: string;
}

export interface UnifiedColumn {
  path: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  availableIn: number;
  totalReports: number;
  uniqueValues?: any[];
  range?: [number, number];
}

export interface UnifiedSchemaNode {
  path: string;
  name: string;
  type: string;
  description?: string;
  availableIn: number;
  totalReports: number;
  children: UnifiedSchemaNode[];
  columnMeta?: UnifiedColumn;
}

export interface FlatRow {
  _row_id: string;
  _report_id: string;
  [columnPath: string]: any;
}

export interface ScenarioFilter {
  path: string;
  type: 'exact' | 'range';
  values?: any[];
  range?: { min: number; max: number };
}

export interface AnalysisConfig {
  name: string;
  scenarioFilters: ScenarioFilter[];
  configKeys: string[];
  xAxis: string | null;
  yAxis: string | null;
  y2Axis: string | null;
  plotType: PlotType;
  xScale: 'linear' | 'log';
  yScale: 'linear' | 'log';
  slo: SloConfig | null;
  showParetoFrontier: boolean;
  numericSplits: Record<string, number[]>;
  yAxisDirection: AxisDirection;
  y2AxisDirection: AxisDirection;
}

export type AppMode = 'explorer' | 'analysis' | 'scenario' | 'plot';

export type PlotType = 'line' | 'pareto' | 'auto';

export type AxisDirection = 'higher' | 'lower';

export interface SloConfig {
  enabled: boolean;
  metric: string;
  threshold: number;
}

export interface AnalysisState {
  reports: BenchmarkReport[];
  schema: JsonSchema | null;
  unifiedSchema: UnifiedSchemaNode | null;
  flatTable: FlatRow[];
  columns: UnifiedColumn[];

  scenarioFilters: ScenarioFilter[];
  configKeys: string[];
  xAxis: string | null;
  yAxis: string | null;
  y2Axis: string | null;

  plotType: PlotType;
  xScale: 'linear' | 'log';
  yScale: 'linear' | 'log';
  slo: SloConfig | null;
  showParetoFrontier: boolean;
  selectedScenarioIndex: number | null;
  numericSplits: Record<string, number[]>;
  yAxisDirection: AxisDirection;
  y2AxisDirection: AxisDirection;

  mode: AppMode;
}

export type AnalysisAction =
  | { type: 'LOAD_REPORTS'; reports: BenchmarkReport[] }
  | { type: 'REMOVE_REPORT'; id: string }
  | { type: 'SET_SCHEMA'; schema: JsonSchema }
  | { type: 'ADD_SCENARIO_FILTER'; filter: ScenarioFilter }
  | { type: 'REMOVE_SCENARIO_FILTER'; path: string }
  | { type: 'UPDATE_SCENARIO_FILTER'; filter: ScenarioFilter }
  | { type: 'ADD_CONFIG_KEY'; path: string }
  | { type: 'REMOVE_CONFIG_KEY'; path: string }
  | { type: 'SET_X_AXIS'; path: string | null }
  | { type: 'SET_Y_AXIS'; path: string | null }
  | { type: 'SET_Y2_AXIS'; path: string | null }
  | { type: 'SET_PLOT_TYPE'; plotType: PlotType }
  | { type: 'SET_X_SCALE'; scale: 'linear' | 'log' }
  | { type: 'SET_Y_SCALE'; scale: 'linear' | 'log' }
  | { type: 'SET_SLO'; slo: SloConfig | null }
  | { type: 'SET_PARETO_FRONTIER'; show: boolean }
  | { type: 'SET_Y_AXIS_DIRECTION'; direction: AxisDirection }
  | { type: 'SET_Y2_AXIS_DIRECTION'; direction: AxisDirection }
  | { type: 'SET_SELECTED_SCENARIO'; index: number | null }
  | { type: 'SET_NUMERIC_SPLITS'; path: string; splits: number[] }
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'LOAD_CONFIG'; config: AnalysisConfig }
  | { type: 'CLEAR_ANALYSIS' };
