import type { FlatRow, UnifiedColumn } from '../../data/types';

export interface ScenarioRow {
  /** Categorical column values (exact) and numeric column ranges [min, max] */
  values: Record<string, string | [number, number]>;
  /** Number of data rows matching this scenario */
  rowCount: number;
  /** Indices into the filteredRows array */
  matchingRowIndices: number[];
}

/**
 * Classify scenario columns as categorical or numeric based on UnifiedColumn metadata.
 */
export function classifyColumns(
  columns: UnifiedColumn[],
  scenarioFilterPaths: string[],
): { categorical: string[]; numeric: string[] } {
  const categorical: string[] = [];
  const numeric: string[] = [];

  for (const path of scenarioFilterPaths) {
    const col = columns.find((c) => c.path === path);
    if (col && col.type === 'number') {
      numeric.push(path);
    } else {
      categorical.push(path);
    }
  }

  return { categorical, numeric };
}

/**
 * Build the scenario table from filtered rows.
 *
 * 1. Group rows by unique combos of categorical column values
 * 2. For each group, compute min/max of numeric columns
 * 3. Apply numeric splits to subdivide groups at boundary values
 */
export function buildScenarioTable(
  filteredRows: FlatRow[],
  categoricalCols: string[],
  numericCols: string[],
  numericSplits: Record<string, number[]>,
): ScenarioRow[] {
  if (filteredRows.length === 0) return [];

  // Step 1: group by categorical values
  const groups = new Map<string, number[]>();
  for (let i = 0; i < filteredRows.length; i++) {
    const row = filteredRows[i];
    const key = categoricalCols.map((c) => String(row[c] ?? '')).join('|||');
    let indices = groups.get(key);
    if (!indices) {
      indices = [];
      groups.set(key, indices);
    }
    indices.push(i);
  }

  // Step 2 & 3: for each group, compute numeric ranges and apply splits
  const scenarios: ScenarioRow[] = [];

  for (const [, indices] of groups) {
    // Start with a single bucket containing all indices in this group
    let buckets: number[][] = [indices];

    // For each numeric column, subdivide buckets at split points
    for (const col of numericCols) {
      const splits = numericSplits[col];
      if (!splits || splits.length === 0) continue;

      const nextBuckets: number[][] = [];
      for (const bucket of buckets) {
        // Sort split points
        const sortedSplits = [...splits].sort((a, b) => a - b);
        // Create sub-buckets: [min..split1], (split1..split2], ..., (splitN..max]
        const subBuckets: number[][] = new Array(sortedSplits.length + 1)
          .fill(null)
          .map(() => []);

        for (const idx of bucket) {
          const val = Number(filteredRows[idx][col]);
          let placed = false;
          for (let s = 0; s < sortedSplits.length; s++) {
            if (val <= sortedSplits[s]) {
              subBuckets[s].push(idx);
              placed = true;
              break;
            }
          }
          if (!placed) {
            subBuckets[sortedSplits.length].push(idx);
          }
        }

        // Only keep non-empty sub-buckets
        for (const sb of subBuckets) {
          if (sb.length > 0) nextBuckets.push(sb);
        }
      }
      buckets = nextBuckets;
    }

    // Convert each bucket to a ScenarioRow
    for (const bucket of buckets) {
      const values: Record<string, string | [number, number]> = {};

      // Categorical values (same for all rows in the group)
      const firstRow = filteredRows[bucket[0]];
      for (const col of categoricalCols) {
        values[col] = String(firstRow[col] ?? '');
      }

      // Numeric ranges
      for (const col of numericCols) {
        let min = Infinity;
        let max = -Infinity;
        for (const idx of bucket) {
          const val = Number(filteredRows[idx][col]);
          if (!isNaN(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
        values[col] = [min, max];
      }

      scenarios.push({
        values,
        rowCount: bucket.length,
        matchingRowIndices: bucket,
      });
    }
  }

  return scenarios;
}
