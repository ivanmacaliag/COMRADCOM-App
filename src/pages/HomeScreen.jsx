import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Wifi, Activity, ShieldAlert, ChevronDown } from 'lucide-react';
import { mockChannels } from '../data/mockData';

export function HomeScreen({ isConnected, isTransmitting, isReceiving, onPttStart, onPttStop, pttStatus }) {
  const [showChannels, setShowChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(mockChannels[0]);
  const [latency, setLatency] = useState(28);

  // Simulate latency fluctuation
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setLatency(22 + Math.floor(Math.random() * 10));
    }, 2000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="flex flex-col items-center h-full px-5 py-4 space-y-5 overflow-y-auto pb-4">
      
      {/* Radio Status Card */}
      <div className="w-full glass-card rounded-2xl p-4 flex items-center justify-between animate-slide-up"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center">
          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${isConnected ? 'bg-green-500' : 'bg-red-600'}`}
            style={isConnected ? { boxShadow: '0 0 8px rgba(34,197,94,0.5)' } : {}} />
          <div>
            <span className={`font-black text-sm tracking-wide ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
            </span>
            <p className="text-[9px] text-gray-400 font-medium">COMRADCOM Radio Network</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-gray-400 font-bold tracking-wider mb-1">SIGNAL</span>
          <div className="flex items-end space-x-[3px] h-4">
            {[1, 2, 3, 4].map((bar) => (
              <div 
                key={bar} 
                className={`w-[4px] rounded-full transition-colors ${isConnected && bar <= 3 ? 'bg-green-600' : 'bg-gray-200'}`} 
                style={{ height: `${bar * 25}%` }} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Channel Selector */}
      <div className="flex flex-col items-center w-full animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <span className="text-[9px] text-primary/50 font-bold tracking-[0.2em] mb-2">SELECTED CHANNEL</span>
        <button 
          onClick={() => setShowChannels(!showChannels)}
          className="w-full glass-card rounded-full py-3 px-6 flex items-center justify-center space-x-3 active:scale-[0.97] transition-transform"
          style={{ boxShadow: '0 8px 30px rgba(0,63,135,0.12)' }}
        >
          <Wifi className="text-primary" size={18} />
          <span className="text-lg font-black text-primary tracking-wide">{selectedChannel.name}</span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>
        <span className="text-[9px] text-gray-400 font-bold mt-2 tracking-wider">COMRADCOM NETWORK LINK</span>
      </div>

      {/* Transmitting / Receiving Label */}
      {isTransmitting && (
        <div className="text-red-600 font-black text-xs tracking-[0.15em] animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          ● TRANSMITTING LIVE
        </div>
      )}
      {isReceiving && (
        <div className="text-green-600 font-black text-xs tracking-[0.15em] animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          ● RECEIVING VOICE AUDIO
        </div>
      )}
      {pttStatus && !isTransmitting && !isReceiving && (
        <div className="max-w-sm text-center text-xs font-bold text-slate-500">{pttStatus}</div>
      )}

      {/* PTT Button Area */}
      <div className="flex-1 flex items-center justify-center relative w-full min-h-[280px]">
        
        {/* Ripple rings when active */}
        {isReceiving && (
          <>
            <div className="absolute w-72 h-72 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute w-80 h-80 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: '2s' }} />
          </>
        )}

        {isTransmitting && (
          <>
            <div className="absolute w-72 h-72 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute w-80 h-80 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '2s' }} />
          </>
        )}

        {/* Pulsing glow for idle */}
        {!isTransmitting && !isReceiving && (
          <div className="absolute w-64 h-64 rounded-full animate-pulse-glow"
            style={{ background: 'radial-gradient(circle, rgba(0,86,179,0.08) 0%, transparent 70%)' }} />
        )}
        
        {/* Main PTT Button */}
        <button
          onPointerDown={(e) => { e.preventDefault(); onPttStart(); }}
          onPointerUp={(e) => { e.preventDefault(); onPttStop(); }}
          onPointerLeave={(e) => { e.preventDefault(); onPttStop(); }}
          className={`relative z-10 w-56 h-56 rounded-full flex flex-col items-center justify-center transition-all duration-300 active:scale-[0.93] ${
            isTransmitting ? 'scale-[0.94] ring-8 ring-red-500/40' : isReceiving ? 'scale-105 ring-8 ring-green-500/50 animate-pulse' : ''
          }`}
          style={{ 
            touchAction: 'none',
            background: isTransmitting 
              ? 'radial-gradient(circle at 40% 40%, #ef4444, #991b1b)' 
              : isReceiving 
                ? 'radial-gradient(circle at 40% 40%, #22c55e, #15803d)'
                : 'radial-gradient(circle at 40% 40%, #0056B3, #003F87)',
            boxShadow: isTransmitting 
              ? '0 20px 60px rgba(220,38,38,0.5), 0 0 40px rgba(220,38,38,0.3)' 
              : isReceiving
                ? '0 20px 60px rgba(34,197,94,0.6), 0 0 50px rgba(34,197,94,0.4)'
                : '0 20px 60px rgba(0,63,135,0.35), 0 0 40px rgba(0,63,135,0.15)'
          }}
        >
          {/* Inner rim */}
          <div className="absolute inset-2 rounded-full" 
            style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }} />
          
          {isReceiving ? (
            <Volume2 size={64} className="text-white mb-2 animate-bounce" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
          ) : (
            <Mic size={64} className="text-white mb-2" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }} />
          )}
          
          <span className="text-white font-black text-3xl leading-none tracking-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {isTransmitting ? 'TRANS' : isReceiving ? 'RECEIV' : 'PUSH'}
          </span>
          <span className="text-white/80 font-extrabold text-[10px] tracking-[0.2em] mt-1">
            {isTransmitting ? 'MITTING' : isReceiving ? 'ING VOICE' : 'TO TALK'}
          </span>
        </button>
      </div>

      {/* Online Users Pill */}
      <div className="px-4 py-1.5 rounded-full flex items-center space-x-2 cursor-pointer transition-all hover:bg-primary/10"
        style={{ background: 'rgba(0,63,135,0.06)' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold text-primary tracking-wider">7 OPERATORS ONLINE</span>
      </div>

      {/* Telemetry (Latency only, Battery removed) */}
      <div className="w-full">
        <div className="glass-card p-4 rounded-2xl flex flex-col items-center" 
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <span className="text-[9px] text-gray-400 font-bold tracking-wider">NETWORK LATENCY</span>
          <div className="flex items-baseline mt-1 space-x-1">
            <Activity size={16} className={isConnected ? 'text-green-600' : 'text-gray-300'} />
            <span className={`text-2xl font-black ${isConnected ? 'text-primary' : 'text-gray-300'}`}>
              {isConnected ? latency : '—'}
            </span>
            <span className="text-[10px] text-primary/60 font-bold">ms</span>
          </div>
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="w-full rounded-2xl p-4 flex items-center space-x-4 cursor-pointer transition-all hover:bg-red-100/80"
        style={{ background: 'linear-gradient(135deg, rgba(136,0,14,0.06) 0%, rgba(136,0,14,0.03) 100%)', border: '1px solid rgba(136,0,14,0.08)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(136,0,14,0.1)' }}>
          <ShieldAlert className="text-red-700" size={20} />
        </div>
        <div className="flex-1">
          <div className="text-[9px] text-red-700/60 font-bold tracking-wider">ACTIVE PROTOCOL</div>
          <div className="text-sm text-red-800 font-bold">Protocol Alpha Engaged</div>
        </div>
        <ChevronDown size={16} className="text-red-700/40 -rotate-90" />
      </div>
    </div>
  );
}
