import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Plus, LogOut, Search, Lock, User, Check, Shield, ShieldCheck, Pencil, Trash2, X, UserCircle, Key } from 'lucide-react';
import { deriveKey, encryptItem, decryptItem } from './crypto.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, "");

// --- Components ---

const GlassCard = ({ children, className = "", noPadding = false }) => (
  <div className={`relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-3xl ${noPadding ? '' : 'p-6'} ${className}`}>
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
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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

const PasswordCard = ({ item, onCopy, onEdit, onDelete }) => {
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

        <div className="flex items-center gap-1">
          <button onClick={() => setIsVisible(!isVisible)} className="p-2 rounded-xl hover:bg-white/50 text-slate-500 hover:text-violet-600 transition-colors">
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button onClick={handleCopy} className="p-2 rounded-xl hover:bg-white/50 text-slate-500 hover:text-emerald-600 transition-colors">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button onClick={() => onEdit(item)} className="p-2 rounded-xl hover:bg-white/50 text-slate-500 hover:text-amber-600 transition-colors">
            <Pencil size={18} />
          </button>
          <button onClick={() => onDelete(item)} className="p-2 rounded-xl hover:bg-white/50 text-slate-500 hover:text-rose-600 transition-colors">
            <Trash2 size={18} />
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
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // E2E Encryption key
  const [encryptionKey, setEncryptionKey] = useState(null);

  // Auth Form
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  // We need to remember the plaintext master password for change-password re-encryption
  const [masterPassword, setMasterPassword] = useState('');

  // Dashboard State
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ site: '', username: '', password: '' });

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ site: '', username: '', password: '' });

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Profile State
  const [showProfile, setShowProfile] = useState(false);
  const [changePassForm, setChangePassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMsg, setProfileMsg] = useState('');

  // --- Helpers ---

  const migrateItemDirect = async (key, item, userId) => {
    try {
      const encrypted = await encryptItem(key, { site: item.site, username: item.username, password: item.password });
      await fetch(`${API_URL}/api/passwords/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...encrypted, userId }),
      });
    } catch (err) {
      console.warn('Migration error for item', item.id, err);
    }
  };

  // --- Handlers ---

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const key = await deriveKey(authForm.password, authForm.username);
      const response = await fetch(`${API_URL}/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Authentication failed');

      setCurrentUser(data.user);
      setEncryptionKey(key);
      setMasterPassword(authForm.password);

      const serverItems = data.items || [];
      if (serverItems.length > 0) {
        const decrypted = await Promise.all(serverItems.map((item) => decryptItem(key, item)));
        const userId = data.user.id;
        for (const item of decrypted) {
          if (item._wasPlaintext) await migrateItemDirect(key, item, userId);
        }
        setItems(decrypted);
      } else {
        setItems([]);
      }
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!currentUser || !encryptionKey) return;
    setLoading(true);
    try {
      const encrypted = await encryptItem(encryptionKey, newItem);
      const response = await fetch(`${API_URL}/api/passwords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...encrypted, userId: currentUser.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save password');

      const entry = { ...data.item, site: newItem.site, username: newItem.username, password: newItem.password };
      setItems(prev => [entry, ...prev]);
      setNewItem({ site: '', username: '', password: '' });
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'Failed to save password');
    } finally {
      setLoading(false);
    }
  };

  // --- Edit ---

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({ site: item.site, username: item.username, password: item.password });
    setShowEditModal(true);
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    if (!currentUser || !encryptionKey || !editItem) return;
    setLoading(true);
    try {
      const encrypted = await encryptItem(encryptionKey, editForm);
      const response = await fetch(`${API_URL}/api/passwords/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...encrypted, userId: currentUser.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update password');

      // Update local state with decrypted values
      setItems(prev => prev.map(i => i.id === editItem.id
        ? { ...data.item, site: editForm.site, username: editForm.username, password: editForm.password }
        : i
      ));
      setShowEditModal(false);
      setEditItem(null);
    } catch (err) {
      setError(err.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  // --- Delete ---

  const openDelete = (item) => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteItem = async () => {
    if (!currentUser || !deleteTarget) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/passwords/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete');

      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  // --- Change Password ---

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setProfileMsg('');

    if (changePassForm.newPassword !== changePassForm.confirmPassword) {
      setProfileMsg('New passwords do not match');
      return;
    }
    if (changePassForm.newPassword.length < 6) {
      setProfileMsg('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // 1. Derive new encryption key
      const newKey = await deriveKey(changePassForm.newPassword, currentUser.username);

      // 2. Re-encrypt all vault items with new key
      for (const item of items) {
        const encrypted = await encryptItem(newKey, { site: item.site, username: item.username, password: item.password });
        const res = await fetch(`${API_URL}/api/passwords/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...encrypted, userId: currentUser.id }),
        });
        if (!res.ok) throw new Error('Failed to re-encrypt items');
      }

      // 3. Change password on server
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword: changePassForm.oldPassword,
          newPassword: changePassForm.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to change password');

      // 4. Update local key
      setEncryptionKey(newKey);
      setMasterPassword(changePassForm.newPassword);
      setChangePassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setProfileMsg('✅ Password changed successfully! All vault items re-encrypted.');
    } catch (err) {
      setProfileMsg(err.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEncryptionKey(null);
    setMasterPassword('');
    setItems([]);
    setAuthForm({ username: '', password: '' });
    setView('auth');
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); } catch (err) { console.error('Unable to copy', err); }
    document.body.removeChild(textArea);
  };

  const filteredItems = items.filter(item =>
    item.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Auth View ---

  if (view === 'auth') {
    return (
      <div className="min-h-screen w-full bg-[#E8E6E1] flex items-center justify-center p-4 font-sans text-slate-800 overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
        <div className="absolute top-[20%] left-[-10%] w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

        <GlassCard className="w-full max-w-md z-10 flex flex-col gap-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 text-white mb-4 rotate-3">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">LiquidPass</h1>
            <p className="text-slate-500">End-to-End Encrypted Vault</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <GlassInput icon={User} name="username" placeholder="Username" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} />
            <GlassInput icon={Lock} type="password" name="password" placeholder="Master Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            {error && <p className="text-rose-500 text-sm text-center font-medium bg-rose-100/50 py-2 rounded-xl border border-rose-200">{error}</p>}
            {authMode === 'signup' && (
              <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <Shield size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <span><strong>Zero-Knowledge Encryption:</strong> Your master password is the encryption key. If you forget it, your data <strong>cannot be recovered</strong>.</span>
              </div>
            )}
            <LiquidButton type="submit" disabled={loading}>
              {loading ? 'Deriving key & authenticating...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </LiquidButton>
          </form>

          <div className="text-center">
            <button onClick={() => { setError(''); setAuthMode(authMode === 'login' ? 'signup' : 'login'); }} className="text-slate-500 hover:text-violet-600 text-sm font-medium transition-colors">
              {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // --- Dashboard View ---
  return (
    <div className="min-h-screen w-full bg-[#E8E6E1] p-4 md:p-8 font-sans text-slate-800 relative overflow-x-hidden">
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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck size={14} />
              <span>E2E Encrypted</span>
            </div>
            <LiquidButton variant="ghost" className="w-auto px-4 py-2" onClick={() => { setShowProfile(true); setProfileMsg(''); setChangePassForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}>
              <UserCircle size={18} />
              <span>Profile</span>
            </LiquidButton>
            <LiquidButton variant="ghost" className="w-auto px-4 py-2" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </LiquidButton>
            <LiquidButton className="w-auto shadow-lg shadow-violet-500/20" onClick={() => setShowAddModal(true)}>
              <Plus size={20} />
              <span>New Password</span>
            </LiquidButton>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel */}
          <div className="space-y-6">
            <GlassCard className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Search vault..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/50 border border-white/40 focus:bg-white/80 focus:ring-2 focus:ring-violet-400/30 outline-none transition-all placeholder-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-violet-100 to-white p-4 rounded-2xl border border-white/40 text-center">
                  <span className="block text-2xl font-bold text-violet-600">{items.length}</span>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Passwords</span>
                </div>
                <div className="bg-gradient-to-br from-emerald-100 to-white p-4 rounded-2xl border border-white/40 text-center">
                  <span className="block text-2xl font-bold text-emerald-600">AES-256</span>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Encryption</span>
                </div>
              </div>
            </GlassCard>

            {/* E2E Info Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600" />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={24} />
                  <h3 className="text-xl font-bold">Zero-Knowledge</h3>
                </div>
                <p className="text-white/80 text-sm mb-2">Your vault is encrypted with AES-256-GCM. Only your master password can decrypt your data.</p>
                <div className="flex items-center gap-2 text-xs text-white/60 font-mono">
                  <Lock size={12} />
                  <span>PBKDF2 · 600K iterations · SHA-256</span>
                </div>
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
                  <PasswordCard key={item.id} item={item} onCopy={copyToClipboard} onEdit={openEdit} onDelete={openDelete} />
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

      {/* ─── Add Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <GlassCard className="w-full max-w-md relative z-10 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Add New Password</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-white/30 text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Website / App</label><GlassInput name="site" placeholder="e.g. Netflix" value={newItem.site} onChange={(e) => setNewItem({ ...newItem, site: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Username</label><GlassInput name="username" placeholder="email@example.com" value={newItem.username} onChange={(e) => setNewItem({ ...newItem, username: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Password</label><GlassInput name="password" placeholder="Super secret password" value={newItem.password} onChange={(e) => setNewItem({ ...newItem, password: e.target.value })} /></div>
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2">
                <ShieldCheck size={14} className="flex-shrink-0" /><span>This entry will be encrypted before leaving your browser.</span>
              </div>
              <div className="flex gap-3 pt-4">
                <LiquidButton variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</LiquidButton>
                <LiquidButton type="submit" variant="secondary" className="flex-1" disabled={loading || !newItem.site || !newItem.password}>{loading ? 'Encrypting...' : 'Save Entry'}</LiquidButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* ─── Edit Modal ─── */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <GlassCard className="w-full max-w-md relative z-10 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Edit Password</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl hover:bg-white/30 text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditItem} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Website / App</label><GlassInput name="site" placeholder="e.g. Netflix" value={editForm.site} onChange={(e) => setEditForm({ ...editForm, site: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Username</label><GlassInput name="username" placeholder="email@example.com" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-600 mb-1 ml-1">Password</label><GlassInput name="password" placeholder="New password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></div>
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2">
                <ShieldCheck size={14} className="flex-shrink-0" /><span>Updated entry will be re-encrypted before saving.</span>
              </div>
              <div className="flex gap-3 pt-4">
                <LiquidButton variant="ghost" onClick={() => setShowEditModal(false)} className="flex-1">Cancel</LiquidButton>
                <LiquidButton type="submit" variant="primary" className="flex-1" disabled={loading || !editForm.site || !editForm.password}>{loading ? 'Encrypting...' : 'Update Entry'}</LiquidButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* ─── Delete Confirmation ─── */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <GlassCard className="w-full max-w-sm relative z-10 animate-scale-in text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Password?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete the password for <strong className="text-slate-700">{deleteTarget.site}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <LiquidButton variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancel</LiquidButton>
              <LiquidButton variant="danger" onClick={handleDeleteItem} className="flex-1" disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</LiquidButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─── Profile Modal ─── */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <GlassCard className="w-full max-w-md relative z-10 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Profile</h2>
              <button onClick={() => setShowProfile(false)} className="p-2 rounded-xl hover:bg-white/30 text-slate-500"><X size={20} /></button>
            </div>

            {/* User Info */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
                  <UserCircle size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{currentUser?.username}</h3>
                  <p className="text-sm text-slate-500">Account ID: {currentUser?.id?.slice(-8)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-violet-100 to-white p-4 rounded-2xl border border-white/40 text-center">
                  <span className="block text-2xl font-bold text-violet-600">{items.length}</span>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Saved Passwords</span>
                </div>
                <div className="bg-gradient-to-br from-emerald-100 to-white p-4 rounded-2xl border border-white/40 text-center">
                  <span className="block text-2xl font-bold text-emerald-600">AES-256</span>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Encryption</span>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="border-t border-white/20 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Key size={20} className="text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">Change Master Password</h3>
              </div>

              <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-4">
                <Shield size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <span>Changing your master password will <strong>re-encrypt all vault items</strong> with the new key. Make sure you remember it — there is no recovery.</span>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <GlassInput icon={Lock} type="password" name="oldPassword" placeholder="Current Password" value={changePassForm.oldPassword} onChange={(e) => setChangePassForm({ ...changePassForm, oldPassword: e.target.value })} />
                <GlassInput icon={Lock} type="password" name="newPassword" placeholder="New Password (min 6 chars)" value={changePassForm.newPassword} onChange={(e) => setChangePassForm({ ...changePassForm, newPassword: e.target.value })} />
                <GlassInput icon={Lock} type="password" name="confirmPassword" placeholder="Confirm New Password" value={changePassForm.confirmPassword} onChange={(e) => setChangePassForm({ ...changePassForm, confirmPassword: e.target.value })} />
                {profileMsg && (
                  <p className={`text-sm text-center font-medium py-2 rounded-xl border ${profileMsg.includes('✅') ? 'text-emerald-600 bg-emerald-50/80 border-emerald-200' : 'text-rose-500 bg-rose-100/50 border-rose-200'}`}>{profileMsg}</p>
                )}
                <LiquidButton type="submit" variant="primary" disabled={loading || !changePassForm.oldPassword || !changePassForm.newPassword || !changePassForm.confirmPassword}>
                  {loading ? 'Re-encrypting vault...' : 'Change Password'}
                </LiquidButton>
              </form>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}