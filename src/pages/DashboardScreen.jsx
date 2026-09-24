import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Activity, Thermometer, Radio, Wind, Satellite, 
  RefreshCw, MapPin, AlertCircle, Clock, Bell, BellOff, ShieldCheck, Map as MapIcon, Globe
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { saveNotification } from '../services/notifications';

export function DashboardScreen() {
  const [eqEvents, setEqEvents] = useState([]);
  const [eqLoading, setEqLoading] = useState(true);
  const [eqError, setEqError] = useState(null);

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Default location set to Iligan City (8.2280, 124.2452)
  const [userLocation, setUserLocation] = useState({
    lat: 8.2280,
    lon: 124.2452,
    name: 'Iligan City, Philippines',
    isLive: false
  });

  const [currentTime, setCurrentTime] = useState('');
  const [notifPermission, setNotifPermission] = useState('default');
  const [notifStatus, setNotifStatus] = useState('');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const lastWeatherNotifRef = useRef('');

  // 1. Get User's Live Geolocation & Reverse Geocode City Name
  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          // Reverse Geocoding API for exact city/locality name
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          if (res.ok) {
            const data = await res.json();
            const locality = data.locality || data.city || data.principalSubdivision || 'Iligan City';
            const country = data.countryName || 'Philippines';
            setUserLocation({
              lat,
              lon,
              name: `${locality}, ${country}`,
              isLive: true
            });
          } else {
            setUserLocation({ lat, lon, name: `GPS (${lat.toFixed(2)}, ${lon.toFixed(2)})`, isLive: true });
          }
        } catch (e) {
          setUserLocation({ lat, lon, name: `GPS (${lat.toFixed(2)}, ${lon.toFixed(2)})`, isLive: true });
        }
      },
      (err) => {
        console.warn('Geolocation fallback to Iligan City:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 2. Request Notification Permission + register Periodic Background Sync
  const requestNotificationPermission = async () => {
    // Check if running on iPhone/iOS Safari outside PWA standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (!('Notification' in window)) {
      if (isIOS && !isStandalone) {
        setNotifStatus("On iPhone, tap Share (⬆) and select 'Add to Home Screen' to enable alerts.");
      } else {
        setNotifStatus('Notifications are not supported by this browser.');
      }
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        // Register Periodic Background Sync so alerts fire even when app is closed
        if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.periodicSync.register('comradcom-background-check', {
              minInterval: 15 * 60 * 1000 // every 15 minutes minimum
            });
            console.log('[COMRADCOM] Periodic background sync registered.');
          } catch (syncErr) {
            console.warn('[COMRADCOM] Periodic sync not available:', syncErr);
          }
        }

        await sendAlertNotification(
          'COMRADCOM Emergency Alerts Enabled',
          'You will receive weather & emergency advisories in background.'
        );
        setNotifStatus('Notifications are active. Alerts will arrive even when app is closed.');
      } else {
        setNotifStatus('Notification permission was denied in phone settings.');
      }
    } catch (e) {
      console.error('Notification permission error:', e);
      setNotifStatus('Unable to request notification permission.');
    }
  };

  // 3. Send Notification — always routed through the COMRADCOM Service Worker
  //    so the app icon (pwa-192x192.png) appears instead of the browser logo.
  const sendAlertNotification = async (title, body) => {
    // Always save to in-app notification center history
    saveNotification({
      title,
      body,
      category: 'warning',
      timestamp: new Date().toISOString()
    });

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      // PRIORITY: use the COMRADCOM service worker's showNotification().
      // This ensures the icon shown is pwa-192x192.png (COMRADCOM logo)
      // and NOT the browser icon (Edge, Chrome, etc.).
      if ('serviceWorker' in navigator) {
        let reg;
        try {
          reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, rej) => setTimeout(() => rej(new Error('sw-timeout')), 3000))
          ]);
        } catch {
          reg = await navigator.serviceWorker.getRegistration();
        }

        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/badge.png',
            tag: `comradcom-${Date.now()}`,
            renotify: true,
            data: { url: '/' }
          });
          return;
        }
      }

      // Desktop-only fallback (never used on Android/iOS successfully with SW)
      try { new Notification(title, { body, icon: '/pwa-192x192.png', badge: '/badge.png' }); }
      catch (e) { console.warn('[COMRADCOM] Direct Notification() failed:', e); }
    } catch (e) {
      console.error('[COMRADCOM] Notification error:', e);
    }
  };

  // 4. Fetch USGS Seismic Data (Seismic notifications disabled as requested)
  const fetchEarthquakes = async () => {
    setEqLoading(true);
    setEqError(null);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&minlatitude=4&maxlatitude=22&minlongitude=114&maxlongitude=128&starttime=${thirtyDaysAgo}&limit=30`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch seismic data');
      const data = await res.json();
      const features = data.features || [];
      setEqEvents(features);
      // Note: Seismic push notification trigger is disabled per user request
    } catch (err) {
      console.error('EQ Fetch Error:', err);
      setEqError('Could not sync live seismic feed');
    } finally {
      setEqLoading(false);
    }
  };

  // 5. Fetch DOST-PAGASA & Open-Meteo Weather for User's Location (Default: Iligan City)
  const fetchWeather = async (lat = userLocation.lat, lon = userLocation.lon) => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FManila`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();
      const code = data.current.weather_code;
      const windSpeed = data.current.wind_speed_10m;

      const weatherMap = {
        0: { desc: 'CLEAR SKY', icon: '☀️' },
        1: { desc: 'MAINLY CLEAR', icon: '🌤️' },
        2: { desc: 'PARTLY CLOUDY', icon: '⛅' },
        3: { desc: 'OVERCAST', icon: '☁️' },
        45: { desc: 'FOGGY', icon: '🌫️' },
        51: { desc: 'LIGHT DRIZZLE', icon: '🌦️' },
        61: { desc: 'HEAVY RAIN', icon: '🌧️' },
        80: { desc: 'RAIN SHOWERS', icon: '🌧️' },
        95: { desc: 'THUNDERSTORM ADVISORY', icon: '⛈️' }
      };

      const cond = weatherMap[code] || { desc: 'CLOUDY', icon: '☁️' };
      const pagasaStatus = windSpeed > 61 || code === 95 ? 'PAGASA ADVISORY' : 'CLEAR';

      setWeather({
        temp: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        windSpeed,
        condition: cond,
        pagasaStatus
      });

      // Notify user if severe weather detected at their location
      if (pagasaStatus === 'PAGASA ADVISORY' && lastWeatherNotifRef.current !== cond.desc) {
        lastWeatherNotifRef.current = cond.desc;
        sendAlertNotification(
          `🌀 DOST-PAGASA Weather Warning`,
          `${cond.desc} at ${userLocation.name}. Wind: ${windSpeed} km/h`
        );
      }
    } catch (err) {
      console.error('Weather error:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const refreshAll = () => {
    getUserLocation();
    fetchEarthquakes();
    fetchWeather(userLocation.lat, userLocation.lon);
  };

  // Initial Load
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    getUserLocation();
    fetchEarthquakes();
    fetchWeather(userLocation.lat, userLocation.lon);

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    const eqInterval = setInterval(fetchEarthquakes, 300000);
    const weatherInterval = setInterval(() => fetchWeather(userLocation.lat, userLocation.lon), 600000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(eqInterval);
      clearInterval(weatherInterval);
    };
  }, []);

  // Update weather whenever user location updates
  useEffect(() => {
    fetchWeather(userLocation.lat, userLocation.lon);
  }, [userLocation.lat, userLocation.lon]);

  // 6. Initialize & Render GIS Leaflet Map for Seismic Activity
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [userLocation.lat, userLocation.lon],
        zoom: userLocation.isLive ? 8 : 7,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lon]);
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Add User/Default Location Marker (Iligan City default)
    const userMarker = L.circleMarker([userLocation.lat, userLocation.lon], {
      radius: 8,
      fillColor: '#003F87',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(map);

    userMarker.bindPopup(`<b>Location: ${userLocation.name}</b>`);
    markersRef.current.push(userMarker);

    // Plot Earthquakes on GIS Map
    eqEvents.forEach((eq) => {
      const coords = eq.geometry?.coordinates;
      if (!coords || coords.length < 2) return;

      const lat = coords[1];
      const lon = coords[0];
      const depth = coords[2];
      const mag = eq.properties?.mag || 0;
      const place = eq.properties?.place || 'Philippines';
      const timeStr = new Date(eq.properties?.time).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      const color = mag >= 5.0 ? '#ef4444' : mag >= 4.0 ? '#f59e0b' : '#10b981';
      const radius = Math.max(6, mag * 2.5);

      const circle = L.circleMarker([lat, lon], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: ${color}; font-size: 14px;">M${mag.toFixed(1)} Earthquake</strong><br/>
          <strong>Place:</strong> ${place}<br/>
          <strong>Depth:</strong> ${depth} km<br/>
          <strong>Time:</strong> ${timeStr} PHT
        </div>
      `);

      markersRef.current.push(circle);
    });

  }, [eqEvents, userLocation]);

  return (
    <div className="flex flex-col min-h-full px-4 sm:px-6 py-5 space-y-5 overflow-y-auto pb-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-primary font-black tracking-[0.2em]">OPERATIONS CENTER</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">Network Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <MapPin size={12} className="text-primary" />
            <span>Weather & Seismic tailored to: <strong className="text-slate-800">{userLocation.name}</strong></span>
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Enable Notifications Pill */}
          {notifPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-md hover:bg-amber-600 active:scale-95 transition-all flex items-center space-x-1.5"
              title="Enable Emergency Weather Notifications"
            >
              <Bell size={14} />
              <span>Enable Alerts</span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-sm flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Clock size={14} className="text-primary" />
            <span>{currentTime || '00:00:00'} PHT</span>
          </div>

          <button 
            onClick={refreshAll}
            className="p-2 rounded-xl bg-primary text-white shadow-md hover:bg-primary-light active:scale-95 transition-all flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={`${eqLoading || weatherLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        
        {/* Stat 1: Active Operators */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/60 bg-white/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-primary mb-2">
            <Users size={18} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10">ONLINE</span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">7</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operators Active</div>
          </div>
        </div>

        {/* Stat 2: EQ Events */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/60 bg-white/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <Activity size={18} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10">GIS SEISMIC</span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{eqLoading ? '...' : eqEvents.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EQ Events (30D)</div>
          </div>
        </div>

        {/* Stat 3: Weather (Default: Iligan City) */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/60 bg-white/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <Thermometer size={18} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 truncate max-w-[75px]">
              {userLocation.isLive ? 'YOUR GPS' : 'ILIGAN'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{weatherLoading ? '--' : `${weather?.temp || 30}°C`}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{userLocation.name.split(',')[0]}</div>
          </div>
        </div>

        {/* Stat 4: Freq */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/60 bg-white/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <Radio size={18} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">VHF</span>
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">146.020</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Freq</div>
          </div>
        </div>

        {/* Stat 5: DOST-PAGASA Typhoon Status */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/60 bg-white/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-600 mb-2">
            <Wind size={18} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10">PAGASA</span>
          </div>
          <div>
            <div className={`text-lg font-black ${weather?.pagasaStatus === 'PAGASA ADVISORY' ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
              {weather?.pagasaStatus || 'CLEAR'}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Typhoon Status</div>
          </div>
        </div>

        {/* Stat 6: Sat Feed Status */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/60 bg-white/70 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <Satellite size={18} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10">FEED</span>
          </div>
          <div>
            <div className="text-lg font-black text-slate-800">HIMAWARI-9</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Satellite Feed</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Satellite View & User Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        
        {/* Himawari Satellite Hero Panel */}
        <div className="lg:col-span-2 glass-card rounded-3xl overflow-hidden border border-white/70 bg-white/80 shadow-md flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Satellite size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">HIMAWARI-9 SATELLITE FEED</h3>
                <p className="text-[10px] text-slate-500">DOST-PAGASA Live Infrared Radar Satellite Imagery</p>
              </div>
            </div>
            <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
              Auto-update 10m
            </span>
          </div>

          <div className="p-3 bg-slate-950 relative flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[320px]">
            <img 
              src="https://src.meteopilipinas.gov.ph/repo/himawari/24hour/irsml/latestHIM_irsml.gif" 
              alt="Himawari-9 Satellite Feed" 
              className="w-full max-h-[380px] object-contain rounded-xl shadow-inner"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://www.pagasa.dost.gov.ph/images/satellite/latest_himawari.gif';
              }}
            />
            <div className="absolute bottom-5 left-5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-[10px] font-bold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>PHILIPPINES SECTOR</span>
            </div>
          </div>
        </div>

        {/* Location Weather Widget & DOST-PAGASA Info */}
        <div className="space-y-5 flex flex-col justify-between">
          
          {/* Weather Widget tailored to location (Default: Iligan City) */}
          <div className="glass-card p-5 rounded-3xl border border-white/70 bg-white/80 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black tracking-wider text-primary uppercase flex items-center gap-1">
                <MapPin size={12} /> Local Weather Forecast
              </span>
              <span className="text-[10px] font-bold text-slate-500 truncate max-w-[140px]">{userLocation.name}</span>
            </div>

            {weatherLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-black text-slate-800">{weather?.temp || 30}°C</div>
                    <div className="text-xs font-extrabold text-slate-700 mt-1 flex items-center gap-1">
                      <span>{weather?.condition?.icon || '☁️'}</span>
                      <span>{weather?.condition?.desc || 'CLOUDY'}</span>
                    </div>
                  </div>
                  <div className="text-5xl opacity-90">
                    {weather?.condition?.icon || '☁️'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-bold">
                  <div>Humidity: <span className="text-slate-800">{weather?.humidity}%</span></div>
                  <div>Wind Speed: <span className="text-slate-800">{weather?.windSpeed} km/h</span></div>
                </div>
              </div>
            )}
          </div>

          {/* DOST-PAGASA Alert Info Card */}
          <div className="glass-card p-5 rounded-3xl border border-white/70 bg-white/80 shadow-md flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <ShieldCheck size={18} className="text-primary" />
                <h4 className="text-sm font-black text-slate-800">DOST-PAGASA Weather Feed</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Integrated real-time weather alerts & storm advisories enabled for your location.
              </p>
              
              <div className="mt-4 p-3 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-between text-xs font-bold text-primary">
                <span className="flex items-center gap-1.5">
                  <Bell size={14} />
                  <span>Weather Alerts: {notifPermission === 'granted' ? 'Active' : 'Disabled'}</span>
                </span>
                {notifPermission !== 'granted' && (
                  <button onClick={requestNotificationPermission} className="underline text-[10px]">Enable</button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>COMRADCOM GIS RADAR</span>
              <span>LIVE SENSORS</span>
            </div>
          </div>

        </div>
      </div>

      {/* GIS Leaflet Map & Recent Seismic Activity */}
      <div className="glass-card rounded-3xl border border-white/70 bg-white/80 shadow-md p-5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <MapIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">SEISMIC GIS INTERACTIVE MAP</h3>
              <p className="text-[10px] text-slate-500">Live USGS earthquake events plotted around {userLocation.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-[10px] font-bold">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> M 5.0+</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> M 4.0+</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> M 2.5+</span>
          </div>
        </div>

        {/* GIS Leaflet Map Canvas */}
        <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0 mb-4">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Earthquake Feed List */}
        {eqLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : eqError ? (
          <div className="flex items-center justify-center py-6 text-xs font-bold text-red-500 space-x-2">
            <AlertCircle size={16} />
            <span>{eqError}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eqEvents.slice(0, 6).map((event) => {
              const mag = event.properties?.mag || 0;
              const place = event.properties?.place || 'Unknown Location';
              const depth = event.geometry?.coordinates?.[2] || 0;
              const timeStr = new Date(event.properties?.time).toLocaleString('en-PH', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });

              const magBg = mag >= 5.0 ? 'bg-red-500 text-white' : mag >= 4.0 ? 'bg-amber-500 text-white' : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';

              return (
                <div key={event.id} className="p-3 rounded-2xl bg-white/60 border border-slate-200/60 flex items-center space-x-3 transition-all hover:bg-white hover:shadow-sm">
                  <div className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${magBg}`}>
                    M{mag.toFixed(1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{place}</h4>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                      <span>{timeStr} PHT</span>
                      <span>•</span>
                      <span>Depth: {depth} km</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
