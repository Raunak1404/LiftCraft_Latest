import React, { useState, useEffect, useRef } from 'react';

const AnimatedNumber = ({ value, decimals = 4, duration = 1200 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const numValue = parseFloat(value) || 0;

  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(numValue * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [numValue, duration]);

  return <span className="tabular-nums font-mono">{display.toFixed(decimals)}</span>;
};

const MetricsDisplay = ({ results }) => {
  if (!results) return null;

  const metrics = [
    { label: 'CL', value: results.CL, decimals: 4, borderColor: 'border-violet-500/15', textColor: 'text-violet-300', labelColor: 'text-violet-400/60', gradient: 'from-violet-500/8 to-violet-600/3', glowColor: 'shadow-violet-500/5' },
    { label: 'CD', value: results.CD, decimals: 6, borderColor: 'border-emerald-500/15', textColor: 'text-emerald-300', labelColor: 'text-emerald-400/60', gradient: 'from-emerald-500/8 to-emerald-600/3', glowColor: 'shadow-emerald-500/5' },
    { label: 'L/D', value: results.LD, decimals: 2, borderColor: 'border-amber-500/15', textColor: 'text-amber-300', labelColor: 'text-amber-400/60', gradient: 'from-amber-500/8 to-amber-600/3', glowColor: 'shadow-amber-500/5' },
    { label: 'CM', value: results.CM, decimals: 4, borderColor: 'border-rose-500/15', textColor: 'text-rose-300', labelColor: 'text-rose-400/60', gradient: 'from-rose-500/8 to-rose-600/3', glowColor: 'shadow-rose-500/5' }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 stagger-children">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`bg-gradient-to-br ${metric.gradient} border ${metric.borderColor} rounded-xl p-4 sm:p-5 card-hover shadow-lg ${metric.glowColor} animate-count-reveal`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <p className={`${metric.labelColor} text-[10px] mb-2 font-semibold tracking-widest uppercase`}>{metric.label}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${metric.textColor}`}>
            <AnimatedNumber value={metric.value} decimals={metric.decimals} duration={1200 + index * 200} />
          </p>
        </div>
      ))}
    </div>
  );
};

export default MetricsDisplay;
