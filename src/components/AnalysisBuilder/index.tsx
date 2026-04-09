import React from 'react';
import AnnotatedTree from './AnnotatedTree';
import AnalysisConfig from './AnalysisConfig';
import { useAnalysis } from '../../state/analysis-store';

export default function AnalysisBuilder() {
  const { state } = useAnalysis();
  if (!state.unifiedSchema) {
    return (
      <main className="flex h-[calc(100vh-65px)] items-center justify-center">
        <p className="text-sm font-mono uppercase opacity-40">Load benchmark reports to begin analysis</p>
      </main>
    );
  }
  return (
    <main className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden">
      <section className="flex-1 overflow-hidden border-r border-[#141414]">
        <div className="p-6 h-full flex flex-col">
          <h2 className="font-serif italic text-xl mb-4">Select Columns</h2>
          <div className="flex-1 overflow-auto">
            <AnnotatedTree node={state.unifiedSchema} />
          </div>
        </div>
      </section>
      <aside className="w-full lg:w-[450px] bg-[#141414] text-[#E4E3E0] overflow-y-auto">
        <AnalysisConfig />
      </aside>
    </main>
  );
}
