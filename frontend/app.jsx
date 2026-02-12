import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Plus, LogOut, Search, Lock, User, Check, ArrowRight, Shield } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, "");

// --- Components ---

const GlassCard = ({ children, className = "", noPadding = false }) => (
  <div className={`relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-3xl ${noPadding ? '' : 'p-6'} ${className}`}>
    {/* Subtle highlight for gloss effect */}
    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
    {children}
  </div>
);

const LiquidButton = ({ children, variant = "primary", onClick, className = "", type = "button", disabled = false }) => {
  const baseStyle = "relative w-full py-3 px-6 rounded-2xl font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 overflow-hidden group";

  const variants = {
    primary: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 border-t border-white/20",
    secondary: "bg-gradient-to-r from-emerald-400 to-cyan-400 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 border-t border-white/20",
    ghost: "bg-white/5 hover:bg-white/10 text-slate-700 border border-white/10 backdrop-blur-md",
    danger: "bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {/* Glossy sheen overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {/* Bottom shine for 3D effect */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

const GlassInput = ({ icon: Icon, type = "text", placeholder, value, onChange, name }) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-600 transition-colors">
      {Icon && <Icon size={20} />}
    </div>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-12 pr-4 py-3.5 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:bg-white/60 transition-all shadow-inner"
    />
  </div>
);

const PasswordCard = ({ item, onCopy }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(item.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-white/30 hover:bg-white/50 transition-all duration-300 backdrop-blur-md rounded-2xl p-4 border border-white/40 shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-white flex items-center justify-center text-violet-600 shadow-inner">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{item.site}</h3>
            <p className="text-xs text-slate-500 font-medium">{item.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="p-2 rounded-xl hover:bg-white/50 text-slate-500 hover:text-violet-600 transition-colors"
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl hover:bg-white/50 text-slate-500 hover:text-emerald-600 transition-colors relative"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      <div className={`mt-3 px-3 py-2 rounded-lg bg-slate-900/5 border border-white/20 font-mono text-sm text-slate-700 flex items-center justify-between transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-70 blur-[3px] select-none'}`}>
        <span>{isVisible ? item.password : '••••••••••••'}</span>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState('auth'); // 'auth' | 'dashboard'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth Form State
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  // Dashboard State
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ site: '', username: '', password: '' });

  // --- Handlers ---

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setCurrentUser(data.user);
      setItems(data.items || []);
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/passwords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          userId: currentUser.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save password');
      }

      const entry = data.item;
      setItems(prev => [entry, ...prev]);

      setNewItem({ site: '', username: '', password: '' });
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'Failed to save password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setItems([]);
    setAuthForm({ username: '', password: '' });
    setView('auth');
  };

  const copyToClipboard = (text) => {
    // Fallback for iframe environments if navigator.clipboard fails
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  const filteredItems = items.filter(item =>
    item.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Render Views ---

  if (view === 'auth') {
    return (
      <div className="min-h-screen w-full bg-[#E8E6E1] flex items-center justify-center p-4 font-sans text-slate-800 overflow-hidden relative">
        {/* Background Ambient Blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
        <div className="absolute top-[20%] left-[-10%] w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

        <GlassCard className="w-full max-w-md z-10 flex flex-col gap-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 text-white mb-4 rotate-3">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
              LiquidPass
            </h1>
            <p className="text-slate-500">Secure. Fluid. Transparent.</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <GlassInput
              icon={User}
              name="username"
              placeholder="Username"
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
            />
            <GlassInput
              icon={Lock}
              type="password"
              name="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />

            {error && <p className="text-rose-500 text-sm text-center font-medium bg-rose-100/50 py-2 rounded-xl border border-rose-200">{error}</p>}

            <LiquidButton type="submit" disabled={loading}>
              {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </LiquidButton>
          </form>

          <div className="text-center">
            <button
              onClick={() => { setError(''); setAuthMode(authMode === 'login' ? 'signup' : 'login'); }}
              className="text-slate-500 hover:text-violet-600 text-sm font-medium transition-colors"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen w-full bg-[#E8E6E1] p-4 md:p-8 font-sans text-slate-800 relative overflow-x-hidden">
      {/* Background Ambient Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-60" />
        <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-sky-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-60" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">My Vault</h1>
            <p className="text-slate-500">Welcome back, {currentUser?.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <LiquidButton variant="ghost" className="w-auto px-4 py-2" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </LiquidButton>
            <LiquidButton
              className="w-auto shadow-lg shadow-violet-500/20"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={20} />
              <span>New Password</span>
            </LiquidButton>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Panel: Search & Stats (Simulating the left sidebar/widgets in your image) */}
          <div className="space-y-6">
            <GlassCard className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/50 border border-white/40 focus:bg-white/80 focus:ring-2 focus:ring-violet-400/30 outline-none transition-all placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-violet-100 to-white p-4 rounded-2xl border border-white/40 text-center">
                  <span className="block text-2xl font-bold text-violet-600">{items.length}</span>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Passwords</span>
                </div>
                <div className="bg-gradient-to-br from-emerald-100 to-white p-4 rounded-2xl border border-white/40 text-center">
                  <span className="block text-2xl font-bold text-emerald-600">High</span>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Security</span>
                </div>
              </div>
            </GlassCard>

            {/* Promo Card Style (from image) */}
            <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-fuchsia-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400 to-violet-500" />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-1">Premium Plan</h3>
                <p className="text-white/80 text-sm mb-4">Unlock unlimited storage and biometric sync.</p>
                <button className="bg-white text-fuchsia-600 px-4 py-2 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-transform flex items-center gap-2">
                  <ArrowRight size={16} /> Upgrade Now
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Password List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-semibold text-slate-700">Stored Credentials</h2>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Recent</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <PasswordCard key={item.id} item={item} onCopy={copyToClipboard} />
                ))
              ) : (
                <div className="text-center py-12 opacity-50">
                  <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock size={24} className="text-slate-400" />
                  </div>
                  <p>No passwords found.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setShowAddModal(false)} />
          <GlassCard className="w-full max-w-md relative z-10 animate-scale-in">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Add New Password</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Website / App</label>
                <GlassInput
                  name="site"
                  placeholder="e.g. Netflix"
                  value={newItem.site}
                  onChange={(e) => setNewItem({ ...newItem, site: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Username</label>
                <GlassInput
                  name="username"
                  placeholder="email@example.com"
                  value={newItem.username}
                  onChange={(e) => setNewItem({ ...newItem, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Password</label>
                <GlassInput
                  name="password"
                  placeholder="Super secret password"
                  value={newItem.password}
                  onChange={(e) => setNewItem({ ...newItem, password: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <LiquidButton
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </LiquidButton>
                <LiquidButton
                  type="submit"
                  variant="secondary"
                  className="flex-1"
                  disabled={loading || !newItem.site || !newItem.password}
                >
                  {loading ? 'Saving...' : 'Save Entry'}
                </LiquidButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Tailwind Animations & Custom Styles */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}