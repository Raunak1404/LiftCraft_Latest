import React from 'react';
import { Info, Flame, BookOpen, CheckCircle } from 'lucide-react';
import { DAILY_LIMIT } from '../../constants';

const QuickGuide = ({ dailyUsage, getRemainingGenerations }) => {
  const remaining = getRemainingGenerations();

  return (
    <div className="rounded-2xl surface-card p-5 sm:p-7 shadow-2xl shadow-violet-500/[0.03] h-full animate-slide-in-right">
      <div className="flex items-center gap-3 mb-7">
        <div className="p-2.5 rounded-xl bg-violet-500/8 border border-violet-500/15">
          <Info className="w-5 h-5 text-violet-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gradient tracking-tight">Quick Guide</h2>
      </div>

      <div className="space-y-3.5 stagger-children">
        <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-xl p-4 hover-lift animate-fade-in-up">
          <h3 className="font-bold text-amber-300 mb-2 flex items-center gap-2 text-sm">
            <Flame className="w-4 h-4" />
            Daily Limit
          </h3>
          <p className="text-zinc-500 text-xs mb-3">
            {DAILY_LIMIT} designs per day, resets at midnight
          </p>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  remaining > 2 ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' :
                  remaining > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
                style={{ width: `${(dailyUsage / DAILY_LIMIT) * 100}%`, animation: 'progress-fill 1s ease-out' }}
              />
            </div>
            <span className="text-violet-300 font-mono text-xs tabular-nums">{dailyUsage}/{DAILY_LIMIT}</span>
          </div>
        </div>

        <div className="bg-violet-500/[0.04] border border-violet-500/10 rounded-xl p-4 hover-lift animate-fade-in-up">
          <h3 className="font-bold text-violet-300 mb-2 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Parameters
          </h3>
          <ul className="text-xs space-y-2 text-zinc-500">
            <li className="flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-violet-500/50" />
              CL: -2 to 3
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-violet-500/50" />
              Alpha: -20&deg; to 20&deg;
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-violet-500/50" />
              Reynolds: 10&#8308; to 10&#8311;
            </li>
          </ul>
        </div>

        <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-4 hover-lift animate-fade-in-up">
          <h3 className="font-bold text-emerald-300 mb-2 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            You'll Receive
          </h3>
          <ul className="text-xs space-y-2 text-zinc-500">
            <li className="flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
              Optimized geometry
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
              Performance metrics
            </li>
            <li className="flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
              Professional PDF report
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuickGuide;
