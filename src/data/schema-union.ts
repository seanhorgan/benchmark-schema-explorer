import type { BenchmarkReport, UnifiedSchemaNode, UnifiedColumn } from './types';
import type { JsonSchema } from '../types';

/**
 * Resolve a $ref pointer (e.g. "#/definitions/ModelConfig") against the
 * root JSON Schema document.
 */
export function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  if (!ref.startsWith('#/')) return {};
  const parts = ref.split('/').slice(1);
  let current: any = root;
  for (const part of parts) {
    current = current?.[part];
    if (!current) return {};
  }
  return current as JsonSchema;
}

/**
 * Navigate a JSON Schema to find the `description` for a dot-separated path.
 * Handles `$ref` resolution and `anyOf`/`oneOf` variants.
 *
 * The first segment of `path` is expected to be "root" and is skipped.
 */
export function getDescriptionForPath(
  path: string,
  schema: JsonSchema,
): string | undefined {
  const parts = path.split('.');
  let current: JsonSchema = schema;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Resolve top-level $ref before descending
    if (current.$ref) {
      current = resolveRef(current.$ref, schema);
    }

    // Handle anyOf / oneOf – pick the first variant that has the property
    const options = current.anyOf || current.oneOf;
    if (options) {
      const found = options.find((option) => {
        const resolved = option.$ref
          ? resolveRef(option.$ref, schema)
          : option;
        return resolved.properties && resolved.properties[part];
      });
      if (found) {
        current = found.$ref ? resolveRef(found.$ref, schema) : found;
      }
    }

    if (current.properties && current.properties[part]) {
      current = current.properties[part];
    } else if (current.items && !Array.isArray(current.items)) {
      // Array items – step into the item schema
      current = current.items;
      // After stepping into items, retry the same key if it has properties
      if (current.$ref) {
        current = resolveRef(current.$ref, schema);
      }
      if (current.properties && current.properties[part]) {
        current = current.properties[part];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  // Final ref resolution
  if (current.$ref) {
    current = resolveRef(current.$ref, schema);
  }

  return current.description;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MAX_UNIQUE_VALUES = 100;

function detectType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // 'string' | 'number' | 'boolean' | 'object'
}

/**
 * Recursively walk a single data value and register every path in the
 * node map.  `counts` tracks how many reports contributed to each path.
 */
function walkValue(
  value: unknown,
  path: string,
  nodeMap: Map<string, UnifiedSchemaNode>,
  totalReports: number,
  reportIndex: number,
  seenPaths: Set<string>,
): void {
  if (value === null || value === undefined) return;

  const type = detectType(value);
  const name = path.split('.').pop() || path;

  // Create or update the node for this path
  let node = nodeMap.get(path);
  if (!node) {
    node = {
      path,
      name,
      type,
      availableIn: 0,
      totalReports,
      children: [],
    };
    nodeMap.set(path, node);
  }

  // Only count each report once per path
  if (!seenPaths.has(path)) {
    seenPaths.add(path);
    node.availableIn += 1;
  }

  // Leaf nodes get column metadata
  if (type === 'string' || type === 'number' || type === 'boolean') {
    if (!node.columnMeta) {
      node.columnMeta = {
        path,
        name,
        type: type as UnifiedColumn['type'],
        availableIn: node.availableIn,
        totalReports,
      };
    } else {
      node.columnMeta.availableIn = node.availableIn;
    }

    if (type === 'string') {
      if (!node.columnMeta.uniqueValues) {
        node.columnMeta.uniqueValues = [];
      }
      if (
        node.columnMeta.uniqueValues.length < MAX_UNIQUE_VALUES &&
        !node.columnMeta.uniqueValues.includes(value)
      ) {
        node.columnMeta.uniqueValues.push(value);
      }
    } else if (type === 'number') {
      const num = value as number;
      if (!node.columnMeta.range) {
        node.columnMeta.range = [num, num];
      } else {
        if (num < node.columnMeta.range[0]) node.columnMeta.range[0] = num;
        if (num > node.columnMeta.range[1]) node.columnMeta.range[1] = num;
      }
    }
    return;
  }

  if (type === 'object') {
    node.type = 'object';
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const childPath = `${path}.${key}`;
      walkValue(obj[key], childPath, nodeMap, totalReports, reportIndex, seenPaths);
    }
    return;
  }

  if (type === 'array') {
    node.type = 'array';
    const arr = value as unknown[];
    // Walk array elements using the array's own path (not indexed) so that
    // schema paths match the flat table's expanded-row paths.
    // e.g. root.items.name instead of root.items.0.name
    for (const element of arr) {
      if (element && typeof element === 'object' && !Array.isArray(element)) {
        // Array of objects: recurse each element's keys under the array path
        const obj = element as Record<string, unknown>;
        for (const key of Object.keys(obj)) {
          const childPath = `${path}.${key}`;
          walkValue(obj[key], childPath, nodeMap, totalReports, reportIndex, seenPaths);
        }
      } else if (element !== null && element !== undefined) {
        // Array of primitives: register the array path itself as a leaf
        // (handled by the parent node already having columnMeta if needed)
      }
    }
  }
}

/**
 * After all reports have been walked, assemble the flat node map into a tree
 * by linking children to their parent nodes.
 */
function buildTree(
  nodeMap: Map<string, UnifiedSchemaNode>,
): UnifiedSchemaNode {
  // Ensure the root node exists
  if (!nodeMap.has('root')) {
    nodeMap.set('root', {
      path: 'root',
      name: 'root',
      type: 'object',
      availableIn: 0,
      totalReports: 0,
      children: [],
    });
  }

  // Build parent->child relationships
  for (const [path, node] of nodeMap) {
    if (path === 'root') continue;
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1) continue;
    const parentPath = path.substring(0, lastDot);
    const parent = nodeMap.get(parentPath);
    if (parent) {
      parent.children.push(node);
    }
  }

  // Sort children alphabetically by name at every level
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  return nodeMap.get('root')!;
}

/**
 * Merge descriptions from a JSON Schema into every node of the unified tree.
 */
function applySchemaDescriptions(
  node: UnifiedSchemaNode,
  schema: JsonSchema,
): void {
  const desc = getDescriptionForPath(node.path, schema);
  if (desc) {
    node.description = desc;
    if (node.columnMeta) {
      node.columnMeta.description = desc;
    }
  }
  for (const child of node.children) {
    applySchemaDescriptions(child, schema);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a unified schema tree by walking every loaded benchmark report.
 *
 * Each unique path found across all reports becomes a `UnifiedSchemaNode`.
 * Leaf values (string, number, boolean) additionally get a `UnifiedColumn`
 * in `columnMeta` with aggregated statistics (unique values for strings,
 * min/max range for numbers).
 *
 * If a `JsonSchema` is provided, descriptions are merged into the tree.
 */
export function buildUnifiedSchema(
  reports: BenchmarkReport[],
  schema: JsonSchema | null,
): UnifiedSchemaNode {
  const totalReports = reports.length;
  const nodeMap = new Map<string, UnifiedSchemaNode>();

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const seenPaths = new Set<string>();
    walkValue(report.data, 'root', nodeMap, totalReports, i, seenPaths);
  }

  const root = buildTree(nodeMap);

  // Ensure root has correct totals
  root.totalReports = totalReports;
  root.availableIn = root.availableIn || totalReports;

  // Apply schema descriptions if a schema is available
  if (schema) {
    applySchemaDescriptions(root, schema);
  }

  return root;
}
