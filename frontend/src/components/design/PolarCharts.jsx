import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceDot
} from 'recharts';

const CHART_COLORS = {
  primary: '#A78BFA',    // violet-400
  secondary: '#F0ABFC',  // fuchsia-300
  accent: '#34d399',     // emerald-400
  grid: '#1e1e2e',       // obsidian grid
  text: '#71717a',       // zinc-500
  designDot: '#f59e0b',  // amber-500
};

const CustomTooltip = ({ active, payload, label, xLabel, yLabel }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="surface-card rounded-lg px-3 py-2 border border-white/[0.06] shadow-xl">
      <p className="text-zinc-400 text-xs mb-1">
        {xLabel}: <span className="text-white font-mono">{typeof label === 'number' ? label.toFixed(2) : label}</span>
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {yLabel || entry.name}: <span className="font-mono font-bold">{typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value}</span>
        </p>
      ))}
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="surface-card rounded-xl p-4 border border-white/[0.04]">
    <h4 className="text-xs font-semibold text-zinc-500 mb-3 text-center uppercase tracking-wider">{title}</h4>
    <div className="h-56">
      {children}
    </div>
  </div>
);

const PolarCharts = ({ polarData, designPoint, alpha, onClose }) => {
  if (!polarData || !polarData.alpha) return null;

  // Transform arrays into recharts data format
  const chartData = polarData.alpha.map((a, i) => ({
    alpha: parseFloat(a.toFixed(2)),
    CL: polarData.CL[i],
    CD: polarData.CD[i],
    CM: polarData.CM[i],
    LD: polarData.LD[i],
  }));

  // For drag polar (CL vs CD), we need CD on x-axis
  const dragPolarData = chartData.map(d => ({
    CD: d.CD,
    CL: d.CL,
  }));

  // Design point values
  const dp = {
    alpha: parseFloat(alpha),
    CL: designPoint?.CL,
    CD: designPoint?.CD,
    CM: designPoint?.CM,
    LD: designPoint?.['L/D'] || designPoint?.LD,
  };

  const commonAxisProps = {
    tick: { fill: CHART_COLORS.text, fontSize: 11 },
    axisLine: { stroke: CHART_COLORS.grid },
    tickLine: { stroke: CHART_COLORS.grid },
  };

  return (
    <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="surface-card-elevated rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-modal-content border border-violet-500/10 shadow-2xl shadow-violet-500/5">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <TrendingUp className="w-6 h-6 text-violet-400" />
              <div className="absolute inset-0 blur-lg bg-violet-500/20 animate-breathe" />
            </div>
            <h3 className="text-2xl font-bold text-gradient tracking-tight">Aerodynamic Polars</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors btn-press p-2 hover:bg-white/[0.04] rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-zinc-500 text-sm mb-4">
          Interactive aerodynamic performance curves. Hover for exact values.
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2 align-middle" /> = design point
        </p>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* CL vs Alpha */}
          <ChartCard title="Lift Curve (CL vs \u03b1)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="alpha" {...commonAxisProps} label={{ value: '\u03b1 (\u00b0)', position: 'insideBottom', offset: -2, fill: CHART_COLORS.text, fontSize: 11 }} />
                <YAxis {...commonAxisProps} label={{ value: 'CL', angle: -90, position: 'insideLeft', fill: CHART_COLORS.text, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="\u03b1" yLabel="CL" />} />
                <Line type="monotone" dataKey="CL" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                {dp.CL != null && <ReferenceDot x={dp.alpha} y={dp.CL} r={6} fill={CHART_COLORS.designDot} stroke="#fff" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* CD vs Alpha */}
          <ChartCard title="Drag Curve (CD vs \u03b1)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="alpha" {...commonAxisProps} label={{ value: '\u03b1 (\u00b0)', position: 'insideBottom', offset: -2, fill: CHART_COLORS.text, fontSize: 11 }} />
                <YAxis {...commonAxisProps} tickFormatter={(v) => v.toFixed(4)} label={{ value: 'CD', angle: -90, position: 'insideLeft', fill: CHART_COLORS.text, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="\u03b1" yLabel="CD" />} />
                <Line type="monotone" dataKey="CD" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
                {dp.CD != null && <ReferenceDot x={dp.alpha} y={dp.CD} r={6} fill={CHART_COLORS.designDot} stroke="#fff" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Drag Polar (CL vs CD) */}
          <ChartCard title="Drag Polar (CL vs CD)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dragPolarData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="CD" type="number" {...commonAxisProps} tickFormatter={(v) => v.toFixed(4)} label={{ value: 'CD', position: 'insideBottom', offset: -2, fill: CHART_COLORS.text, fontSize: 11 }} />
                <YAxis dataKey="CL" type="number" {...commonAxisProps} label={{ value: 'CL', angle: -90, position: 'insideLeft', fill: CHART_COLORS.text, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="CD" yLabel="CL" />} />
                <Line type="monotone" dataKey="CL" stroke={CHART_COLORS.accent} strokeWidth={2} dot={false} />
                {dp.CD != null && dp.CL != null && <ReferenceDot x={dp.CD} y={dp.CL} r={6} fill={CHART_COLORS.designDot} stroke="#fff" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* L/D vs Alpha */}
          <ChartCard title="Efficiency (L/D vs \u03b1)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="alpha" {...commonAxisProps} label={{ value: '\u03b1 (\u00b0)', position: 'insideBottom', offset: -2, fill: CHART_COLORS.text, fontSize: 11 }} />
                <YAxis {...commonAxisProps} label={{ value: 'L/D', angle: -90, position: 'insideLeft', fill: CHART_COLORS.text, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="\u03b1" yLabel="L/D" />} />
                <Line type="monotone" dataKey="LD" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                {dp.LD != null && <ReferenceDot x={dp.alpha} y={dp.LD} r={6} fill={CHART_COLORS.designDot} stroke="#fff" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* CM vs Alpha */}
          <ChartCard title="Moment (CM vs \u03b1)">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="alpha" {...commonAxisProps} label={{ value: '\u03b1 (\u00b0)', position: 'insideBottom', offset: -2, fill: CHART_COLORS.text, fontSize: 11 }} />
                <YAxis {...commonAxisProps} label={{ value: 'CM', angle: -90, position: 'insideLeft', fill: CHART_COLORS.text, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="\u03b1" yLabel="CM" />} />
                <Line type="monotone" dataKey="CM" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
                {dp.CM != null && <ReferenceDot x={dp.alpha} y={dp.CM} r={6} fill={CHART_COLORS.designDot} stroke="#fff" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Design Point Summary Card */}
          <ChartCard title="Design Point">
            <div className="flex flex-col justify-center h-full space-y-3 px-2">
              {[
                { label: '\u03b1', value: dp.alpha, unit: '\u00b0', precision: 1 },
                { label: 'CL', value: dp.CL, precision: 4 },
                { label: 'CD', value: dp.CD, precision: 5 },
                { label: 'L/D', value: dp.LD, precision: 1 },
                { label: 'CM', value: dp.CM, precision: 4 },
              ].map(({ label, value, unit, precision }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">{label}</span>
                  <span className="text-white font-mono font-bold text-sm">
                    {value != null ? value.toFixed(precision) : 'N/A'}{unit || ''}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Close button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/20 transition-all btn-press font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolarCharts;
