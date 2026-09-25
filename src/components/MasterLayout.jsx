import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, Users, AlertTriangle, Globe, Rss, UserCircle, LayoutDashboard,
  LogIn, PowerOff, MoreVertical, X, ShieldCheck, RadioTower, LockKeyhole,
  Bell, CheckCheck, Trash2, Clock, ShieldAlert
} from 'lucide-react';
import { 
  getStoredNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications 
} from '../services/notifications';

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
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState(getStoredNotifications);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const headerRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setNotifications(e.detail);
      } else {
        setNotifications(getStoredNotifications());
      }
    };
    window.addEventListener('comradcom-notification-updated', handleUpdate);
    return () => window.removeEventListener('comradcom-notification-updated', handleUpdate);
  }, []);

  // Measure header & nav heights, inject as CSS vars so the scroll area
  // can add exactly the right padding without hard-coding pixel values.
  useEffect(() => {
    const update = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty(
          '--header-h', `${headerRef.current.getBoundingClientRect().height}px`
        );
      }
      if (navRef.current) {
        document.documentElement.style.setProperty(
          '--footer-h', `${navRef.current.getBoundingClientRect().height}px`
        );
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (headerRef.current) ro.observe(headerRef.current);
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenNotification = (notif) => {
    markNotificationAsRead(notif.id);
    setSelectedNotif(notif);
    setShowNotifMenu(false);
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const submitLogin = (event) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    onLoginSubmit({ username: username.trim(), password });
  };


  // Full Navigation List
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Talk', icon: Radio },
    { label: 'Members', icon: Users },
    { label: 'Alerts', icon: AlertTriangle },
    { label: 'Radar', icon: Globe },
    { label: 'Feed', icon: Rss },
    { label: 'Profile', icon: UserCircle }
  ];

  // Mobile Bottom Menu Items with "Talk" right in the CENTER
  const mobileNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Members', icon: Users },
    { label: 'Talk', icon: Radio, isCenter: true },
    { label: 'Feed', icon: Rss },
    { label: 'Profile', icon: UserCircle }
  ];

  const DesktopNavigationItems = () => navItems.map((item) => {
    const Icon = item.icon;
    const isSelected = currentScreen === item.label;
    return (
      <button 
        key={item.label} 
        onClick={() => setCurrentScreen(item.label)} 
        className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${
          isSelected 
            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
            : 'text-slate-500 hover:bg-primary/5 hover:text-primary'
        }`}
      >
        <Icon size={18} /> {item.label}
      </button>
    );
  });

  return (
    <div className="flex flex-col w-full max-w-[1600px] relative bg-background lg:h-[calc(100vh-2rem)] lg:rounded-3xl lg:shadow-2xl lg:ring-1 lg:ring-slate-200 lg:overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #F0F2F5 0%, #E8EDF5 100%)', minHeight: '100dvh' }}>
      
      {/* Header — fixed on mobile so it never moves during scroll/pull-to-refresh;
           on desktop (lg+) it reverts to normal in-flow positioning inside the card */}
      <header
        ref={headerRef}
        className="flex items-center justify-between px-4 sm:px-5 py-3 lg:px-8 lg:py-4 z-20 fixed top-0 left-0 right-0 lg:static lg:top-auto lg:left-auto lg:right-auto"
        style={{
          background: 'linear-gradient(135deg, #003F87 0%, #0056B3 100%)',
          boxShadow: '0 4px 20px rgba(0,63,135,0.3)',
        }}
      >
        <div className="flex items-center cursor-pointer" onClick={() => setCurrentScreen('Dashboard')}>
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
          
          {/* Notification Button (placed beside before 3-dot menu) */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              aria-label="Notifications"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/15 active:scale-95 relative"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              title="Notifications"
            >
              <Bell size={17} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-lg border-2 border-[#003F87] animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown Panel */}
            {showNotifMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                <div 
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white shadow-2xl rounded-3xl border border-slate-100 p-0 z-50 overflow-hidden animate-slide-up flex flex-col max-h-[80vh]"
                  style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}
                >
                  {/* Dropdown Header */}
                  <div className="p-4 bg-gradient-to-r from-[#003F87] to-[#0056B3] text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell size={18} />
                      <span className="font-black text-sm tracking-wide">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => markAllNotificationsAsRead()}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold flex items-center space-x-1 transition"
                          title="Mark all as read"
                        >
                          <CheckCheck size={12} />
                          <span>Read all</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => clearAllNotifications()}
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
                          title="Clear all notifications"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button 
                        onClick={() => setShowNotifMenu(false)}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="overflow-y-auto divide-y divide-slate-100 max-h-[380px]">
                    {notifications.length === 0 ? (
                      <div className="py-12 px-6 text-center text-slate-400 flex flex-col items-center">
                        <Bell size={32} className="text-slate-300 mb-2" />
                        <span className="text-xs font-bold text-slate-600">No notifications yet</span>
                        <p className="text-[11px] text-slate-400 mt-1">Pushed weather advisories, emergency alerts, and updates will appear here.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isUnread = !notif.read;
                        const isWarning = notif.category === 'warning' || notif.title?.includes('Warning') || notif.title?.includes('PAGASA');
                        const isCritical = notif.category === 'alert' || notif.title?.includes('Emergency') || notif.title?.includes('Critical');

                        return (
                          <div 
                            key={notif.id}
                            onClick={() => handleOpenNotification(notif)}
                            className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer hover:bg-slate-50 relative ${
                              isUnread ? 'bg-blue-50/40' : 'bg-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isCritical ? 'bg-red-100 text-red-600' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-primary'
                            }`}>
                              {isCritical ? <ShieldAlert size={16} /> : isWarning ? <AlertTriangle size={16} /> : <Bell size={16} />}
                            </div>

                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                                  {notif.title}
                                </h4>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-1.5" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                {notif.body}
                              </p>
                              <div className="flex items-center space-x-1 text-[9px] text-slate-400 mt-1.5 font-semibold">
                                <Clock size={10} />
                                <span>{formatTimeAgo(notif.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  {notifications.length > 0 && (
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                      <button 
                        onClick={() => { setShowNotifMenu(false); setCurrentScreen('Alerts'); }}
                        className="text-[11px] font-bold text-primary hover:underline"
                      >
                        View all system alerts & reports →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 3-Dot App Menu (Exit App) */}
          <div className="relative">
            <button onClick={() => setShowAppMenu(!showAppMenu)} aria-label="App menu"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              title="More options">
              <MoreVertical size={18} className="text-white/80" />
            </button>
            {showAppMenu && <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAppMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white shadow-2xl rounded-2xl border border-gray-100 p-2 z-50 animate-slide-up">
                <button onClick={() => { setShowAppMenu(false); onExit(); }} className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl font-bold text-sm text-red-600 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><X size={16} /></span> Exit app
                </button>
              </div>
            </>}
          </div>

          {!isConnected ? (
            <button onClick={onLoginClick} 
              className="flex items-center text-white font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-lg transition-all hover:bg-white/10 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <LogIn size={12} className="mr-1 sm:mr-1.5" /> Login
            </button>
          ) : (
            <div className="relative flex items-center gap-1">
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

      {/* Selected Notification Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up">
            <div className="p-5 bg-gradient-to-r from-[#003F87] to-[#0056B3] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell size={20} />
                <h3 className="text-base font-black">Notification Details</h3>
              </div>
              <button 
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {selectedNotif.timestamp ? new Date(selectedNotif.timestamp).toLocaleString() : 'Recent'}
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-1 leading-snug">
                  {selectedNotif.title}
                </h4>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedNotif.body}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => { setSelectedNotif(null); setCurrentScreen('Dashboard'); }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 transition"
                >
                  Open Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {/* pt compensates for fixed header on mobile; pb compensates for fixed bottom nav */}
      <div
        className="flex flex-1 flex-col overflow-y-auto lg:min-h-0 lg:flex-1"
        style={{
          paddingTop: 'var(--header-h, 56px)',
          paddingBottom: 'var(--footer-h, 64px)',
        }}
      >
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {loginOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
          <div className="mx-auto flex min-h-full max-w-6xl items-center p-4 sm:p-8">
            <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
              <section className="hidden bg-gradient-to-br from-[#002b5d] via-primary to-[#0a6ac4] p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="flex items-center gap-3"><img src="/comradcom-logo.png" alt="COMRADCOM" className="h-12 w-12 rounded-full bg-white object-cover" /><div><p className="text-sm font-black tracking-[0.16em]">COMRADCOM</p><p className="text-xs text-white/65">Network Philippines Inc.</p></div></div>
                <div><p className="text-xs font-black tracking-[0.2em] text-white/60">SECURE OPERATIONS ACCESS</p><h1 className="mt-3 max-w-md text-4xl font-black leading-tight">Connected when your community needs you.</h1><p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">Sign in with your issued Zello Work account to access communications, members, alerts, and field operations.</p></div>
                <div className="flex gap-5 text-xs text-white/70"><span className="flex items-center gap-2"><ShieldCheck size={17} /> Secure connection</span><span className="flex items-center gap-2"><RadioTower size={17} /> COMRADCOM network</span></div>
              </section>
              <form onSubmit={submitLogin} className="mx-auto w-full max-w-md p-6 sm:p-10 lg:py-14">
                <div className="mb-8 text-center lg:text-left"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 lg:hidden"><img src="/comradcom-logo.png" alt="COMRADCOM" className="h-full w-full rounded-2xl object-cover" /></div><p className="text-[10px] font-black tracking-[0.2em] text-primary">OPERATOR LOGIN</p><h2 className="mt-2 text-3xl font-black text-slate-900">Welcome back</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Enter the credentials provided by your COMRADCOM administrator.</p></div>
                <label className="mb-4 block text-sm font-bold text-slate-700">Network<div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-600"><RadioTower size={16} className="text-primary" /><span>comradcom</span></div></label>
                <label className="mb-4 block text-sm font-bold text-slate-700">Username<input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
                <label className="mb-6 block text-sm font-bold text-slate-700">Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
                {loginStatus && <p role="status" className={`mb-4 rounded-xl p-3 text-xs font-semibold ${loginStatus.includes('failed') || loginStatus.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-primary'}`}>{loginStatus}</p>}
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/25 transition hover:bg-primary-light"><LockKeyhole size={16} /> Sign in to COMRADCOM</button>
                {isConnected && <button type="button" onClick={onLoginClose} className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Return to dashboard</button>}
                <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">Your session remains on this device until you choose Logout.</p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation — fixed on mobile so it never moves;
           hidden on desktop (lg+) */}
      <nav
        ref={navRef}
        className="z-20 lg:hidden fixed bottom-0 left-0 right-0"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.08)',
          borderTop: '1px solid rgba(0,63,135,0.08)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-1 relative">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentScreen === item.label;

            // SPECIAL FOCUSED STYLING FOR CENTER "TALK" BUTTON
            if (item.isCenter) {
              return (
                <div key={item.label} className="relative -mt-6 flex flex-col items-center z-30">
                  <button
                    onClick={() => setCurrentScreen(item.label)}
                    aria-label="PTT Talk Page"
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl active:scale-90 ${
                      isSelected 
                        ? 'bg-gradient-to-tr from-[#002b5d] via-primary to-[#0056B3] text-white ring-4 ring-primary/30 scale-105' 
                        : 'bg-gradient-to-tr from-[#003F87] to-[#0056B3] text-white/90 hover:scale-105'
                    }`}
                    style={{
                      boxShadow: isSelected 
                        ? '0 6px 25px rgba(0,63,135,0.5), 0 0 15px rgba(0,86,179,0.4)' 
                        : '0 4px 15px rgba(0,63,135,0.35)'
                    }}
                  >
                    <Icon size={26} className={`${isSelected ? 'animate-pulse' : ''}`} />
                  </button>
                  <span className={`text-[9px] font-black uppercase mt-1 tracking-wider transition-colors ${
                    isSelected ? 'text-primary' : 'text-slate-500'
                  }`}>
                    {item.label}
                  </span>
                </div>
              );
            }

            // Standard Bottom Nav Buttons
            return (
              <button 
                key={item.label} 
                onClick={() => setCurrentScreen(item.label)} 
                className="flex-1 flex flex-col items-center py-2 px-1 transition-all relative"
              >
                {isSelected && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />}
                <div className={`p-1.5 rounded-xl transition-all ${isSelected ? 'bg-primary/10' : ''}`}>
                  <Icon size={18} className={`transition-colors ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                </div>
                <span className={`text-[8px] font-bold uppercase mt-0.5 tracking-wider transition-colors ${
                  isSelected ? 'text-primary' : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area bottom spacer for mobile */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>
    </div>
  );
}
