import React, { useState, useEffect, useRef } from 'react';
import { ZelloService } from './services/zello';
import { AudioService } from './services/audio';
import { PlayerService } from './services/player';
import { MasterLayout } from './components/MasterLayout';
import { DashboardScreen } from './pages/DashboardScreen';
import { HomeScreen } from './pages/HomeScreen';
import { UsersScreen } from './pages/UsersScreen';
import { AlertsScreen } from './pages/AlertsScreen';
import { FeedScreen } from './pages/FeedScreen';
import { MonitoringScreen } from './pages/MonitoringScreen';
import { ProfileScreen } from './pages/ProfileScreen';

function App() {
  const [currentScreen, setCurrentScreen] = useState('Talk');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [isRecording, setIsRecording] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [pttStatus, setPttStatus] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');
  const [operatorName, setOperatorName] = useState('Operator');
  const [locationSharing, setLocationSharing] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Location sharing is active.');
  
  const zelloRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const locationWatchRef = useRef(null);
  const pttRequestedRef = useRef(false);
  const receivingTimeoutRef = useRef(null);
  const wakeLockRef = useRef(null);
  const isExitedRef = useRef(false);

  // Request all allowable browser/device permissions on initial boot up
  const requestAppPermissions = async () => {
    try {
      // 1. Microphone access prompt
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop initial test track immediately after permission prompt
          stream.getTracks().forEach(track => track.stop());
        } catch (micErr) {
          console.warn('Microphone permission deferred or denied:', micErr);
        }
      }

      // 2. Location access prompt
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => { startLocationSharing(); },
          (geoErr) => { console.warn('Location permission deferred:', geoErr); },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      // 3. Notification permission prompt
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (notifErr) {
          console.warn('Notification permission deferred:', notifErr);
        }
      }
    } catch (err) {
      console.error('Permission initialization error:', err);
    }
  };

  // Keep PWA active in background using Screen Wake Lock API
  const requestWakeLock = async () => {
    if (isExitedRef.current) return;
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('WakeLock request info:', err.message);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    audioRef.current = new AudioService();
    playerRef.current = new PlayerService();

    audioRef.current.onAudioData = (buffer) => {
      zelloRef.current?.sendAudioChunk(buffer);
    };

    // Prompt for all permissions on boot
    requestAppPermissions();
    requestWakeLock();

    // Re-acquire WakeLock & re-sync location when app comes back to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isExitedRef.current) {
        requestWakeLock();
        if (isConnected && !locationWatchRef.current) {
          startLocationSharing();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (zelloRef.current) zelloRef.current.disconnect();
      if (audioRef.current) audioRef.current.stopRecording();
      if (locationWatchRef.current !== null) navigator.geolocation?.clearWatch(locationWatchRef.current);
      if (receivingTimeoutRef.current) clearTimeout(receivingTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedLogin = localStorage.getItem('comradcom-login');
      if (savedLogin) {
        try {
          const credentials = JSON.parse(savedLogin);
          if (credentials.username && credentials.password) handleConnect(credentials, false);
        } catch {
          localStorage.removeItem('comradcom-login');
          setLoginOpen(true);
        }
      } else {
        setLoginOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleConnect = async ({ username, password }, userInitiated = true) => {
    setStatus('Connecting...');
    setLoginStatus('Connecting to COMRADCOM…');
    isExitedRef.current = false;
    
    if (!playerRef.current) {
      playerRef.current = new PlayerService();
    }
    if (userInitiated) {
      await playerRef.current.init();
      playerRef.current.resume();
      // Prompt permissions again if user initiates login
      requestAppPermissions();
    }

    zelloRef.current = new ZelloService('comradcom', username, password);
    
    zelloRef.current.onMessage = (opusPacket) => {
      setIsReceiving(true);
      if (receivingTimeoutRef.current) clearTimeout(receivingTimeoutRef.current);
      receivingTimeoutRef.current = setTimeout(() => {
        setIsReceiving(false);
      }, 1500);

      if (playerRef.current) {
        playerRef.current.playOpusPacket(opusPacket);
      }
    };

    zelloRef.current.onStatus = (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'Authenticated') {
        setIsConnected(true);
        setOperatorName(username);
        setLoginStatus('Login successful. Opening COMRADCOM Network…');
        localStorage.setItem('comradcom-login', JSON.stringify({ username, password }));
        
        // Auto-enable live location sharing when connected
        startLocationSharing();
        requestWakeLock();
        setTimeout(() => setLoginOpen(false), 500);
      } else if (newStatus === 'Disconnected' || newStatus.includes('Error')) {
        setIsConnected(false);
        setLoginStatus(newStatus);
      } else if (newStatus.includes('Authentication failed')) {
        setIsConnected(false);
        localStorage.removeItem('comradcom-login');
        setLoginStatus(newStatus);
        setLoginOpen(true);
      } else {
        setLoginStatus(newStatus);
      }
    };
    zelloRef.current.connect();
  };

  const handleDisconnect = () => {
    stopLocationSharing();
    zelloRef.current?.disconnect();
    localStorage.removeItem('comradcom-login');
    setIsConnected(false);
    setStatus('Disconnected');
  };

  const handleExit = () => {
    isExitedRef.current = true;
    stopLocationSharing();
    releaseWakeLock();
    zelloRef.current?.disconnect();
    setIsConnected(false);
    setStatus('Exited');
    window.close();
  };

  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location is unavailable in this browser.');
      setLocationSharing(false);
      return;
    }
    if (locationWatchRef.current !== null) {
      setLocationSharing(true);
      return;
    }
    setLocationStatus('Sharing live location actively…');
    setLocationSharing(true);

    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const sent = zelloRef.current?.sendLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationSharing(true);
        setLocationStatus(`Sharing live location (±${Math.round(position.coords.accuracy)} m).`);
      },
      (error) => {
        setLocationSharing(false);
        setLocationStatus(`Location permission required: ${error.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  };

  const stopLocationSharing = () => {
    if (locationWatchRef.current !== null) navigator.geolocation?.clearWatch(locationWatchRef.current);
    locationWatchRef.current = null;
    setLocationSharing(false);
    setLocationStatus('Location sharing is off.');
  };

  const handlePttStart = async () => {
    if (!isConnected) return;
    pttRequestedRef.current = true;
    
    if (playerRef.current) {
      await playerRef.current.init();
      playerRef.current.resume();
    }

    try {
      setPttStatus('Opening radio channel…');
      await zelloRef.current.startStream('146.020 Mhz');
      if (!pttRequestedRef.current) {
        zelloRef.current.stopStream();
        return;
      }
      await audioRef.current.startRecording();
      if (!pttRequestedRef.current) {
        audioRef.current.stopRecording();
        zelloRef.current.stopStream();
        return;
      }
      setIsRecording(true);
      setPttStatus('Transmitting live');
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      setPttStatus(`PTT unavailable: ${err.message || 'check microphone permission and channel access.'}`);
      zelloRef.current?.stopStream();
    }
  };

  const handlePttStop = () => {
    pttRequestedRef.current = false;
    if (!isRecording) return;
    setIsRecording(false);
    setPttStatus('');
    audioRef.current.stopRecording();
    zelloRef.current.stopStream();
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Talk':
        return (
          <HomeScreen 
            isConnected={isConnected} 
            isTransmitting={isRecording} 
            isReceiving={isReceiving} 
            onPttStart={handlePttStart} 
            onPttStop={handlePttStop} 
            pttStatus={pttStatus}
          />
        );
      case 'Dashboard':
        return <DashboardScreen />;
      case 'Members':
        return <UsersScreen />;
      case 'Alerts':
        return <AlertsScreen />;
      case 'Feed':
        return <FeedScreen />;
      case 'Radar':
        return <MonitoringScreen />;
      case 'Profile':
        return (
          <ProfileScreen 
            isConnected={isConnected} 
            onDisconnect={handleDisconnect} 
            onConnect={() => setLoginOpen(true)} 
            locationSharing={locationSharing}
            locationStatus={locationStatus}
            onStartLocationSharing={startLocationSharing}
            onStopLocationSharing={stopLocationSharing}
            operatorName={operatorName}
          />
        );
      default:
        return (
          <HomeScreen 
            isConnected={isConnected} 
            isTransmitting={isRecording} 
            isReceiving={isReceiving} 
            onPttStart={handlePttStart} 
            onPttStop={handlePttStop} 
            pttStatus={pttStatus}
          />
        );
    }
  };

  return (
    <MasterLayout 
      currentScreen={currentScreen} 
      setCurrentScreen={setCurrentScreen}
      isConnected={isConnected}
      onLoginClick={() => setLoginOpen(true)}
      onDisconnect={handleDisconnect}
      onExit={handleExit}
      loginOpen={loginOpen}
      onLoginClose={() => { if (isConnected) { setLoginOpen(false); setLoginStatus(''); } }}
      onLoginSubmit={handleConnect}
      loginStatus={loginStatus}
    >
      {renderScreen()}
    </MasterLayout>
  );
}

export default App;
