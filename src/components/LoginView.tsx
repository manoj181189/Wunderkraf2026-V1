import React, { useState } from 'react';
import { Lock, UserCheck, KeyRound, AlertCircle, Sparkles, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';

interface LoginViewProps {
  users: Record<string, UserAccount>;
  brandLogoBase64?: string;
  onLogin: (username: string, pass: string) => boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, brandLogoBase64, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username.trim().toLowerCase(), password);
    if (!success) {
      setError(true);
    }
  };

  const handleQuickSelect = (u: string) => {
    setUsername(u);
    const pass = users[u]?.pass || '';
    setPassword(pass);
    setError(false);
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
      {/* Brand Monogram */}
      <div className="w-24 h-24 mx-auto mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-inner flex items-center justify-center overflow-hidden">
        {brandLogoBase64 ? (
          <img src={brandLogoBase64} alt="Brand Logo" className="w-full h-full object-contain" />
        ) : (
          <div className="text-3xl font-extrabold text-[#1a365d] tracking-wider">WK</div>
        )}
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1a365d] m-0">Secure Workstation Login</h2>
        <p className="text-xs text-slate-500 mt-1">
          Wünderkraf Factory ERP & AI Intelligence Access Gate
        </p>
      </div>

      {/* Security Notice Banner */}
      <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-snug">
          <p className="font-bold text-amber-950 m-0">सुरक्षा प्रतिबंध (Login Required Policy):</p>
          <p className="text-[11px] text-amber-800 mt-0.5 m-0">
            Login के बिना Voice AI Floor Dictation, Google Search Grounding या कोई भी फ्लोर स्क्रीन डायरेक्ट एक्सेस नहीं हो सकती।
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Workstation Username (ऑपरेटर आईडी)
          </label>
          <div className="relative">
            <input
              type="text"
              id="login-username-input"
              list="userAutocompleteList"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(false);
              }}
              placeholder="e.g. admin, slit_user, cut_user, qc_user..."
              className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-[#3182ce] focus:ring-2 focus:ring-blue-100 outline-none transition"
              required
            />
            <datalist id="userAutocompleteList">
              {Object.keys(users).map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Private Access Password (पासवर्ड)
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="login-password-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter workstation password"
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-[#3182ce] focus:ring-2 focus:ring-blue-100 outline-none transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer p-0.5"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>अमान्य लॉगिन! गलत यूजरनेम या पासवर्ड। कृपया दोबारा प्रयास करें।</span>
          </div>
        )}

        <button
          type="submit"
          id="login-submit-btn"
          className="w-full py-3 bg-[#1a365d] hover:bg-[#2b6cb0] text-white font-bold rounded-lg text-sm transition shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          <span>Login & Open Floor Hub (लॉगिन करें)</span>
        </button>
      </form>

      {/* Quick Desk Credentials Shortcut Pills */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Select Workstations (Fast Auto-Fill):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(users).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => handleQuickSelect(u)}
              className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-medium transition cursor-pointer"
            >
              {u}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-slate-400 mt-2">
          💡 Click any user chip above to auto-fill username and password for quick switching.
        </div>
      </div>
    </div>
  );
};
