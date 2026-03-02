import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { AVIATION_FACTS } from '../../constants';

const LoadingModal = ({ isVisible }) => {
  const [factIndex, setFactIndex] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setProgress(0);
      const factInterval = setInterval(() => {
        setFactVisible(false);
        setTimeout(() => {
          setFactIndex(Math.floor(Math.random() * AVIATION_FACTS.length));
          setFactVisible(true);
        }, 400);
      }, 4000);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 8;
        });
      }, 600);

      return () => {
        clearInterval(factInterval);
        clearInterval(progressInterval);
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="text-center max-w-lg w-full animate-modal-content">
        {/* Orbital Spinner */}
        <div className="relative w-36 h-36 mx-auto mb-10">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border border-violet-500/15" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400 border-r-violet-400/30"
            style={{ animation: 'spin-slow 2s linear infinite' }}
          />
          {/* Middle ring */}
          <div className="absolute inset-3 rounded-full border border-transparent border-b-fuchsia-400/60 border-l-fuchsia-400/30"
            style={{ animation: 'counter-spin 3s linear infinite' }}
          />
          {/* Inner glow */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 animate-breathe flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-500/30 animate-breathe" />
          </div>
          {/* Ambient glow */}
          <div className="absolute inset-0 blur-3xl bg-violet-500/10 animate-breathe" />
        </div>

        {/* Title */}
        <h3 className="text-3xl font-extrabold text-gradient mb-3 animate-fade-in tracking-tight">
          Crafting Your Airfoil...
        </h3>

        <p className="text-zinc-500 mb-8 animate-fade-in text-sm font-medium" style={{ animationDelay: '100ms' }}>
          Optimizing aerodynamics with AI-powered algorithms
        </p>

        {/* Progress Bar */}
        <div className="max-w-xs mx-auto mb-10">
          <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(progress, 95)}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-600 mt-2.5 tabular-nums font-mono">{Math.round(Math.min(progress, 95))}%</p>
        </div>

        {/* Aviation Fact */}
        <div className={`surface-card rounded-xl p-5 max-w-md mx-auto transition-all duration-400 ${factVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Info className="w-3.5 h-3.5 text-violet-400" />
            <p className="text-violet-400/80 text-[10px] font-bold tracking-[0.15em] uppercase">Did you know?</p>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed" key={factIndex}>
            {AVIATION_FACTS[factIndex]}
          </p>
        </div>

        {/* Loading dots */}
        <div className="mt-8 flex gap-1.5 justify-center">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 bg-violet-400/60 rounded-full"
              style={{
                animation: 'float 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;
