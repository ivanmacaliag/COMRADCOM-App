import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ChevronRight, ShieldAlert, Info, Bell } from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { mockAlerts } from '../data/mockData';

const categoryConfig = {
  alert: { bg: 'rgba(136,0,14,0.06)', border: '#88000E', icon: ShieldAlert, label: 'CRITICAL', labelBg: 'rgba(136,0,14,0.1)', labelColor: '#88000E' },
  warning: { bg: 'rgba(234,179,8,0.06)', border: '#B45309', icon: AlertTriangle, label: 'WARNING', labelBg: 'rgba(234,179,8,0.1)', labelColor: '#B45309' },
  announcement: { bg: 'rgba(0,63,135,0.04)', border: '#003F87', icon: Info, label: 'UPDATE', labelBg: 'rgba(0,63,135,0.1)', labelColor: '#003F87' },
};

export function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlerts(fetched.length > 0 ? fetched : mockAlerts);
      } catch (err) {
        console.error("Error fetching alerts:", err);
        setAlerts(mockAlerts);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts instanceof Date ? ts : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full px-5 py-5 space-y-4 overflow-y-auto pb-4">
      {/* Header */}
      <div className="animate-slide-up">
        <span className="text-[9px] text-tertiary font-bold tracking-[0.2em]">NETWORK STATUS</span>
        <h2 className="text-2xl font-black text-on-surface leading-tight">System Alerts</h2>
        <p className="text-xs text-gray-400 mt-1">Critical notifications and updates from HQ</p>
      </div>

      {/* Stats Bar */}
      <div className="flex space-x-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {[
          { label: 'Critical', count: alerts.filter(a => a.category === 'alert').length, color: '#88000E' },
          { label: 'Warnings', count: alerts.filter(a => a.category === 'warning').length, color: '#B45309' },
          { label: 'Updates', count: alerts.filter(a => a.category === 'announcement').length, color: '#003F87' },
        ].map((stat) => (
          <div key={stat.label} className="flex-1 glass-card rounded-xl p-3 flex flex-col items-center"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span className="text-xl font-black" style={{ color: stat.color }}>{stat.count}</span>
            <span className="text-[9px] text-gray-400 font-bold tracking-wider">{stat.label.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-[3px] border-tertiary/20 border-t-tertiary animate-spin" />
        </div>
      ) : alerts.map((alert, idx) => {
        const cat = categoryConfig[alert.category] || categoryConfig.announcement;
        const CatIcon = cat.icon;
        return (
          <div key={idx} className="rounded-2xl p-4 flex flex-col relative overflow-hidden animate-slide-up transition-all hover:scale-[1.01]"
            style={{ 
              background: cat.bg, 
              borderLeft: `4px solid ${cat.border}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              animationDelay: `${0.15 + idx * 0.05}s`
            }}>
            {/* Background watermark */}
            <CatIcon size={80} className="absolute -right-2 -bottom-2 opacity-[0.04]" style={{ color: cat.border }} />
            
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center space-x-2 flex-1 mr-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: cat.labelBg }}>
                  <CatIcon size={16} style={{ color: cat.labelColor }} />
                </div>
                <h3 className="font-bold text-on-surface text-sm leading-tight">{alert.title}</h3>
              </div>
              <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full flex-shrink-0"
                style={{ background: cat.labelBg, color: cat.labelColor }}>
                {cat.label}
              </span>
            </div>
            
            <p className="text-xs text-gray-600 mb-3 leading-relaxed relative z-10 pl-10">{alert.content}</p>
            
            <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold mt-auto border-t pt-2 pl-10 relative z-10"
              style={{ borderColor: `${cat.border}10` }}>
              <span className="flex items-center">
                <UserIcon className="mr-1" size={10} /> {alert.author}
              </span>
              <span className="flex items-center">
                <Clock size={10} className="mr-1" /> {formatTime(alert.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UserIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
