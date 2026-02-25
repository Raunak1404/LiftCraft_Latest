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

  return <span className="tabular-nums">{display.toFixed(decimals)}</span>;
};

const MetricsDisplay = ({ results }) => {
  if (!results) return null;

  const metrics = [
    { label: 'CL', value: results.CL, decimals: 4, color: 'cyan', borderColor: 'border-cyan-500/30', textColor: 'text-cyan-300', labelColor: 'text-cyan-400/70', gradient: 'from-cyan-500/10 to-cyan-600/5' },
    { label: 'CD', value: results.CD, decimals: 6, color: 'green', borderColor: 'border-green-500/30', textColor: 'text-green-300', labelColor: 'text-green-400/70', gradient: 'from-green-500/10 to-green-600/5' },
    { label: 'L/D', value: results.LD, decimals: 2, color: 'yellow', borderColor: 'border-yellow-500/30', textColor: 'text-yellow-300', labelColor: 'text-yellow-400/70', gradient: 'from-yellow-500/10 to-yellow-600/5' },
    { label: 'CM', value: results.CM, decimals: 4, color: 'blue', borderColor: 'border-blue-500/30', textColor: 'text-blue-300', labelColor: 'text-blue-400/70', gradient: 'from-blue-500/10 to-blue-600/5' }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 stagger-children">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`bg-gradient-to-br ${metric.gradient} border ${metric.borderColor} rounded-xl p-4 sm:p-5 card-hover animate-count-reveal`}
          style={{ animationDelay: `${index * 120}ms` }}
        >
          <p className={`${metric.labelColor} text-xs mb-1.5 font-medium tracking-wide`}>{metric.label}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${metric.textColor}`}>
            <AnimatedNumber value={metric.value} decimals={metric.decimals} duration={1200 + index * 200} />
          </p>
        </div>
      ))}
    </div>
  );
};

export default MetricsDisplay;
