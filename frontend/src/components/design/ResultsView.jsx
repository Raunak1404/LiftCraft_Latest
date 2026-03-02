import React from 'react';
import { Zap, Sparkles, Download, Activity, Wind, TrendingUp, ArrowRight } from 'lucide-react';
import MetricsDisplay from './MetricsDisplay';

const ResultsView = ({ results, onDownload, onNewDesign, onViewCp, onViewFlow, onViewPolars, canGenerate, getRemainingGenerations }) => {
  return (
    <div className="rounded-2xl surface-card p-6 sm:p-8 shadow-2xl shadow-violet-500/[0.03] animate-blur-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 animate-fade-in tracking-tight">
          <div className="relative">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
            <div className="absolute inset-0 blur-lg bg-emerald-400/25 animate-breathe" />
          </div>
          <span className="text-gradient">Design Complete</span>
        </h2>
        <button
          onClick={onNewDesign}
          disabled={!canGenerate()}
          className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm btn-press group ${
            canGenerate()
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
              : 'bg-white/[0.03] text-zinc-600 cursor-not-allowed border border-white/[0.06]'
          }`}
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          {canGenerate() ? `New Design (${getRemainingGenerations()} left)` : 'Limit Reached'}
          {canGenerate() && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
        </button>
      </div>

      <MetricsDisplay results={results} />

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 stagger-children">
        <button
          onClick={onViewCp}
          className="bg-gradient-to-br from-violet-600/90 to-violet-700/90 text-white font-semibold py-4 rounded-xl shadow-lg shadow-violet-500/15 hover:shadow-violet-500/25 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up text-sm"
        >
          <Activity className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Pressure Dist.</span>
          <span className="sm:hidden">Cp Plot</span>
        </button>

        <button
          onClick={onViewFlow}
          className="bg-gradient-to-br from-fuchsia-600/90 to-fuchsia-700/90 text-white font-semibold py-4 rounded-xl shadow-lg shadow-fuchsia-500/15 hover:shadow-fuchsia-500/25 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up text-sm"
        >
          <Wind className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Flow Field</span>
          <span className="sm:hidden">Streamlines</span>
        </button>

        <button
          onClick={onViewPolars}
          className="bg-gradient-to-br from-rose-600/90 to-rose-700/90 text-white font-semibold py-4 rounded-xl shadow-lg shadow-rose-500/15 hover:shadow-rose-500/25 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up text-sm"
        >
          <TrendingUp className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">View Polars</span>
          <span className="sm:hidden">Polars</span>
        </button>

        <button
          onClick={onDownload}
          className="bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 text-white font-semibold py-4 rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up text-sm"
        >
          <Download className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Download PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
