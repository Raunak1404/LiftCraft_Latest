import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, AlertTriangle, Zap, ArrowRight } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, login, loginWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);

      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06060a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px] animate-breathe" />
      <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-fuchsia-600/6 rounded-full blur-[120px] animate-breathe" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/4 rounded-full blur-[140px] animate-breathe" style={{ animationDelay: '4s' }} />

      {/* Dot grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(rgba(139, 92, 246, 0.4) 1px, transparent 1px)`,
        backgroundSize: '32px 32px'
      }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="relative animate-float">
              <Zap className="w-10 h-10 text-violet-400" />
              <div className="absolute inset-0 blur-2xl bg-violet-500/30 animate-breathe" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gradient">
              LiftCraft
            </h1>
          </div>
          <p className="text-zinc-500 text-sm font-medium animate-fade-in" style={{ animationDelay: '200ms' }}>
            {isLogin ? 'Welcome back to your design studio' : 'Start crafting aerodynamic designs'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="surface-card-elevated rounded-2xl p-8 shadow-2xl shadow-violet-500/5 gradient-border animate-scale-in" style={{ animationDelay: '100ms' }}>
          <form onSubmit={handleSubmit} className="space-y-5 stagger-children">
            {/* Email */}
            <div className="animate-fade-in-up">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-violet-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all outline-none text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-fade-in-up">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-violet-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirm Password */}
            {!isLogin && (
              <div className="animate-scale-in">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-violet-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all outline-none text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2 animate-scale-in-bounce">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-200/80">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-press group flex items-center justify-center gap-2 text-sm"
            >
              <span>{loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
              {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.04]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#13131d] text-zinc-600 font-medium">or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white text-zinc-900 font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl hover:bg-zinc-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-press flex items-center justify-center gap-2.5 text-sm"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors animated-underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-8 animate-fade-in font-medium tracking-wide" style={{ animationDelay: '400ms' }}>
          AI-powered aerodynamic design platform
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
