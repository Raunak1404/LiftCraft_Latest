import React from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, GitCompare } from 'lucide-react';

const DesignComparison = ({ designs, onClose }) => {
  if (!designs || designs.length < 2) return null;

  const colors = ['#6366F1', '#10B981', '#F59E0B'];

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
    if (trend === 'worst') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-3 glass-effect border border-indigo-500/30 rounded-xl hover:border-indigo-400/50 transition-all btn-press flex items-center gap-2 text-slate-200 group"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="hidden sm:inline">Back to Designer</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <GitCompare className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gradient">
                Design Comparison
              </h1>
            </div>
          </div>
          <div className="hidden sm:block text-slate-400 text-sm">
            Comparing {designs.length} designs
          </div>
        </div>

        <div className="glass-effect border border-indigo-500/20 rounded-2xl overflow-hidden shadow-2xl">
          {/* Designs Overview */}
          <div className="p-6 border-b border-indigo-500/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {designs.map((design, i) => (
              <div
                key={design.id}
                className="glass-effect border-2 rounded-xl p-4 card-hover animate-scale-in"
                style={{ borderColor: `${colors[i]}40`, animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold" style={{ color: colors[i] }}>
                    Design {i + 1}
                  </h3>
                  <div
                    className="w-4 h-4 rounded-full shadow-lg"
                    style={{ backgroundColor: colors[i], boxShadow: `0 0 12px ${colors[i]}40` }}
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-200">{formatDate(design.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="text-slate-200 capitalize">{design.inputs?.airfoil_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Parameters */}
          <div className="p-6 border-b border-indigo-500/20 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h3 className="text-xl font-bold text-gradient mb-4">Input Parameters</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-indigo-500/20">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Parameter</th>
                    {designs.map((_, i) => (
                      <th key={i} className="text-center py-3 px-4" style={{ color: colors[i] }}>
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
                    <tr key={param.key} className="border-b border-indigo-500/10 hover:bg-indigo-500/5 transition-colors">
                      <td className="py-3 px-4 text-slate-300 font-medium">{param.label}</td>
                      {designs.map((design, i) => (
                        <td key={i} className="py-3 px-4 text-center text-slate-200 tabular-nums">
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
                  <tr className="border-b border-indigo-500/20">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Metric</th>
                    {designs.map((_, i) => (
                      <th key={i} className="text-center py-3 px-4" style={{ color: colors[i] }}>
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
                      <tr key={metric.key} className="border-b border-indigo-500/10 hover:bg-indigo-500/5 transition-colors">
                        <td className="py-3 px-4 text-slate-300 font-medium">{metric.label}</td>
                        {comparison.map((comp, i) => (
                          <td key={i} className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-slate-200 font-semibold tabular-nums">
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
          <div className="p-6 border-t border-indigo-500/20 bg-indigo-500/5 animate-fade-in" style={{ animationDelay: '400ms' }}>
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
                    className="glass-effect border-2 rounded-xl p-4 card-hover animate-count-reveal"
                    style={{ borderColor: `${colors[i]}40`, animationDelay: `${i * 120}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-bold" style={{ color: colors[i] }}>
                        Design {i + 1}
                      </h4>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: colors[i] }}>
                        {score}/3
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-300">
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
          <div className="p-4 border-t border-indigo-500/20 bg-slate-900/50 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Best</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-slate-400">Worst</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Neutral</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignComparison;
