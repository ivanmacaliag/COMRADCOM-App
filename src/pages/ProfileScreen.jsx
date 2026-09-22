import React from 'react';
import { UserCircle, Wifi, WifiOff, Radio, LogOut, Shield, MapPin, CheckCircle2, Navigation } from 'lucide-react';

export function ProfileScreen({ isConnected, onDisconnect, onConnect, locationSharing, locationStatus, onStartLocationSharing, onStopLocationSharing, operatorName }) {
  return (
    <div className="flex flex-col h-full px-5 py-5 space-y-4 overflow-y-auto pb-6">
      {/* Header */}
      <div className="animate-slide-up">
        <span className="text-[9px] text-primary font-bold tracking-[0.2em]">ACCOUNT & SETTINGS</span>
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Operator Profile</h2>
      </div>

      {/* Live Location Card (Ticked by Default) */}
      <div className="glass-card rounded-3xl p-5 border border-white/80 bg-white/90 shadow-sm animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Navigation size={20} className={locationSharing ? 'animate-pulse text-primary' : 'text-slate-400'} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Share Live Location</h3>
              <p className="text-[10px] text-slate-400">Automatic background GPS telemetry for emergency response</p>
            </div>
          </div>

          {/* Checked / Ticked Toggle UI */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={locationSharing} 
              onChange={() => locationSharing ? onStopLocationSharing() : onStartLocationSharing()}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs mt-2">
          <span className="text-slate-600 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={15} className={locationSharing ? 'text-green-600' : 'text-slate-300'} />
            <span>{locationStatus}</span>
          </span>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
            locationSharing ? 'bg-green-500/10 text-green-700 border border-green-500/20' : 'bg-slate-200 text-slate-500'
          }`}>
            {locationSharing ? 'ENABLED (TICKED)' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-3xl p-5 border border-white/80 bg-white/90 shadow-sm animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20"
            style={{ background: 'linear-gradient(135deg, #003F87, #0056B3)' }}>
            <span className="text-white font-black text-xl">{operatorName.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 text-lg">{operatorName}</h3>
            <p className="text-xs text-slate-500 font-medium">COMRADCOM Network Philippines</p>
            <div className="flex items-center mt-1.5">
              <div className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-[10px] font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected to Zello Work' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="glass-card rounded-3xl p-5 border border-white/80 bg-white/90 shadow-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mr-3"
            style={{ background: isConnected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
            {isConnected ? <Wifi size={18} className="text-green-600" /> : <WifiOff size={18} className="text-red-600" />}
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm">Radio Connection</h3>
        </div>
        
        <div className="space-y-2 mb-4 text-xs font-semibold text-slate-700">
          <InfoRow label="Network" value="comradcom" />
          <InfoRow label="Server" value="wss://zello.io/ws" />
          <InfoRow label="Frequency" value="146.020 Mhz" />
          <InfoRow label="Status" value={isConnected ? 'Authenticated' : 'Offline'} 
            valueColor={isConnected ? '#16a34a' : '#dc2626'} />
        </div>
        
        {isConnected ? (
          <button onClick={onDisconnect}
            className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 bg-red-50 text-red-600 border border-red-200/60 transition-all active:scale-[0.97] hover:bg-red-100">
            <LogOut size={16} />
            <span>Disconnect Radio</span>
          </button>
        ) : (
          <button onClick={onConnect}
            className="w-full py-3 rounded-xl font-black text-xs text-white flex items-center justify-center space-x-2 bg-primary shadow-lg shadow-primary/25 transition-all active:scale-[0.97] hover:bg-primary-light">
            <Radio size={16} />
            <span>Connect to Network</span>
          </button>
        )}
      </div>

      {/* System Info */}
      <div className="glass-card rounded-3xl p-5 border border-white/80 bg-white/90 shadow-sm animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mr-3">
            <Shield size={18} className="text-primary" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm">System & PWA Status</h3>
        </div>
        <div className="space-y-2 text-xs font-semibold text-slate-700">
          <InfoRow label="App Version" value="1.0.0 (PWA Mobile)" />
          <InfoRow label="Background Mode" value="Active (WakeLock)" />
          <InfoRow label="Codec" value="Opus @ 16kHz" />
        </div>
      </div>

      <div className="rounded-2xl p-4 text-center text-[10px] text-slate-400 font-medium">
        COMRADCOM Network Philippines Inc.<br />
        Community Radio & Disaster Communications
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <span className="text-xs font-extrabold" style={{ color: valueColor || '#1e293b' }}>{value}</span>
    </div>
  );
}
