import * as yaml from 'js-yaml';
import type { BenchmarkReport, AnalysisConfig, AnalysisState } from './types';

/**
 * Detect format from filename extension and parse content accordingly.
 */
export function parseFileContent(content: string, filename: string): Record<string, any> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.json')) {
    try {
      return JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse JSON file "${filename}": ${(e as Error).message}`);
    }
  }

  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    try {
      const result = yaml.load(content);
      if (typeof result !== 'object' || result === null) {
        throw new Error('YAML did not parse into an object');
      }
      return result as Record<string, any>;
    } catch (e) {
      throw new Error(`Failed to parse YAML file "${filename}": ${(e as Error).message}`);
    }
  }

  throw new Error(
    `Unsupported file extension for "${filename}". Expected .json, .yaml, or .yml`
  );
}

/**
 * Read a single File using the FileReader API and return its text content.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}"`));
    reader.readAsText(file);
  });
}

/**
 * Load multiple files from a File array.
 * Each file is parsed and wrapped as a BenchmarkReport with a unique ID.
 */
export async function loadFromFileArray(files: File[]): Promise<BenchmarkReport[]> {
  const reports: BenchmarkReport[] = [];

  for (const file of files) {
    const content = await readFileAsText(file);
    const data = parseFileContent(content, file.name);

    reports.push({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      data,
      source: 'upload',
      filename: (file as any).webkitRelativePath || file.name,
    });
  }

  return reports;
}

/**
 * Load multiple files from a FileList (e.g. from an <input type="file"> element).
 */
export async function loadFromFiles(files: FileList): Promise<BenchmarkReport[]> {
  return loadFromFileArray(Array.from(files));
}

/**
 * Fetch a benchmark report from a URL.
 * Detects format from the URL extension or falls back to the Content-Type header.
 */
export async function loadFromUrl(url: string): Promise<BenchmarkReport> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  // Try to determine format from the URL path extension first
  const pathname = new URL(url).pathname.toLowerCase();
  let filename: string;

  if (pathname.endsWith('.json')) {
    filename = 'remote.json';
  } else if (pathname.endsWith('.yaml') || pathname.endsWith('.yml')) {
    filename = 'remote.yaml';
  } else {
    // Fall back to Content-Type header
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('yaml') || contentType.includes('yml')) {
      filename = 'remote.yaml';
    } else {
      // Default to JSON
      filename = 'remote.json';
    }
  }

  const data = parseFileContent(text, filename);

  return {
    id: `${url}-${Date.now()}`,
    data,
    source: 'url',
    filename: url,
  };
}

/**
 * Extract the analysis configuration from state and serialize to YAML.
 */
export function exportAnalysisConfig(state: AnalysisState, name: string): string {
  const config: AnalysisConfig = {
    name,
    scenarioFilters: state.scenarioFilters,
    configKeys: state.configKeys,
    xAxis: state.xAxis,
    yAxis: state.yAxis,
    y2Axis: state.y2Axis,
    plotType: state.plotType,
    xScale: state.xScale,
    yScale: state.yScale,
    slo: state.slo,
    showParetoFrontier: state.showParetoFrontier,
    numericSplits: state.numericSplits,
    yAxisDirection: state.yAxisDirection,
    y2AxisDirection: state.y2AxisDirection,
  };
  return yaml.dump(config, { noRefs: true, lineWidth: 120 });
}

/**
 * Parse a YAML string into an AnalysisConfig.
 */
export function importAnalysisConfig(content: string): AnalysisConfig {
  const raw = yaml.load(content) as any;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid analysis config: expected a YAML object');
  }
  return {
    name: raw.name ?? 'Untitled',
    scenarioFilters: Array.isArray(raw.scenarioFilters) ? raw.scenarioFilters : [],
    configKeys: Array.isArray(raw.configKeys) ? raw.configKeys : [],
    xAxis: raw.xAxis ?? null,
    yAxis: raw.yAxis ?? null,
    y2Axis: raw.y2Axis ?? null,
    plotType: raw.plotType ?? 'auto',
    xScale: raw.xScale ?? 'linear',
    yScale: raw.yScale ?? 'linear',
    slo: raw.slo ?? null,
    showParetoFrontier: raw.showParetoFrontier ?? true,
    numericSplits: raw.numericSplits ?? {},
    yAxisDirection: raw.yAxisDirection ?? 'higher',
    y2AxisDirection: raw.y2AxisDirection ?? 'higher',
  };
}
