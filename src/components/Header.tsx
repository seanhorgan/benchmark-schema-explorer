import { Layout, ExternalLink } from 'lucide-react';
import type { AppMode } from '../data/types';
import { cn } from '../lib/utils';
import LoadFilesDropdown from './LoadFilesDropdown';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  reportCount: number;
}

const modeTabs: { label: string; value: AppMode }[] = [
  { label: 'Schema Explorer', value: 'explorer' },
  { label: 'Analysis Builder', value: 'analysis' },
  { label: 'Scenarios', value: 'scenario' },
  { label: 'Plot View', value: 'plot' },
];

export default function Header({ mode, onModeChange, reportCount }: HeaderProps) {
  return (
    <header className="border-b border-[#141414] p-4 flex items-center justify-between sticky top-0 bg-[#E4E3E0] z-50">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#141414] rounded flex items-center justify-center">
          <Layout size={16} className="text-[#E4E3E0]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider">
            BENCHMARK ANALYZER
          </span>
          <span className="text-[9px] text-[#141414]/50 uppercase tracking-wider">
            v0.3.0 / LLM-D Benchmark
          </span>
        </div>
      </div>

      {/* Center: Mode Tabs */}
      <div className="flex items-center bg-[#141414]/10 rounded p-0.5 gap-0.5">
        {modeTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onModeChange(tab.value)}
            className={cn(
              'px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors',
              mode === tab.value
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'text-[#141414]/60 hover:text-[#141414]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right: Load Files + Report Count + GitHub */}
      <div className="flex items-center gap-3">
        <LoadFilesDropdown />
        {reportCount > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#141414] text-[#E4E3E0] px-2 py-0.5 rounded">
            {reportCount} report{reportCount !== 1 ? 's' : ''}
          </span>
        )}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#141414]/40 hover:text-[#141414] transition-colors"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </header>
  );
}
