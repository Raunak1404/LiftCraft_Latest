import React, { useState, useEffect } from 'react';
import { X, Activity, Loader } from 'lucide-react';
import { API_URL } from '../../constants';

const CpVisualization = ({ airfoilData, alpha, mach, onClose }) => {
  const [cpData, setCpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCpData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure alpha is a number
        const alphaNum = parseFloat(alpha) || 0.0;
        
        console.log('Fetching Cp with:', {
          x_coords_length: airfoilData.x_coords?.length,
          y_coords_length: airfoilData.y_coords?.length,
          alpha: alphaNum,
          alpha_type: typeof alphaNum
        });

        const machNum = parseFloat(mach) || 0.0;

        const response = await fetch(`${API_URL}/api/cp-distribution`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x_coords: airfoilData.x_coords,
            y_coords: airfoilData.y_coords,
            alpha: alphaNum,
            n_panels: 150,
            mach: machNum
          })
        });

        const data = await response.json();

        if (data.success) {
          setCpData(data.cp_data);
        } else {
          setError(data.error || 'Failed to compute Cp distribution');
        }
      } catch (err) {
        setError(`Failed to fetch Cp data: ${err.message}`);
        console.error('Cp fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (airfoilData) {
      fetchCpData();
    }
  }, [airfoilData, alpha, mach]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-modal-backdrop">
        <div className="surface-card-elevated rounded-2xl p-8 max-w-4xl w-full animate-modal-content border border-violet-500/10">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader className="w-12 h-12 text-violet-400 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-violet-500/25 animate-breathe" />
            </div>
            <p className="text-white text-lg animate-fade-in font-medium">Computing pressure distribution...</p>
            <p className="text-zinc-500 text-sm animate-fade-in" style={{ animationDelay: '200ms' }}>Vortex panel method analysis</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-modal-backdrop">
        <div className="surface-card-elevated rounded-2xl p-8 max-w-4xl w-full animate-modal-content border border-violet-500/10">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-2xl font-bold text-rose-400">Error</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors btn-press p-2 hover:bg-white/[0.04] rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/20 transition-all btn-press"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!cpData) return null;

  // Find min/max for scaling
  const allCp = [...cpData.cp_upper, ...cpData.cp_lower];
  const minCp = Math.min(...allCp);
  const maxCp = Math.max(...allCp);
  
  // SVG dimensions
  const width = 800;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Scale functions
  const xScale = (x) => margin.left + x * plotWidth;
  const yScale = (cp) => margin.top + plotHeight - ((cp - minCp) / (maxCp - minCp)) * plotHeight;

  // Generate SVG path for upper surface
  const upperPath = cpData.x_upper.map((x, i) => {
    const px = xScale(x);
    const py = yScale(-cpData.cp_upper[i]); // Note: plotting -Cp (traditional)
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');

  // Generate SVG path for lower surface
  const lowerPath = cpData.x_lower.map((x, i) => {
    const px = xScale(x);
    const py = yScale(-cpData.cp_lower[i]); // Note: plotting -Cp
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');

  // Create fill area for upper surface
  const upperFillPath = upperPath + 
    ` L ${xScale(cpData.x_upper[cpData.x_upper.length - 1])} ${yScale(0)}` +
    ` L ${xScale(cpData.x_upper[0])} ${yScale(0)} Z`;

  // Create fill area for lower surface
  const lowerFillPath = lowerPath + 
    ` L ${xScale(cpData.x_lower[cpData.x_lower.length - 1])} ${yScale(0)}` +
    ` L ${xScale(cpData.x_lower[0])} ${yScale(0)} Z`;

  // Y-axis ticks (for -Cp values)
  const numYTicks = 6;
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    const cp = minCp + (maxCp - minCp) * i / (numYTicks - 1);
    return { value: cp, y: yScale(cp) };
  });

  // X-axis ticks
  const xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="surface-card-elevated rounded-2xl p-6 sm:p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-modal-content border border-violet-500/10 shadow-2xl shadow-violet-500/5">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-7 h-7 text-violet-400" />
              <div className="absolute inset-0 blur-lg bg-violet-500/20" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gradient tracking-tight">
                Pressure Distribution
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                Vortex Panel Method • α = {alpha}°{parseFloat(mach) > 0 ? ` • M = ${mach}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/[0.04] rounded-lg btn-press"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* SVG Plot */}
        <div className="bg-[#06060a]/60 rounded-xl p-4 mb-6 animate-fade-in-up border border-white/[0.04]" style={{ animationDelay: '100ms' }}>
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="url(#grid)" />

            {/* Fill areas */}
            <path d={upperFillPath} fill="rgba(59, 130, 246, 0.2)" />
            <path d={lowerFillPath} fill="rgba(239, 68, 68, 0.2)" />

            {/* Cp curves */}
            <path d={upperPath} fill="none" stroke="rgb(59, 130, 246)" strokeWidth="2.5" />
            <path d={lowerPath} fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2.5" />

            {/* Axes */}
            <line 
              x1={margin.left} y1={margin.top} 
              x2={margin.left} y2={height - margin.bottom}
              stroke="rgba(148, 163, 184, 0.5)" strokeWidth="2"
            />
            <line 
              x1={margin.left} y1={height - margin.bottom} 
              x2={width - margin.right} y2={height - margin.bottom}
              stroke="rgba(148, 163, 184, 0.5)" strokeWidth="2"
            />

            {/* Y-axis ticks and labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={margin.left - 5}
                  y1={tick.y}
                  x2={margin.left}
                  y2={tick.y}
                  stroke="rgba(148, 163, 184, 0.5)"
                  strokeWidth="1.5"
                />
                <text
                  x={margin.left - 10}
                  y={tick.y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="rgb(148, 163, 184)"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  {tick.value.toFixed(1)}
                </text>
              </g>
            ))}

            {/* X-axis ticks and labels */}
            {xTicks.map((x, i) => (
              <g key={i}>
                <line
                  x1={xScale(x)}
                  y1={height - margin.bottom}
                  x2={xScale(x)}
                  y2={height - margin.bottom + 5}
                  stroke="rgba(148, 163, 184, 0.5)"
                  strokeWidth="1.5"
                />
                <text
                  x={xScale(x)}
                  y={height - margin.bottom + 20}
                  textAnchor="middle"
                  fill="rgb(148, 163, 184)"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  {x.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Axis labels */}
            <text
              x={width / 2}
              y={height - 10}
              textAnchor="middle"
              fill="rgb(148, 163, 184)"
              fontSize="14"
              fontWeight="600"
            >
              x/c
            </text>
            <text
              x={20}
              y={height / 2}
              textAnchor="middle"
              transform={`rotate(-90, 20, ${height / 2})`}
              fill="rgb(148, 163, 184)"
              fontSize="14"
              fontWeight="600"
            >
              -Cp
            </text>
          </svg>
        </div>

        {/* Legend and Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 stagger-children">
          <div className="surface-card rounded-xl p-4 border border-blue-500/15 card-hover animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-0.5 bg-blue-500 rounded"></div>
              <span className="text-blue-400 font-semibold text-sm">Upper Surface</span>
            </div>
            <p className="text-zinc-500 text-sm">
              Cp range: [{Math.min(...cpData.cp_upper).toFixed(3)}, {Math.max(...cpData.cp_upper).toFixed(3)}]
            </p>
          </div>

          <div className="surface-card rounded-xl p-4 border border-rose-500/15 card-hover animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-0.5 bg-rose-500 rounded"></div>
              <span className="text-rose-400 font-semibold text-sm">Lower Surface</span>
            </div>
            <p className="text-zinc-500 text-sm">
              Cp range: [{Math.min(...cpData.cp_lower).toFixed(3)}, {Math.max(...cpData.cp_lower).toFixed(3)}]
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="surface-card rounded-xl p-4 mb-6 border border-white/[0.04] animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-zinc-600 text-xs font-medium uppercase tracking-wider">Stagnation Point</p>
              <p className="text-violet-300 font-mono mt-1">
                ({cpData.stagnation_point[0].toFixed(4)}, {cpData.stagnation_point[1].toFixed(4)})
              </p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs font-medium uppercase tracking-wider">Method</p>
              <p className="text-violet-300 font-semibold mt-1">Vortex Panel Method</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs font-medium uppercase tracking-wider">Panels</p>
              <p className="text-violet-300 font-semibold mt-1">150</p>
            </div>
          </div>
        </div>

        {/* Physical Explanation */}
        <div className="surface-card rounded-xl p-4 bg-violet-500/[0.02] border border-violet-500/10 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <h4 className="text-violet-400 font-semibold mb-2 flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4" />
            Understanding Cp Distribution
          </h4>
          <ul className="text-zinc-400 text-sm space-y-1">
            <li>• <span className="text-blue-400">Blue area</span> above zero = Suction (low pressure) on upper surface</li>
            <li>• <span className="text-rose-400">Red area</span> below zero = Pressure on lower surface</li>
            <li>• <span className="text-violet-300">Area between curves</span> = Lift force</li>
            <li>• <span className="text-amber-400">Peak suction</span> near leading edge accelerates flow</li>
          </ul>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg hover:shadow-violet-500/20 transition-all duration-300 btn-press hover:scale-[1.01] flex items-center justify-center gap-2 animate-fade-in-up"
          style={{ animationDelay: '500ms' }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default CpVisualization;