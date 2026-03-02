import React, { useState, useRef, useEffect } from 'react';
import { History, LogOut, Flame, User, ChevronDown, Zap } from 'lucide-react';
import { DAILY_LIMIT } from '../../constants';

const Header = ({ currentUser, dailyUsage, loadingUsage, getRemainingGenerations, onHistoryClick, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const remaining = getRemainingGenerations();

  return (
    <header className="sticky top-0 z-50 border-b border-violet-500/10 bg-[#06060a]/80 backdrop-blur-2xl animate-fade-in-down">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative">
              <Zap className="w-7 h-7 text-violet-400 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-300" />
              <div className="absolute inset-0 blur-xl bg-violet-500/25 transition-opacity group-hover:opacity-100 opacity-50" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-gradient">LiftCraft</span>
            </h1>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Daily Counter */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-violet-500/10 animate-border-glow">
              <Flame className={`w-3.5 h-3.5 transition-colors ${remaining > 0 ? 'text-amber-400' : 'text-zinc-600'}`} />
              <span className="text-xs text-zinc-400 font-medium">
                <span className={`font-bold tabular-nums transition-colors ${remaining > 0 ? 'text-violet-300' : 'text-rose-400'}`}>
                  {loadingUsage ? (
                    <span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  ) : remaining}
                </span>
                <span className="text-zinc-600">/{DAILY_LIMIT}</span>
              </span>
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.03] border border-violet-500/10 hover:border-violet-500/25 transition-all duration-300 btn-press"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2.5 w-72 surface-card-elevated rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-content">
                  <div className="p-4 border-b border-white/[0.04]">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1 font-medium">Signed in as</p>
                    <p className="text-sm text-white font-medium truncate">{currentUser?.email}</p>
                  </div>

                  <div className="sm:hidden p-4 border-b border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">Daily Generations</span>
                      <span className={`text-lg font-bold tabular-nums ${remaining > 0 ? 'text-violet-300' : 'text-rose-400'}`}>
                        {loadingUsage ? '...' : remaining}/{DAILY_LIMIT}
                      </span>
                    </div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          remaining > 2 ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' :
                          remaining > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-red-600'
                        }`}
                        style={{ width: `${(remaining / DAILY_LIMIT) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-1.5 stagger-children">
                    <button
                      onClick={() => { onHistoryClick(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-left group animate-fade-in"
                    >
                      <History className="w-4 h-4 text-violet-400 transition-transform group-hover:scale-110" />
                      <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Design History</span>
                    </button>

                    <button
                      onClick={() => { onLogout(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-rose-500/[0.06] transition-all text-left group animate-fade-in"
                    >
                      <LogOut className="w-4 h-4 text-rose-400 transition-transform group-hover:scale-110" />
                      <span className="text-sm text-zinc-400 group-hover:text-rose-300 transition-colors">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
