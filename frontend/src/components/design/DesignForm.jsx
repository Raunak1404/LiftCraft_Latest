import React from 'react';
import { Settings, AlertTriangle, Flame, Sparkles } from 'lucide-react';
import { validateInput } from '../../utils/validation';

const DesignForm = ({
  inputs,
  inputErrors,
  onInputChange,
  onSubmit,
  canGenerate,
  isLoading,
  error,
  getRemainingGenerations
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onInputChange(name, value);
  };

  const inputClass = (field) =>
    `w-full glass-effect border ${inputErrors[field] ? 'border-red-500/50' : 'border-slate-700/50'} rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all outline-none text-sm sm:text-base`;

  return (
    <div className="rounded-2xl glass-effect p-4 sm:p-6 shadow-2xl card-hover shimmer-highlight animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <Settings className="w-5 h-5 text-indigo-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gradient">Design Parameters</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 stagger-children">
        <div className="group animate-fade-in-up">
          <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium group-hover:text-indigo-300 transition-colors">
            Target CL
          </label>
          <input
            type="number"
            step="0.1"
            name="CL_target"
            value={inputs.CL_target}
            onChange={handleChange}
            className={inputClass('CL_target')}
          />
          {inputErrors.CL_target && (
            <p className="text-red-400 text-xs mt-1 animate-scale-in-bounce">{inputErrors.CL_target}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium group-hover:text-indigo-300 transition-colors">
            Angle of Attack (&alpha;&deg;)
          </label>
          <input
            type="number"
            step="0.5"
            name="alpha"
            value={inputs.alpha}
            onChange={handleChange}
            className={inputClass('alpha')}
          />
          {inputErrors.alpha && (
            <p className="text-red-400 text-xs mt-1 animate-scale-in-bounce">{inputErrors.alpha}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium group-hover:text-indigo-300 transition-colors">
            Reynolds Number
          </label>
          <input
            type="number"
            step="100000"
            name="Re"
            value={inputs.Re}
            onChange={handleChange}
            className={inputClass('Re')}
          />
          {inputErrors.Re && (
            <p className="text-red-400 text-xs mt-1 animate-scale-in-bounce">{inputErrors.Re}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium group-hover:text-indigo-300 transition-colors">
            Mach Number
          </label>
          <input
            type="number"
            step="0.05"
            name="mach"
            value={inputs.mach}
            onChange={handleChange}
            placeholder="0.0 (incompressible)"
            className={inputClass('mach')}
          />
          {inputErrors.mach && (
            <p className="text-red-400 text-xs mt-1 animate-scale-in-bounce">{inputErrors.mach}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium group-hover:text-indigo-300 transition-colors">
            Airfoil Type
          </label>
          <select
            name="airfoil_type"
            value={inputs.airfoil_type}
            onChange={handleChange}
            className="w-full glass-effect border border-slate-700/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all outline-none text-sm sm:text-base"
          >
            <option value="symmetric">Symmetric</option>
            <option value="cambered">Cambered</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {inputs.airfoil_type === 'custom' && (
          <div className="sm:col-span-2 animate-scale-in">
            <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium">
              Target CM
            </label>
            <input
              type="number"
              step="0.01"
              name="Cm_target"
              value={inputs.Cm_target}
              onChange={handleChange}
              className={inputClass('Cm_target')}
            />
          </div>
        )}

        <div className="sm:col-span-2 animate-fade-in-up">
          <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium">
            Optimization Mode
          </label>
          <select
            name="optimization_mode"
            value={inputs.optimization_mode}
            onChange={handleChange}
            className="w-full glass-effect border border-slate-700/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all outline-none text-sm sm:text-base"
          >
            <option value="single">Single Point</option>
            <option value="multipoint">Multi-Point</option>
          </select>
        </div>

        {inputs.optimization_mode === 'multipoint' && (
          <div className="sm:col-span-2 animate-scale-in">
            <label className="block text-indigo-300/70 text-xs sm:text-sm mb-2 font-medium">
              Off-Design Strategy
            </label>
            <select
              name="offdesign_mode"
              value={inputs.offdesign_mode}
              onChange={handleChange}
              className="w-full glass-effect border border-slate-700/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all outline-none text-sm sm:text-base"
            >
              <option value="stability">Stability</option>
              <option value="performance">Performance</option>
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 sm:p-4 animate-scale-in-bounce">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-xs sm:text-sm">{error}</p>
          </div>
        </div>
      )}

      {!canGenerate() && (
        <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 sm:p-4 animate-scale-in">
          <div className="flex items-start gap-2">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 text-xs sm:text-sm font-semibold">Daily limit reached</p>
              <p className="text-orange-400/70 text-xs mt-1">Come back tomorrow for more generations</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isLoading || !canGenerate()}
        className={`w-full mt-6 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 btn-press ${
          canGenerate() && !isLoading
            ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-indigo-500/40 animate-pulse-glow cursor-pointer'
            : 'glass-effect text-slate-500 cursor-not-allowed border border-slate-700/50'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm sm:text-base">Crafting...</span>
          </>
        ) : !canGenerate() ? (
          <>
            <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base">Limit Reached</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base">Craft Airfoil ({getRemainingGenerations()} left)</span>
          </>
        )}
      </button>
    </div>
  );
};

export default DesignForm;
