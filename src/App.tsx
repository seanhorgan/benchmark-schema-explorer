/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnalysisProvider, useAnalysis } from './state/analysis-store';
import Header from './components/Header';
import SchemaExplorer from './components/SchemaExplorer/index';
import AnalysisBuilder from './components/AnalysisBuilder/index';
import ScenarioSelector from './components/ScenarioSelector/index';
import PlotView from './components/PlotView/index';

function AppContent() {
  const { state, dispatch } = useAnalysis();

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      <Header
        mode={state.mode}
        onModeChange={(mode) => dispatch({ type: 'SET_MODE', mode })}
        reportCount={state.reports.length}
      />
      {state.mode === 'explorer' && <SchemaExplorer />}
      {state.mode === 'analysis' && <AnalysisBuilder />}
      {state.mode === 'scenario' && <ScenarioSelector />}
      {state.mode === 'plot' && <PlotView />}
    </div>
  );
}

export default function App() {
  return (
    <AnalysisProvider>
      <AppContent />
    </AnalysisProvider>
  );
}
