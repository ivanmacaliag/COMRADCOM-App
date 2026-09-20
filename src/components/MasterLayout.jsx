import React, { useState } from 'react';
import { 
  Radio, Users, AlertTriangle, Globe, Rss, UserCircle, LayoutDashboard,
  LogIn, PowerOff, MoreVertical, X
} from 'lucide-react';

export function MasterLayout({ 
  children, 
  currentScreen, 
  setCurrentScreen,
  isConnected,
  onLoginClick,
  onDisconnect,
  loginOpen,
  onLoginClose,
  onLoginSubmit,
  loginStatus,
  onExit
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submitLogin = (event) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    onLoginSubmit({ username: username.trim(), password });
  };

  const navItems = [
    { label: 'Talk', icon: Radio },
    { label: 'Members', icon: Users },
    { label: 'Alerts', icon: AlertTriangle },
    { label: 'Radar', icon: Globe },
    { label: 'Feed', icon: Rss },
    { label: 'Profile', icon: UserCircle }
  ];

  const NavigationItems = ({ desktop = false } = {}) => navItems.map((item) => {
    const Icon = item.icon;
    const isSelected = currentScreen === item.label;
    if (desktop) {
      return <button key={item.label} onClick={() => setCurrentScreen(item.label)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-primary/5 hover:text-primary'}`}>
        <Icon size={18} /> {item.label}
      </button>;
    }
    return <button key={item.label} onClick={() => setCurrentScreen(item.label)} className="flex-1 flex flex-col items-center py-2 sm:py-2.5 px-1 transition-all relative">
      {isSelected && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />}
      <div className={`p-1 sm:p-1.5 rounded-xl transition-all ${isSelected ? 'bg-primary/10' : ''}`}><Icon size={16} className={`sm:w-[18px] sm:h-[18px] transition-colors ${isSelected ? 'text-primary' : 'text-gray-400'}`} /></div>
      <span className={`text-[8px] sm:text-[9px] font-bold uppercase mt-0.5 tracking-wider transition-colors ${isSelected ? 'text-primary' : 'text-gray-400'}`}>{item.label}</span>
    </button>;
  });

  return (
    /* 
      Responsive container: Full width and height for all devices 
    */
    <div className="flex flex-col h-screen w-full max-w-[1600px] relative overflow-hidden bg-background lg:h-[calc(100vh-2rem)] lg:rounded-3xl lg:shadow-2xl lg:ring-1 lg:ring-slate-200"
      style={{ background: 'linear-gradient(180deg, #F0F2F5 0%, #E8EDF5 100%)' }}>
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-5 py-3 lg:px-8 lg:py-4 z-20 relative"
        style={{ 
          background: 'linear-gradient(135deg, #003F87 0%, #0056B3 100%)',
          boxShadow: '0 4px 20px rgba(0,63,135,0.3)'
        }}>
        <div className="flex items-center cursor-pointer" onClick={() => setCurrentScreen('Profile')}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden bg-white"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              border: '2px solid rgba(255,255,255,0.4)'
            }}>
            <img src="/comradcom-logo.png" alt="COMRADCOM" className="h-full w-full object-cover" />
          </div>
          <div className="ml-2 sm:ml-3">
            <h1 className="text-white font-black tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm m-0 leading-tight">COMRADCOM</h1>
            <p className="text-white/50 text-[8px] sm:text-[9px] m-0 tracking-wider font-medium">Network Philippines Inc. <span className="hidden lg:inline">· Operations Console</span></p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Connection Status Pill */}
          <div className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] font-bold ${
            isConnected 
              ? 'bg-green-500/20 text-green-300' 
              : 'bg-red-500/20 text-red-300'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span>{isConnected ? 'LIVE' : 'OFF'}</span>
          </div>
          
          {!isConnected ? (
            <button onClick={onLoginClick} 
              className="flex items-center text-white font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-lg transition-all hover:bg-white/10 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <LogIn size={12} className="mr-1 sm:mr-1.5" /> Login
            </button>
          ) : (
            <div className="relative flex items-center gap-1">
              <button onClick={() => setShowAppMenu(!showAppMenu)} aria-label="App menu"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <MoreVertical size={18} className="text-white/80" />
              </button>
              {showAppMenu && <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAppMenu(false)} />
                <div className="absolute right-10 top-full mt-2 w-48 bg-white shadow-2xl rounded-2xl border border-gray-100 p-2 z-50">
                  <button onClick={() => { setShowAppMenu(false); onExit(); }} className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl font-bold text-sm text-red-600 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><X size={16} /></span> Exit app
                  </button>
                </div>
              </>}
              <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <UserCircle size={18} className="text-white/80" />
              </button>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white shadow-2xl rounded-2xl border border-gray-100 p-2 z-50 animate-slide-up">
                    <button 
                      onClick={() => { setShowProfileMenu(false); setCurrentScreen('Profile'); }}
                      className="w-full flex items-center p-3 hover:bg-primary/5 rounded-xl font-bold text-sm transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                        <UserCircle size={16} className="text-primary" />
                      </div>
                      View Profile
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button 
                      onClick={() => { setShowProfileMenu(false); onDisconnect(); }}
                      className="w-full flex items-center p-3 hover:bg-red-50 rounded-xl font-bold text-sm text-red-600 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                        <PowerOff size={16} className="text-red-600" />
                      </div>
                      Disconnect
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/90 p-4 lg:flex lg:flex-col">
          <div className="mb-6 px-3 pt-2">
            <p className="text-[10px] font-black tracking-[0.18em] text-slate-400">OPERATIONS</p>
            <p className="mt-1 text-sm font-bold text-slate-700">COMRADCOM Console</p>
          </div>
          <nav>{NavigationItems({ desktop: true })}</nav>
          <div className="mt-auto rounded-2xl bg-primary/5 p-4">
            <LayoutDashboard size={18} className="text-primary" />
            <p className="mt-2 text-xs font-bold text-slate-700">Network workspace</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Live communication, member directory, and field updates in one place.</p>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">{children}</main>
      </div>

      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <form onSubmit={submitLogin} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-900">COMRADCOM Login</h2>
              <p className="mt-1 text-sm text-slate-500">Enter the account details provided to you.</p>
            </div>
            <label className="mb-4 block text-sm font-bold text-slate-700">
              Network
              <input value="comradcom" readOnly className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-600" />
            </label>
            <label className="mb-4 block text-sm font-bold text-slate-700">
              Username
              <input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-primary" />
            </label>
            <label className="mb-6 block text-sm font-bold text-slate-700">
              Password
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-primary" />
            </label>
            {loginStatus && <p className={`mb-4 rounded-lg p-3 text-xs font-semibold ${loginStatus.includes('failed') || loginStatus.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-primary'}`}>{loginStatus}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onLoginClose} className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">Login</button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="z-20 relative lg:hidden"
        style={{ 
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.08)',
          borderTop: '1px solid rgba(0,63,135,0.06)'
        }}>
        <div className="flex justify-between px-1">
          {NavigationItems()}
        </div>
        {/* Safe area bottom spacer for mobile */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>
    </div>
  );
}
