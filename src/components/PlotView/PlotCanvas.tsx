import React from 'react';
// @ts-ignore - no types for react-plotly.js
import Plot from 'react-plotly.js';

interface PlotCanvasProps {
  data: any[];
  layout: any;
}

export default function PlotCanvas({ data, layout }: PlotCanvasProps) {
  return (
    <Plot
      data={data}
      layout={{ ...layout, autosize: true }}
      config={{
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      }}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
    />
  );
}
