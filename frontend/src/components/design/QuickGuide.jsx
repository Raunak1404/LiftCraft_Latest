import React from 'react';
import { Info, Flame, BookOpen, CheckCircle } from 'lucide-react';
import { DAILY_LIMIT } from '../../constants';

const QuickGuide = ({ dailyUsage, getRemainingGenerations }) => {
  const remaining = getRemainingGenerations();

  return (
    <div className="rounded-2xl glass-effect p-4 sm:p-6 shadow-2xl h-full animate-slide-in-right">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <Info className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gradient">Quick Guide</h2>
      </div>

      <div className="space-y-3 sm:space-y-4 stagger-children">
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 sm:p-4 hover-lift animate-fade-in-up">
          <h3 className="font-bold text-cyan-300 mb-2 flex items-center gap-2 text-sm">
            <Flame className="w-4 h-4" />
            Daily Limit
          </h3>
          <p className="text-cyan-200/70 text-xs mb-3">
            {DAILY_LIMIT} designs per day, resets at midnight
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  remaining > 2 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                  remaining > 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  'bg-gradient-to-r from-red-500 to-red-700'
                }`}
                style={{ width: `${(dailyUsage / DAILY_LIMIT) * 100}%`, animation: 'progress-fill 1s ease-out' }}
              />
            </div>
            <span className="text-cyan-400 font-mono text-xs tabular-nums">{dailyUsage}/{DAILY_LIMIT}</span>
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 sm:p-4 hover-lift animate-fade-in-up">
          <h3 className="font-bold text-blue-300 mb-2 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Parameters
          </h3>
          <ul className="text-xs space-y-1.5 text-blue-200/70">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/60" />
              CL: -2 to 3
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/60" />
              Alpha: -20&deg; to 20&deg;
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/60" />
              Reynolds: 10&#8308; to 10&#8311;
            </li>
          </ul>
        </div>

        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 sm:p-4 hover-lift animate-fade-in-up">
          <h3 className="font-bold text-green-300 mb-2 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            You'll Receive
          </h3>
          <ul className="text-xs space-y-1.5 text-green-200/70">
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-green-400/60" />
              Optimized geometry
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-green-400/60" />
              Performance metrics
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-green-400/60" />
              Professional PDF report
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuickGuide;
