import React, { useState, useEffect } from 'react';
import { Globe, Map, CloudLightning, Activity, AlertTriangle, Radio } from 'lucide-react';

export function MonitoringScreen() {
  const [seismicActivities, setSeismicActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeismic = async () => {
      try {
        const minLat = 4.6, maxLat = 21.1, minLon = 114.3, maxLon = 126.6;
        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${minLat}&maxlatitude=${maxLat}&minlongitude=${minLon}&maxlongitude=${maxLon}&minmagnitude=2.0&orderby=time&limit=10`;
        const response = await fetch(url);
        const json = await response.json();
        
        const events = json.features.map(f => {
          const props = f.properties;
          const date = new Date(props.time);
          return {
            magnitude: `M ${props.mag.toFixed(1)}`,
            magValue: props.mag,
            location: (props.place || '').replace("Philippines", "PH"),
            time: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
          };
        });
        setSeismicActivities(events);
      } catch (err) {
        console.error("Failed to fetch seismic data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSeismic();
  }, []);

  const getMagColor = (mag) => {
    if (mag >= 5) return '#88000E';
    if (mag >= 4) return '#B45309';
    if (mag >= 3) return '#003F87';
    return '#6B7280';
  };

  return (
    <div className="flex flex-col h-full px-5 py-5 space-y-4 overflow-y-auto pb-4">
      {/* Header */}
      <div className="animate-slide-up">
        <span className="text-[9px] text-primary font-bold tracking-[0.2em]">SITUATIONAL AWARENESS</span>
        <h2 className="text-2xl font-black text-on-surface leading-tight">Radar & Monitoring</h2>
        <p className="text-xs text-gray-400 mt-1">Real-time environmental intelligence</p>
      </div>

      {/* Weather Radar */}
      <div className="glass-card rounded-2xl p-4 animate-slide-up" 
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', animationDelay: '0.1s' }}>
        <div className="flex items-center mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mr-3"
            style={{ background: 'rgba(27,109,36,0.1)' }}>
            <Globe size={18} className="text-secondary" />
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-sm">Weather Radar</h3>
            <p className="text-[9px] text-gray-400 font-medium">Himawari-8 Satellite</p>
          </div>
        </div>
        <div className="w-full h-56 rounded-xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
          <iframe 
            src="https://src.meteopilipinas.gov.ph/repo/himawari/24hour/irsml/latestHIM_irsml.gif" 
            title="Weather Radar"
            className="w-full h-full border-0"
            style={{ transform: 'scale(1.3)', transformOrigin: 'center' }}
            sandbox="allow-scripts allow-same-origin"
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 text-center"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
            <span className="text-[9px] text-white/60 font-medium">Cloud movement over Philippines</span>
          </div>
        </div>
      </div>

      {/* Seismic Map */}
      <div className="glass-card rounded-2xl p-4 animate-slide-up" 
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', animationDelay: '0.15s' }}>
        <div className="flex items-center mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mr-3"
            style={{ background: 'rgba(136,0,14,0.08)' }}>
            <Map size={18} className="text-tertiary" />
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-sm">Interactive Seismic Map</h3>
            <p className="text-[9px] text-gray-400 font-medium">Philippines region epicenters</p>
          </div>
        </div>
        <div className="w-full h-72 rounded-xl overflow-hidden relative bg-gray-100">
          <iframe 
            src="https://www.volcanodiscovery.com/earthquakes/philippines/quake-map.html" 
            title="Seismic Map"
            className="w-full h-[150%] border-0"
            style={{ transform: 'translateY(-60px)' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      {/* Recent Seismic Activity */}
      <div className="glass-card rounded-2xl p-4 animate-slide-up" 
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', animationDelay: '0.2s' }}>
        <div className="flex items-center mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mr-3"
            style={{ background: 'rgba(136,0,14,0.08)' }}>
            <Activity size={18} className="text-tertiary" />
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-sm">Recent Seismic Activity</h3>
            <p className="text-[9px] text-gray-400 font-medium">USGS Live Feed • Philippines</p>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-[3px] border-tertiary/20 border-t-tertiary animate-spin" />
          </div>
        ) : seismicActivities.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400">
            <Radio size={32} className="mb-2 text-gray-300" />
            <span className="text-xs font-bold">No recent seismic events</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {seismicActivities.map((event, idx) => (
              <div key={idx} className={`flex justify-between items-center py-3 ${
                idx < seismicActivities.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
                <div className="flex items-center space-x-3">
                  {/* Magnitude Badge */}
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: `${getMagColor(event.magValue)}10` }}>
                    <span className="text-[9px] font-bold" style={{ color: getMagColor(event.magValue) }}>MAG</span>
                    <span className="text-sm font-black leading-none" style={{ color: getMagColor(event.magValue) }}>
                      {event.magValue.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-on-surface leading-tight truncate">{event.location}</span>
                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">{event.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regional Safety Forecast */}
      <div className="rounded-2xl p-4 flex items-start space-x-3 animate-slide-up"
        style={{ 
          background: 'linear-gradient(135deg, rgba(0,63,135,0.05) 0%, rgba(0,63,135,0.02) 100%)',
          border: '1px solid rgba(0,63,135,0.08)',
          animationDelay: '0.25s'
        }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,63,135,0.08)' }}>
          <CloudLightning className="text-primary" size={18} />
        </div>
        <div>
          <div className="text-[9px] text-primary/50 font-bold tracking-wider mb-1">REGIONAL FORECAST</div>
          <p className="text-xs text-primary/80 font-medium leading-relaxed">
            Maintain radio safety protocols. Active monitoring synchronized with global seismic sensors.
          </p>
        </div>
      </div>
    </div>
  );
}
