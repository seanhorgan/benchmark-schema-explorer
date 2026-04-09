import React, { useState } from 'react';
import type { UnifiedSchemaNode } from '../../data/types';
import { useAnalysis, getRoleForPath } from '../../state/analysis-store';
import RolePopover from './RolePopover';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnnotatedTreeProps {
  node: UnifiedSchemaNode;
  depth?: number;
}

const roleColors: Record<string, { bg: string; border: string; text: string }> = {
  filter: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-600' },
  key: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-600' },
  'x-axis': { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-600' },
  'y-axis': { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-600' },
  'y2-axis': { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-600' },
};

export default function AnnotatedTree({ node, depth = 0 }: AnnotatedTreeProps) {
  const { state } = useAnalysis();

  // Root children start expanded
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const child of node.children) {
      if (child.children.length > 0) {
        initial.add(child.path);
      }
    }
    return initial;
  });

  const [popoverPath, setPopoverPath] = useState<string | null>(null);

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (child: UnifiedSchemaNode, d: number) => {
    const isLeaf = child.children.length === 0 && child.columnMeta != null;
    const isExpanded = expandedPaths.has(child.path);
    const role = getRoleForPath(state, child.path);
    const colors = role ? roleColors[role] : null;

    if (!isLeaf) {
      // Non-leaf: expandable row
      return (
        <div key={child.path}>
          <div
            className={cn(
              'flex items-center gap-2 py-1.5 px-2 rounded-sm cursor-pointer hover:bg-[#141414]/5 transition-colors',
              colors && colors.bg
            )}
            style={{ paddingLeft: `${d * 16}px` }}
            onClick={() => toggleExpand(child.path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-50 flex-shrink-0" />
            )}
            <span className="font-mono text-sm font-medium">{child.name}</span>
            <span className="ml-auto text-xs font-mono opacity-40">
              {child.availableIn}/{child.totalReports}
            </span>
          </div>
          {isExpanded && (
            <div>
              {child.children.map(grandchild => renderNode(grandchild, d + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf: clickable row with optional popover
    return (
      <div key={child.path} className="relative">
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded-sm cursor-pointer hover:bg-[#141414]/5 transition-colors',
            colors && colors.bg,
            popoverPath === child.path && 'bg-[#141414]/5'
          )}
          style={{ paddingLeft: `${d * 16 + 20}px` }}
          onClick={() =>
            setPopoverPath(prev => (prev === child.path ? null : child.path))
          }
        >
          <span className="font-mono text-sm">{child.name}</span>
          {role && (
            <span
              className={cn(
                'text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border',
                colors?.bg,
                colors?.border,
                colors?.text
              )}
            >
              {role}
            </span>
          )}
          <span className="ml-auto text-xs font-mono opacity-40">
            {child.availableIn}/{child.totalReports}
          </span>
          <span className="text-[10px] font-mono opacity-30">{child.type}</span>
        </div>
        {popoverPath === child.path && child.columnMeta && (
          <RolePopover
            path={child.path}
            column={child.columnMeta}
            onClose={() => setPopoverPath(null)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {node.children.map(child => renderNode(child, depth))}
    </div>
  );
}
