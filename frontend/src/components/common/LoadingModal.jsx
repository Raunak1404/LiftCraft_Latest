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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="text-center max-w-lg w-full animate-modal-content">
        {/* Orbital Spinner */}
        <div className="relative w-36 h-36 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/50"
            style={{ animation: 'spin-slow 2s linear infinite' }}
          />
          {/* Middle ring */}
          <div className="absolute inset-3 rounded-full border-2 border-transparent border-b-blue-400 border-l-blue-400/50"
            style={{ animation: 'counter-spin 3s linear infinite' }}
          />
          {/* Inner glow */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 animate-breathe flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/40 animate-breathe" />
          </div>
          {/* Ambient glow */}
          <div className="absolute inset-0 blur-3xl bg-cyan-400/15 animate-breathe" />
        </div>

        {/* Title */}
        <h3 className="text-3xl font-bold text-gradient mb-3 animate-fade-in">
          Crafting Your Airfoil...
        </h3>

        <p className="text-slate-400 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          Optimizing aerodynamics with AI-powered algorithms
        </p>

        {/* Progress Bar */}
        <div className="max-w-xs mx-auto mb-8">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(progress, 95)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">{Math.round(Math.min(progress, 95))}%</p>
        </div>

        {/* Aviation Fact */}
        <div className={`glass-effect rounded-xl p-5 max-w-md mx-auto transition-all duration-400 ${factVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Info className="w-4 h-4 text-cyan-400" />
            <p className="text-cyan-400 text-xs font-semibold tracking-wide uppercase">Did you know?</p>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed" key={factIndex}>
            {AVIATION_FACTS[factIndex]}
          </p>
        </div>

        {/* Loading dots */}
        <div className="mt-8 flex gap-1.5 justify-center">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
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
