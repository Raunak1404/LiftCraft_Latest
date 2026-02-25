import React from 'react';
import { Zap, Sparkles, Download, Activity, Wind, TrendingUp, ArrowRight } from 'lucide-react';
import MetricsDisplay from './MetricsDisplay';

const ResultsView = ({ results, onDownload, onNewDesign, onViewCp, onViewFlow, onViewPolars, canGenerate, getRemainingGenerations }) => {
  return (
    <div className="rounded-2xl glass-effect p-6 sm:p-8 shadow-2xl animate-blur-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 animate-fade-in">
          <div className="relative">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
            <div className="absolute inset-0 blur-lg bg-green-400/30 animate-breathe" />
          </div>
          <span className="text-gradient">Design Complete</span>
        </h2>
        <button
          onClick={onNewDesign}
          disabled={!canGenerate()}
          className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm sm:text-base btn-press group ${
            canGenerate()
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/30'
              : 'glass-effect text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          {canGenerate() ? `New Design (${getRemainingGenerations()} left)` : 'Limit Reached'}
          {canGenerate() && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
        </button>
      </div>

      <MetricsDisplay results={results} />

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 stagger-children">
        <button
          onClick={onViewCp}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up"
        >
          <Activity className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Pressure Distribution</span>
          <span className="sm:hidden">Cp Plot</span>
        </button>

        <button
          onClick={onViewFlow}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up"
        >
          <Wind className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Flow Field</span>
          <span className="sm:hidden">Streamlines</span>
        </button>

        <button
          onClick={onViewPolars}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up"
        >
          <TrendingUp className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">View Polars</span>
          <span className="sm:hidden">Polars</span>
        </button>

        <button
          onClick={onDownload}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-green-500/30 transition-all duration-300 btn-press group flex items-center justify-center gap-2 animate-fade-in-up"
        >
          <Download className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Download PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
