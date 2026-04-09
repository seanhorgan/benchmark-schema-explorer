import React, { useMemo } from 'react';
import { useAnalysis } from '../../state/analysis-store';
import PlotCanvas from './PlotCanvas';
import PlotOptions from './PlotOptions';
import {
  autoSelectPlotType,
  buildLinePlot,
  buildParetoPlot,
} from './plot-builders';

export default function PlotView() {
  const { state, plotRows } = useAnalysis();

  const plotData = useMemo(() => {
    const effectiveType =
      state.plotType === 'auto'
        ? autoSelectPlotType(state.xAxis, state.yAxis, state.y2Axis)
        : state.plotType;

    if (!state.yAxis) return null;

    switch (effectiveType) {
      case 'line':
        if (!state.xAxis) return null;
        return buildLinePlot({
          filteredRows: plotRows,
          configKeys: state.configKeys,
          xAxis: state.xAxis,
          yAxis: state.yAxis,
          scenarioFilters: state.scenarioFilters,
          xScale: state.xScale,
          yScale: state.yScale,
        });
      case 'pareto':
        if (!state.xAxis || !state.y2Axis) return null;
        return buildParetoPlot({
          filteredRows: plotRows,
          configKeys: state.configKeys,
          xAxis: state.xAxis,
          yAxis: state.yAxis,
          y2Axis: state.y2Axis,
          scenarioFilters: state.scenarioFilters,
          showFrontier: state.showParetoFrontier,
          slo: state.slo,
          xScale: state.xScale,
          yScale: state.yScale,
          xHigherBetter: state.yAxisDirection === 'higher',
          yHigherBetter: state.y2AxisDirection === 'higher',
        });
      default:
        return null;
    }
  }, [state, plotRows]);

  return (
    <main className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden">
      <section className="flex-1 overflow-hidden border-r border-[#141414]">
        <div className="p-6 h-full">
          {plotData ? (
            <PlotCanvas data={plotData.data} layout={plotData.layout} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm font-mono uppercase opacity-40">
                Configure axes in Analysis Builder to generate a plot
              </p>
            </div>
          )}
        </div>
      </section>
      <aside className="w-full lg:w-[450px] bg-[#141414] text-[#E4E3E0] overflow-y-auto">
        <PlotOptions />
      </aside>
    </main>
  );
}
