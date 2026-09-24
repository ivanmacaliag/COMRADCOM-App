import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mic, Volume2, Wifi, Activity, ShieldAlert, ChevronDown, 
  X, Search, Phone, Radio, Users, MapPin, CheckCircle2, UserCheck
} from 'lucide-react';
import { mockChannels, mockMembers } from '../data/mockData';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function HomeScreen({ 
  isConnected, 
  isTransmitting, 
  isReceiving, 
  onPttStart, 
  onPttStop, 
  pttStatus,
  zelloUsers = [],
  operatorName = 'Operator'
}) {
  const [showChannels, setShowChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(mockChannels[0]);
  const [latency, setLatency] = useState(28);
  const [showOperatorsModal, setShowOperatorsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [firestoreMembers, setFirestoreMembers] = useState([]);

  // Fetch Firestore registered members
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'members'), (snapshot) => {
        const docs = snapshot.docs.map(doc => {
          const data = doc.data();
          const name = data['First Name'] || data.firstName || data.fullName || data.name || doc.id;
          const callsign = data['Fancy Callsign :'] || data.callsign || data['COMRADCOM Callsign'] || '—';
          return {
            id: doc.id,
            name: typeof name === 'string' ? name : 'Registered Operator',
            callsign: typeof callsign === 'string' ? callsign : '—',
            position: data.Position || data.position || 'Radio Operator',
            contact: data['Contact Number 1'] || data.contact || '',
            address: data['Present Address:'] || data.address || '',
            status: 'online'
          };
        });
        setFirestoreMembers(docs);
      }, (err) => {
        console.warn('Firestore fallback to mock members:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore connection warning:', e);
    }
  }, []);

  // Compute total channel operators list ONLY for users INSIDE channel "146.020 Mhz"
  const channelOperators = useMemo(() => {
    if (!isConnected) return [];

    const list = [];
    const addedUsernames = new Set();

    // 1. Current logged-in user
    if (operatorName) {
      const match = firestoreMembers.find(m => 
        (m.name && m.name.toLowerCase() === operatorName.toLowerCase()) || 
        (m.callsign && m.callsign.toLowerCase() === operatorName.toLowerCase())
      );
      list.push({
        id: 'current-user',
        name: match?.name || operatorName,
        callsign: match?.callsign || operatorName.toUpperCase(),
        position: match?.position || 'Active Radio Operator (You)',
        contact: match?.contact || '',
        address: match?.address || '',
        status: isTransmitting ? 'transmitting' : isReceiving ? 'receiving' : 'online',
        isCurrent: true
      });
      addedUsernames.add(operatorName.toLowerCase());
      if (match?.name) addedUsernames.add(match.name.toLowerCase());
      if (match?.callsign) addedUsernames.add(match.callsign.toLowerCase());
    }

    // 2. Users inside the Zello channel
    if (Array.isArray(zelloUsers) && zelloUsers.length > 0) {
      zelloUsers.forEach((u, i) => {
        const uName = typeof u === 'string' ? u : u.username || u.name || u.callsign || `Operator-${i+1}`;
        if (!addedUsernames.has(uName.toLowerCase())) {
          addedUsernames.add(uName.toLowerCase());
          
          // Lookup matching member details in Firestore registry for rich metadata display
          const match = firestoreMembers.find(m => 
            (m.name && m.name.toLowerCase() === uName.toLowerCase()) || 
            (m.callsign && m.callsign.toLowerCase() === uName.toLowerCase())
          );

          list.push({
            id: `zello-${i}`,
            name: match?.name || uName,
            callsign: match?.callsign || uName.toUpperCase(),
            position: match?.position || u.status || 'Channel Member',
            contact: match?.contact || u.contact || '',
            address: match?.address || '',
            status: u.status || 'online'
          });
        }
      });
    }

    return list;
  }, [isConnected, operatorName, zelloUsers, firestoreMembers, isTransmitting, isReceiving]);

  // Filtered operators for modal
  const filteredOperators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return channelOperators;
    return channelOperators.filter(op => 
      [op.name, op.callsign, op.position, op.address, op.contact]
        .some(val => String(val || '').toLowerCase().includes(q))
    );
  }, [channelOperators, searchQuery]);

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

      {/* Online Users Pill - Clickable to open Channel Roster Modal */}
      <button 
        onClick={() => setShowOperatorsModal(true)}
        className="px-4 py-2 rounded-full flex items-center space-x-2 cursor-pointer transition-all hover:bg-primary/15 active:scale-95 border border-primary/10 shadow-sm"
        style={{ background: 'rgba(0,63,135,0.08)' }}
        title="Click to view online channel operators"
      >
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[11px] font-black text-primary tracking-wider uppercase">
          {isConnected ? `${channelOperators.length} OPERATOR${channelOperators.length === 1 ? '' : 'S'} ONLINE` : '0 OPERATORS ONLINE'}
        </span>
        <UserCheck size={14} className="text-primary ml-1" />
      </button>

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

      {/* Operators In Channel Modal Popup */}
      {showOperatorsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#003F87] to-[#0056B3] text-white relative shrink-0">
              <button 
                onClick={() => setShowOperatorsModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
              >
                <X size={18} />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
                  <Users size={24} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-black">Channel Operators</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-green-500/30 text-green-200 text-[10px] font-black border border-green-400/40">
                      {channelOperators.length} Active
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-medium mt-0.5">
                    Connected to <span className="font-bold">{selectedChannel.name}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search operator name, callsign, or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>

            {/* Operators List */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 divide-y divide-slate-100">
              {filteredOperators.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold">No operators match your search.</p>
                </div>
              ) : (
                filteredOperators.map((op, idx) => {
                  const initials = (op.name || 'OP').substring(0, 2).toUpperCase();
                  const isTrans = op.status === 'transmitting';
                  const isRecv = op.status === 'receiving';

                  return (
                    <div key={op.id || idx} className="pt-3 first:pt-0 flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm ${
                          op.isCurrent 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-700' 
                            : 'bg-gradient-to-br from-[#003F87] to-[#0056B3]'
                        }`}>
                          {initials}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isTrans ? 'bg-red-500 animate-ping' : isRecv ? 'bg-green-500 animate-ping' : 'bg-green-500'
                          }`} />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="text-xs font-black text-slate-900 truncate">{op.name}</span>
                            {op.isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-black shrink-0">YOU</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-primary">{op.callsign}</span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[10px] text-slate-500 truncate">{op.position}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        {op.contact && (
                          <a 
                            href={`tel:${op.contact}`} 
                            className="w-8 h-8 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-700 transition"
                            title={`Call ${op.name}`}
                          >
                            <Phone size={14} />
                          </a>
                        )}
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          isTrans 
                            ? 'bg-red-100 text-red-700 animate-pulse' 
                            : isRecv 
                              ? 'bg-green-100 text-green-700 animate-pulse' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isTrans ? 'TALKING' : isRecv ? 'LISTENING' : 'ONLINE'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-center">
              <button
                onClick={() => setShowOperatorsModal(false)}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 transition active:scale-95"
              >
                Close Roster
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

