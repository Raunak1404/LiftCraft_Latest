import React, { useState, useEffect } from 'react';
import { X, Wind, Loader } from 'lucide-react';
import { API_URL } from '../../constants';

const FlowVisualization = ({ airfoilData, alpha, onClose }) => {
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/flow-field`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x_coords: airfoilData.x_coords,
            y_coords: airfoilData.y_coords,
            alpha: alpha,
            n_panels: 150,
            grid_resolution: 50
          })
        });

        const data = await response.json();

        if (data.success) {
          setFlowData(data.flow_data);
        } else {
          setError(data.error || 'Failed to compute flow field');
        }
      } catch (err) {
        setError(`Failed to fetch flow data: ${err.message}`);
        console.error('Flow fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (airfoilData) {
      fetchFlowData();
    }
  }, [airfoilData, alpha]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-modal-backdrop">
        <div className="surface-card-elevated rounded-2xl p-8 max-w-4xl w-full animate-modal-content border border-violet-500/10">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader className="w-12 h-12 text-violet-400 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-violet-500/25 animate-breathe" />
            </div>
            <p className="text-white text-lg animate-fade-in font-medium">Computing flow field...</p>
            <p className="text-zinc-500 text-sm animate-fade-in" style={{ animationDelay: '200ms' }}>Generating streamlines and velocity contours</p>
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

  if (!flowData) return null;

  // SVG dimensions
  const width = 900;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Domain for scaling
  const xDomain = [-0.5, 1.5];
  const yDomain = [-1, 1];

  // Scale functions
  const xScale = (x) => margin.left + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotWidth;
  const yScale = (y) => margin.top + plotHeight - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotHeight;

  // Velocity colormap (normalized 0-1 mapped to colors)
  const getVelocityColor = (vel, minVel, maxVel) => {
    const normalized = (vel - minVel) / (maxVel - minVel);
    
    // Blue (slow) -> Cyan -> Yellow -> Red (fast)
    if (normalized < 0.33) {
      const t = normalized / 0.33;
      return `rgb(${Math.floor(59 + (6 - 59) * t)}, ${Math.floor(130 + (182 - 130) * t)}, ${Math.floor(246 + (212 - 246) * t)})`;
    } else if (normalized < 0.67) {
      const t = (normalized - 0.33) / 0.34;
      return `rgb(${Math.floor(6 + (234 - 6) * t)}, ${Math.floor(182 + (179 - 182) * t)}, ${Math.floor(212 + (8 - 212) * t)})`;
    } else {
      const t = (normalized - 0.67) / 0.33;
      return `rgb(${Math.floor(234 + (239 - 234) * t)}, ${Math.floor(179 + (68 - 179) * t)}, ${Math.floor(8 + (68 - 8) * t)})`;
    }
  };

  // Find min/max velocity for colorscale
  const velocityFlat = flowData.velocity_magnitude.flat();
  const minVel = Math.min(...velocityFlat.filter(v => v > 0));
  const maxVel = Math.max(...velocityFlat);

  return (
    <div className="fixed inset-0 bg-[#06060a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="surface-card-elevated rounded-2xl p-6 sm:p-8 max-w-7xl w-full max-h-[90vh] overflow-y-auto animate-modal-content border border-violet-500/10 shadow-2xl shadow-violet-500/5">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Wind className="w-7 h-7 text-violet-400" />
              <div className="absolute inset-0 blur-lg bg-violet-500/20" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gradient tracking-tight">
                Flow Visualization
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                Streamlines + Velocity Field • α = {alpha}°
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

        {/* SVG Visualization */}
        <div className="bg-[#06060a]/60 rounded-xl p-4 mb-6 animate-fade-in-up border border-white/[0.04]" style={{ animationDelay: '100ms' }}>
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Background velocity contours */}
            {flowData.x_grid.map((x, i) => 
              flowData.y_grid.map((y, j) => {
                const vel = flowData.velocity_magnitude[j][i];
                if (vel === 0) return null; // Inside airfoil
                const color = getVelocityColor(vel, minVel, maxVel);
                const cellWidth = plotWidth / flowData.x_grid.length;
                const cellHeight = plotHeight / flowData.y_grid.length;
                
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={xScale(x) - cellWidth/2}
                    y={yScale(y) - cellHeight/2}
                    width={cellWidth}
                    height={cellHeight}
                    fill={color}
                    opacity={0.4}
                  />
                );
              })
            )}

            {/* Streamlines */}
            {flowData.streamlines.map((streamline, idx) => {
              const pathData = streamline.map((point, i) => {
                const px = xScale(point[0]);
                const py = yScale(point[1]);
                return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
              }).join(' ');

              return (
                <path
                  key={`streamline-${idx}`}
                  d={pathData}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Airfoil outline */}
            <path
              d={airfoilData.x_coords.map((x, i) => {
                const px = xScale(x);
                const py = yScale(airfoilData.y_coords[i]);
                return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
              }).join(' ') + ' Z'}
              fill="rgb(30, 41, 59)"
              stroke="rgb(6, 182, 212)"
              strokeWidth="2"
            />

            {/* Stagnation point */}
            <circle
              cx={xScale(flowData.stagnation_point[0])}
              cy={yScale(flowData.stagnation_point[1])}
              r="4"
              fill="rgb(239, 68, 68)"
            />

            {/* Axes */}
            <line 
              x1={margin.left} y1={margin.top} 
              x2={margin.left} y2={height - margin.bottom}
              stroke="rgba(148, 163, 184, 0.3)" strokeWidth="1"
            />
            <line 
              x1={margin.left} y1={height - margin.bottom} 
              x2={width - margin.right} y2={height - margin.bottom}
              stroke="rgba(148, 163, 184, 0.3)" strokeWidth="1"
            />

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
              y/c
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 stagger-children">
          <div className="surface-card rounded-xl p-4 border border-violet-500/15 card-hover animate-fade-in-up">
            <h4 className="text-violet-400 font-semibold mb-2 flex items-center gap-2 text-sm">
              <Wind className="w-4 h-4" />
              Velocity Field
            </h4>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-12 h-3 bg-gradient-to-r from-blue-500 via-cyan-400 via-yellow-400 to-red-500 rounded"></div>
              <span className="text-zinc-400 text-sm">Slow → Fast</span>
            </div>
            <p className="text-zinc-500 text-sm">
              Range: {minVel.toFixed(2)} - {maxVel.toFixed(2)} V∞
            </p>
          </div>

          <div className="surface-card rounded-xl p-4 border border-white/[0.06] card-hover animate-fade-in-up">
            <h4 className="text-white font-semibold mb-2 text-sm">Streamlines</h4>
            <p className="text-zinc-500 text-sm mb-1">
              {flowData.streamlines.length} streamlines computed
            </p>
            <p className="text-zinc-500 text-sm">
              White curves show flow paths
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="surface-card rounded-xl p-4 bg-violet-500/[0.02] border border-violet-500/10 mb-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h4 className="text-violet-400 font-semibold mb-2 flex items-center gap-2 text-sm">
            <Wind className="w-4 h-4" />
            Understanding Flow Visualization
          </h4>
          <ul className="text-zinc-400 text-sm space-y-1">
            <li>• <span className="text-white">White curves</span> = Streamlines (path of air particles)</li>
            <li>• <span className="text-blue-400">Blue regions</span> = Slow flow (low velocity)</li>
            <li>• <span className="text-rose-400">Red regions</span> = Fast flow (high velocity)</li>
            <li>• <span className="text-rose-500">Red dot</span> = Stagnation point (flow stops, splits)</li>
            <li>• Flow accelerates over airfoil top → Creates lift!</li>
          </ul>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg hover:shadow-violet-500/20 transition-all duration-300 btn-press hover:scale-[1.01] flex items-center justify-center gap-2 animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default FlowVisualization;