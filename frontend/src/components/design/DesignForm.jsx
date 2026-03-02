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
    `w-full bg-white/[0.03] border ${inputErrors[field] ? 'border-rose-500/40' : 'border-white/[0.06]'} rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all outline-none text-sm`;

  return (
    <div className="rounded-2xl surface-card p-5 sm:p-7 shadow-2xl shadow-violet-500/[0.03] card-hover shimmer-highlight animate-fade-in-up">
      <div className="flex items-center gap-3 mb-7">
        <div className="p-2.5 rounded-xl bg-violet-500/8 border border-violet-500/15">
          <Settings className="w-5 h-5 text-violet-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gradient tracking-tight">Design Parameters</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 stagger-children">
        <div className="group animate-fade-in-up">
          <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider group-hover:text-violet-400/80 transition-colors">
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
            <p className="text-rose-400 text-xs mt-1.5 animate-scale-in-bounce">{inputErrors.CL_target}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider group-hover:text-violet-400/80 transition-colors">
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
            <p className="text-rose-400 text-xs mt-1.5 animate-scale-in-bounce">{inputErrors.alpha}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider group-hover:text-violet-400/80 transition-colors">
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
            <p className="text-rose-400 text-xs mt-1.5 animate-scale-in-bounce">{inputErrors.Re}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider group-hover:text-violet-400/80 transition-colors">
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
            <p className="text-rose-400 text-xs mt-1.5 animate-scale-in-bounce">{inputErrors.mach}</p>
          )}
        </div>

        <div className="group animate-fade-in-up">
          <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider group-hover:text-violet-400/80 transition-colors">
            Airfoil Type
          </label>
          <select
            name="airfoil_type"
            value={inputs.airfoil_type}
            onChange={handleChange}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all outline-none text-sm"
          >
            <option value="symmetric">Symmetric</option>
            <option value="cambered">Cambered</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {inputs.airfoil_type === 'custom' && (
          <div className="sm:col-span-2 animate-scale-in">
            <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider">
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
          <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider">
            Optimization Mode
          </label>
          <select
            name="optimization_mode"
            value={inputs.optimization_mode}
            onChange={handleChange}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all outline-none text-sm"
          >
            <option value="single">Single Point</option>
            <option value="multipoint">Multi-Point</option>
          </select>
        </div>

        {inputs.optimization_mode === 'multipoint' && (
          <div className="sm:col-span-2 animate-scale-in">
            <label className="block text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider">
              Off-Design Strategy
            </label>
            <select
              name="offdesign_mode"
              value={inputs.offdesign_mode}
              onChange={handleChange}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all outline-none text-sm"
            >
              <option value="stability">Stability</option>
              <option value="performance">Performance</option>
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-5 bg-rose-500/8 border border-rose-500/20 rounded-xl p-3 sm:p-4 animate-scale-in-bounce">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-rose-300/80 text-xs sm:text-sm">{error}</p>
          </div>
        </div>
      )}

      {!canGenerate() && (
        <div className="mt-5 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 sm:p-4 animate-scale-in">
          <div className="flex items-start gap-2">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-xs sm:text-sm font-semibold">Daily limit reached</p>
              <p className="text-amber-400/50 text-xs mt-1">Come back tomorrow for more generations</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isLoading || !canGenerate()}
        className={`w-full mt-7 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 btn-press ${
          canGenerate() && !isLoading
            ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white hover:shadow-lg hover:shadow-violet-500/30 animate-pulse-glow cursor-pointer'
            : 'bg-white/[0.03] text-zinc-600 cursor-not-allowed border border-white/[0.06]'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Crafting...</span>
          </>
        ) : !canGenerate() ? (
          <>
            <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Limit Reached</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Craft Airfoil ({getRemainingGenerations()} left)</span>
          </>
        )}
      </button>
    </div>
  );
};

export default DesignForm;
