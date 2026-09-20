import React from 'react';
import { UserCircle, Wifi, WifiOff, Radio, LogOut, Shield, MapPin, Phone, Mail, ChevronRight } from 'lucide-react';

export function ProfileScreen({ isConnected, onDisconnect, onConnect, locationSharing, locationStatus, onStartLocationSharing, onStopLocationSharing, operatorName }) {
  return (
    <div className="flex flex-col h-full px-5 py-5 space-y-4 overflow-y-auto pb-4">
      {/* Header */}
      <div className="animate-slide-up">
        <span className="text-[9px] text-primary font-bold tracking-[0.2em]">ACCOUNT</span>
        <h2 className="text-2xl font-black text-on-surface leading-tight">Operator Profile</h2>
      </div>

      <div className="glass-card rounded-2xl p-4 animate-slide-up" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center mb-2">
          <MapPin size={16} className="mr-3 text-primary" />
          <h3 className="font-bold text-on-surface text-sm">Live Location Sharing</h3>
        </div>
        <p className="mb-3 text-xs text-gray-500">{locationStatus}</p>
        <button disabled={!isConnected} onClick={locationSharing ? onStopLocationSharing : onStartLocationSharing}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: locationSharing ? 'rgba(136,0,14,0.08)' : 'linear-gradient(135deg, #003F87, #0056B3)', color: locationSharing ? '#88000E' : 'white' }}>
          {locationSharing ? 'Stop Sharing Location' : 'Share Live Location'}
        </button>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-5 animate-slide-up" 
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', animationDelay: '0.1s' }}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #003F87, #0056B3)', boxShadow: '0 8px 24px rgba(0,63,135,0.3)' }}>
            <span className="text-white font-black text-xl">{operatorName.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-on-surface text-lg">{operatorName}</h3>
            <p className="text-xs text-gray-400 font-medium">COMRADCOM Network Philippines</p>
            <div className="flex items-center mt-1">
              <div className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                style={isConnected ? { boxShadow: '0 0 6px rgba(34,197,94,0.5)' } : {}} />
              <span className={`text-[10px] font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected to Zello Work' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="glass-card rounded-2xl p-4 animate-slide-up"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)', animationDelay: '0.15s' }}>
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
            style={{ background: isConnected ? 'rgba(27,109,36,0.1)' : 'rgba(136,0,14,0.08)' }}>
            {isConnected ? <Wifi size={16} className="text-secondary" /> : <WifiOff size={16} className="text-tertiary" />}
          </div>
          <h3 className="font-bold text-on-surface text-sm">Connection</h3>
        </div>
        
        <div className="space-y-2 mb-4">
          <InfoRow label="Network" value="comradcom" />
          <InfoRow label="Server" value="wss://zello.io/ws" />
          <InfoRow label="Channel" value="146.020 Mhz" />
          <InfoRow label="Status" value={isConnected ? 'Authenticated' : 'Offline'} 
            valueColor={isConnected ? '#1B6D24' : '#88000E'} />
        </div>
        
        {isConnected ? (
          <button onClick={onDisconnect}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.97]"
            style={{ background: 'rgba(136,0,14,0.08)', color: '#88000E', border: '1px solid rgba(136,0,14,0.15)' }}>
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>
        ) : (
          <button onClick={onConnect}
            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center space-x-2 transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #003F87, #0056B3)', boxShadow: '0 4px 15px rgba(0,63,135,0.3)' }}>
            <Radio size={16} />
            <span>Connect to Network</span>
          </button>
        )}
      </div>

      {/* Quick Info */}
      <div className="glass-card rounded-2xl p-4 animate-slide-up"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)', animationDelay: '0.2s' }}>
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
            style={{ background: 'rgba(0,63,135,0.08)' }}>
            <Shield size={16} className="text-primary" />
          </div>
          <h3 className="font-bold text-on-surface text-sm">System Info</h3>
        </div>
        <div className="space-y-2">
          <InfoRow label="App Version" value="1.0.0 (PWA)" />
          <InfoRow label="Codec" value="Opus @ 16kHz" />
          <InfoRow label="Protocol" value="Zello Work WebSocket" />
        </div>
      </div>

      {/* About */}
      <div className="rounded-2xl p-4 text-center animate-slide-up"
        style={{ background: 'rgba(0,63,135,0.03)', animationDelay: '0.25s' }}>
        <p className="text-[10px] text-gray-400 font-medium">
          COMRADCOM Network Philippines Inc.<br />
          Community Radio & Disaster Communications
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-[10px] text-gray-400 font-bold tracking-wider">{label}</span>
      <span className="text-xs font-bold" style={{ color: valueColor || '#191C1D' }}>{value}</span>
    </div>
  );
}
