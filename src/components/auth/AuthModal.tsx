import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { X, Lock, Mail, User, ShieldAlert, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, isLoading, isFirebaseConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanEmail = email.trim();
    if (!validateEmail(cleanEmail)) {
      setValidationError('Please enter a valid email address (e.g., student@university.edu).');
      return;
    }

    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setValidationError('Please enter your full legal name (minimum 2 characters).');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    try {
      if (mode === 'login') {
        const user = await login(cleanEmail, password);
        if (user) {
          onSuccess?.();
          onClose();
        }
      } else {
        const user = await register(fullName.trim(), cleanEmail, password);
        if (user) {
          onSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      setValidationError(err.message || 'Authentication failed. Please verify your details.');
    }
  };

  const resetFormState = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setValidationError(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-[#20242C]">
              {mode === 'login' ? 'Sign In with Firebase' : 'Create StageFront Account'}
            </h3>
            <span className="text-xs text-[#687386]">
              {mode === 'login'
                ? 'Enter your registered credentials to access your tickets'
                : 'Register a secure customer account with email and password'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-[#20242C] transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Notice if Firebase credentials missing */}
        {!isFirebaseConfigured && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-900">Firebase Setup Required:</strong>
              Configure your Firebase Web keys in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">.env</code> to activate live authentication. See project documentation for instructions.
            </div>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => resetFormState('login')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
              mode === 'login'
                ? 'border-[#356AE6] text-[#356AE6] bg-blue-50/20'
                : 'border-transparent text-[#687386] hover:text-[#20242C]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => resetFormState('register')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
              mode === 'register'
                ? 'border-[#356AE6] text-[#356AE6] bg-blue-50/20'
                : 'border-transparent text-[#687386] hover:text-[#20242C]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
              {validationError}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[#687386] mb-1 font-medium">Full Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Chen"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#687386] mb-1 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[#687386] mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#20242C] transition cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[#687386] mb-1 font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{mode === 'login' ? 'Sign In' : 'Create Customer Account'}</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 text-center text-[11px] text-[#687386]">
            {mode === 'register' ? (
              <p>
                Accounts are registered as standard customers. Administrator permissions are granted through secure server-side authorization.
              </p>
            ) : (
              <p>
                Protected by Firebase Authentication session persistence.
              </p>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};
