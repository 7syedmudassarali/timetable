import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Lock, Unlock, LogOut, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

export default function Header({ isAdmin, onLoginSuccess, onLogout }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Tick the clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // Validate with user specified credentials
      if (email.toLowerCase() === 'syed.mudassaralishah13@gmail.com' && password === '123456') {
        onLoginSuccess();
        setIsLoginOpen(false);
        setEmail('');
        setPassword('');
        setError('');
      } else {
        setError('Invalid email address or password.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <>
      <header className="w-full bg-[#0f172a] text-white sticky top-0 z-40 border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Department Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Calendar className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                CS Department <span className="text-blue-400 font-light hidden sm:inline">| Timetable Portal</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Timetable & Facilities Coordinator</p>
            </div>
          </div>

          {/* Time, Date and Action Button */}
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* Live Clock HUD */}
            <div className="hidden md:flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-lg px-4 py-1.5">
              <div className="flex items-center gap-2 border-r border-slate-800 pr-3 text-slate-300 font-semibold text-xs">
                <Calendar size={14} className="text-blue-400" />
                <span>{formatDate(time)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-100 font-mono text-xs font-bold min-w-[70px]">
                <Clock size={14} className="text-emerald-400 animate-pulse" />
                <span>{formatTime(time)}</span>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-bold">
                  <Unlock size={13} />
                  <span>Editor Active</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors shadow-xs cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setError('');
                  setIsLoginOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-500/30 rounded-lg transition-all shadow-md shadow-blue-900/10 cursor-pointer"
              >
                <Lock size={13} />
                <span>Admin Login</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {/* Login Dialog Modal */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md overflow-hidden bg-white rounded-xl shadow-2xl border border-slate-200"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col items-center text-center relative">
                <button
                  onClick={() => setIsLoginOpen(false)}
                  className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center mb-3 border border-blue-100 shadow-inner">
                  <KeyRound size={22} className="text-blue-700" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Secure Admin Login
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Enter credentials to gain database editing capabilities.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-800 text-xs font-semibold">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Authorized Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="syed.mudassaralishah13@gmail.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] placeholder:text-slate-400 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsLoginOpen(false)}
                    className="flex-1 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors rounded-lg shadow-xs cursor-pointer"
                  >
                    {loading ? 'Verifying...' : 'Sign In'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
