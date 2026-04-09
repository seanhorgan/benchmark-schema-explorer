import type { BenchmarkReport, FlatRow } from './types';

const ARRAY_OF_OBJECTS_MARKER = Symbol('ARRAY_OF_OBJECTS');

interface ArrayOfObjectsMarker {
  __marker: typeof ARRAY_OF_OBJECTS_MARKER;
  items: Record<string, any>[];
  key: string;
}

function isArrayOfObjectsMarker(value: any): value is ArrayOfObjectsMarker {
  return value && typeof value === 'object' && value.__marker === ARRAY_OF_OBJECTS_MARKER;
}

function isPrimitive(value: any): value is string | number | boolean {
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean';
}

function isArrayOfPrimitives(arr: any[]): boolean {
  return arr.every((item) => isPrimitive(item));
}

/**
 * Recursively flatten an object into dot-separated path keys.
 *
 * - Nested objects: keys are joined with dots (e.g. `config.threads`)
 * - Arrays of primitives: stored as-is under the path key
 * - Arrays of objects: returns a special marker so the caller can expand rows
 */
export function flattenObject(
  obj: any,
  prefix: string,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      // Skip null/undefined values
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        // Store empty arrays as-is
        result[path] = value;
      } else if (isArrayOfPrimitives(value)) {
        // Arrays of primitives are stored directly
        result[path] = value;
      } else {
        // Arrays of objects get a marker so the caller knows to expand
        const flattenedItems = value.map((item) => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            return flattenObject(item, '');
          }
          // Mixed arrays - treat as primitive array
          return item;
        });

        // Check if all items were actually objects
        const allObjects = flattenedItems.every(
          (item) => typeof item === 'object' && item !== null && !Array.isArray(item),
        );

        if (allObjects) {
          result[path] = {
            __marker: ARRAY_OF_OBJECTS_MARKER,
            items: flattenedItems as Record<string, any>[],
            key: path,
          } satisfies ArrayOfObjectsMarker;
        } else {
          result[path] = value;
        }
      }
    } else if (typeof value === 'object') {
      // Recurse into nested objects
      const nested = flattenObject(value, path);
      Object.assign(result, nested);
    } else if (isPrimitive(value)) {
      // Leaf values
      result[path] = value;
    }
  }

  return result;
}

/**
 * Build a flat table from benchmark reports.
 *
 * Each report is flattened into one or more rows. If the report data contains
 * arrays of objects at the top level, each array element becomes a separate row
 * sharing the same `_report_id` but with distinct `_row_id` values.
 */
export function buildFlatTable(reports: BenchmarkReport[]): FlatRow[] {
  const rows: FlatRow[] = [];

  for (const report of reports) {
    const flat = flattenObject(report.data, 'root');

    // Collect array-of-objects markers and plain columns
    const arrayMarkers: ArrayOfObjectsMarker[] = [];
    const baseColumns: Record<string, any> = {};

    for (const [key, value] of Object.entries(flat)) {
      if (isArrayOfObjectsMarker(value)) {
        arrayMarkers.push(value);
      } else {
        baseColumns[key] = value;
      }
    }

    if (arrayMarkers.length === 0) {
      // No arrays of objects - single row per report
      rows.push({
        _report_id: report.id,
        _row_id: `${report.id}_0`,
        ...baseColumns,
      });
    } else {
      // Expand arrays of objects into multiple rows.
      // If there are multiple array-of-objects fields, we expand the one with
      // the most items and replicate others per-row (matching by index).
      const maxLength = Math.max(...arrayMarkers.map((m) => m.items.length));

      for (let i = 0; i < maxLength; i++) {
        const row: FlatRow = {
          _report_id: report.id,
          _row_id: `${report.id}_${i}`,
          ...baseColumns,
        };

        for (const marker of arrayMarkers) {
          if (i < marker.items.length) {
            const item = marker.items[i];
            for (const [itemKey, itemValue] of Object.entries(item)) {
              const fullPath = itemKey ? `${marker.key}.${itemKey}` : marker.key;
              row[fullPath] = itemValue;
            }
          }
        }

        rows.push(row);
      }
    }
  }

  return rows;
}

/**
 * Extract all values for a given column path from the flat table,
 * filtering out undefined and null values.
 */
export function getColumnValue(rows: FlatRow[], path: string): any[] {
  return rows
    .map((row) => row[path])
    .filter((value) => value !== undefined && value !== null);
}
