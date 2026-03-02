import React from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, GitCompare } from 'lucide-react';

const DesignComparison = ({ designs, onClose }) => {
  if (!designs || designs.length < 2) return null;

  const colors = ['#A78BFA', '#34D399', '#FBBF24'];

  const getComparison = (metric) => {
    const values = designs.map(d => d.results?.[metric] || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);

    return designs.map((d, i) => {
      const value = d.results?.[metric] || 0;
      let trend = 'neutral';
      if (metric === 'CD') {
        trend = value === min ? 'best' : value === max ? 'worst' : 'neutral';
      } else {
        trend = value === max ? 'best' : value === min ? 'worst' : 'neutral';
      }
      return { value, trend };
    });
  };

  const formatDate = (timestamp) => {
    try {
      return timestamp?.toDate().toLocaleString() || 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const TrendIcon = ({ trend }) => {
    if (trend === 'best') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trend === 'worst') return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-zinc-500" />;
  };

  return (
    <div className="min-h-screen bg-[#06060a] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-3 surface-card border border-white/[0.06] rounded-xl hover:border-violet-400/30 transition-all btn-press flex items-center gap-2 text-zinc-300 group"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="hidden sm:inline text-sm">Back to Designer</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-violet-500/8 border border-violet-500/15">
                <GitCompare className="w-6 h-6 text-violet-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gradient tracking-tight">
                Design Comparison
              </h1>
            </div>
          </div>
          <div className="hidden sm:block text-zinc-500 text-sm font-medium">
            Comparing {designs.length} designs
          </div>
        </div>

        <div className="surface-card-elevated border border-violet-500/10 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/5">
          {/* Designs Overview */}
          <div className="p-6 border-b border-white/[0.04] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {designs.map((design, i) => (
              <div
                key={design.id}
                className="surface-card border rounded-xl p-4 card-hover animate-scale-in"
                style={{ borderColor: `${colors[i]}25`, animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold" style={{ color: colors[i] }}>
                    Design {i + 1}
                  </h3>
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: colors[i], boxShadow: `0 0 12px ${colors[i]}30` }}
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Created:</span>
                    <span className="text-zinc-300">{formatDate(design.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Type:</span>
                    <span className="text-zinc-300 capitalize">{design.inputs?.airfoil_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Parameters */}
          <div className="p-6 border-b border-white/[0.04] animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h3 className="text-xl font-bold text-gradient mb-4">Input Parameters</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-4 text-zinc-500 font-semibold text-xs uppercase tracking-wider">Parameter</th>
                    {designs.map((_, i) => (
                      <th key={i} className="text-center py-3 px-4 text-xs uppercase tracking-wider font-semibold" style={{ color: colors[i] }}>
                        Design {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'CL_target', label: 'Target CL', format: (v) => v?.toFixed(2) },
                    { key: 'alpha', label: 'Angle of Attack', format: (v) => v?.toFixed(1) + '\u00B0' },
                    { key: 'Re', label: 'Reynolds Number', format: (v) => v?.toExponential(1) },
                    { key: 'Cm_target', label: 'Target CM', format: (v) => v?.toFixed(3) || 'N/A' },
                    { key: 'optimization_mode', label: 'Optimization', format: (v) => v || 'single' },
                  ].map((param) => (
                    <tr key={param.key} className="border-b border-white/[0.03] hover:bg-violet-500/[0.03] transition-colors">
                      <td className="py-3 px-4 text-zinc-400 font-medium text-sm">{param.label}</td>
                      {designs.map((design, i) => (
                        <td key={i} className="py-3 px-4 text-center text-zinc-200 tabular-nums text-sm">
                          {param.format(design.inputs?.[param.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <h3 className="text-xl font-bold text-gradient mb-4">Performance Metrics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-4 text-zinc-500 font-semibold text-xs uppercase tracking-wider">Metric</th>
                    {designs.map((_, i) => (
                      <th key={i} className="text-center py-3 px-4 text-xs uppercase tracking-wider font-semibold" style={{ color: colors[i] }}>
                        Design {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'CL', label: 'Lift Coefficient (CL)', format: (v) => v?.toFixed(4) },
                    { key: 'CD', label: 'Drag Coefficient (CD)', format: (v) => v?.toFixed(6) },
                    { key: 'LD', label: 'Lift-to-Drag Ratio (L/D)', format: (v) => v?.toFixed(2) },
                    { key: 'CM', label: 'Moment Coefficient (CM)', format: (v) => v?.toFixed(4) },
                  ].map((metric) => {
                    const comparison = getComparison(metric.key);
                    return (
                      <tr key={metric.key} className="border-b border-white/[0.03] hover:bg-violet-500/[0.03] transition-colors">
                        <td className="py-3 px-4 text-zinc-400 font-medium text-sm">{metric.label}</td>
                        {comparison.map((comp, i) => (
                          <td key={i} className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-zinc-200 font-semibold tabular-nums text-sm">
                                {metric.format(comp.value)}
                              </span>
                              <TrendIcon trend={comp.trend} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="p-6 border-t border-white/[0.04] bg-violet-500/[0.02] animate-fade-in" style={{ animationDelay: '400ms' }}>
            <h3 className="text-xl font-bold text-gradient mb-4">Performance Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {designs.map((design, i) => {
                const clComp = getComparison('CL');
                const cdComp = getComparison('CD');
                const ldComp = getComparison('LD');

                const score =
                  (clComp[i].trend === 'best' ? 1 : 0) +
                  (cdComp[i].trend === 'best' ? 1 : 0) +
                  (ldComp[i].trend === 'best' ? 1 : 0);

                return (
                  <div
                    key={design.id}
                    className="surface-card border rounded-xl p-4 card-hover animate-count-reveal"
                    style={{ borderColor: `${colors[i]}25`, animationDelay: `${i * 120}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-bold" style={{ color: colors[i] }}>
                        Design {i + 1}
                      </h4>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: colors[i] }}>
                        {score}/3
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={clComp[i].trend} />
                        <span>Lift Coefficient</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={cdComp[i].trend} />
                        <span>Drag Coefficient</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={ldComp[i].trend} />
                        <span>L/D Ratio</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-white/[0.04] bg-[#06060a]/50 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-500">Best</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span className="text-zinc-500">Worst</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-zinc-600" />
              <span className="text-zinc-500">Neutral</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignComparison;
