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
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl animate-fade-in-down">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative">
              <Zap className="w-8 h-8 text-cyan-400 transition-transform group-hover:scale-110 duration-300" />
              <div className="absolute inset-0 blur-xl bg-cyan-400/30 transition-opacity group-hover:opacity-100 opacity-60" />
            </div>
            <h1 className="text-2xl font-bold">
              <span className="text-gradient">LiftCraft</span>
            </h1>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-3">
            {/* Daily Counter */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl glass-effect animate-border-glow">
              <Flame className={`w-4 h-4 transition-colors ${remaining > 0 ? 'text-orange-400' : 'text-gray-500'}`} />
              <span className="text-sm text-slate-400">
                <span className={`font-bold tabular-nums transition-colors ${remaining > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {loadingUsage ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  ) : remaining}
                </span>
                <span className="text-slate-500">/{DAILY_LIMIT}</span>
              </span>
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass-effect hover:border-cyan-500/40 transition-all duration-200 btn-press"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-72 glass-effect-strong rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-modal-content">
                  <div className="p-4 border-b border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Signed in as</p>
                    <p className="text-sm text-white font-medium truncate">{currentUser?.email}</p>
                  </div>

                  <div className="sm:hidden p-4 border-b border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Daily Generations</span>
                      <span className={`text-lg font-bold tabular-nums ${remaining > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        {loadingUsage ? '...' : remaining}/{DAILY_LIMIT}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          remaining > 2 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                          remaining > 0 ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-red-500 to-red-700'
                        }`}
                        style={{ width: `${(remaining / DAILY_LIMIT) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2 stagger-children">
                    <button
                      onClick={() => { onHistoryClick(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/80 transition-all text-left group animate-fade-in"
                    >
                      <History className="w-4 h-4 text-blue-400 transition-transform group-hover:scale-110" />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Design History</span>
                    </button>

                    <button
                      onClick={() => { onLogout(); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-all text-left group animate-fade-in"
                    >
                      <LogOut className="w-4 h-4 text-red-400 transition-transform group-hover:scale-110" />
                      <span className="text-sm text-slate-300 group-hover:text-red-300 transition-colors">Logout</span>
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
