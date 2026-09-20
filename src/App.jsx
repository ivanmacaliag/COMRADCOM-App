import React, { useState, useEffect, useRef } from 'react';
import { ZelloService } from './services/zello';
import { AudioService } from './services/audio';
import { PlayerService } from './services/player';
import { MasterLayout } from './components/MasterLayout';
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
  const [pttStatus, setPttStatus] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');
  const [operatorName, setOperatorName] = useState('Operator');
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Location sharing is off.');
  
  const zelloRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const locationWatchRef = useRef(null);
  const pttRequestedRef = useRef(false);

  useEffect(() => {
    audioRef.current = new AudioService();
    playerRef.current = new PlayerService();

    audioRef.current.onAudioData = (buffer) => {
      // Do not read React state here: this callback is installed once and would
      // otherwise retain the initial `isConnected === false` value forever.
      zelloRef.current?.sendAudioChunk(buffer);
    };

    return () => {
      if (zelloRef.current) zelloRef.current.disconnect();
      if (audioRef.current) audioRef.current.stopRecording();
      if (locationWatchRef.current !== null) navigator.geolocation?.clearWatch(locationWatchRef.current);
    };
  }, []);

  useEffect(() => {
    // Deferring one tick avoids React development Strict Mode opening a socket
    // that its verification cleanup immediately closes.
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
    
    // Initialize player on user interaction
    if (!playerRef.current) {
      playerRef.current = new PlayerService();
    }
    if (userInitiated) {
      await playerRef.current.init();
      playerRef.current.resume();
    }

    // The COMRADCOM network is fixed; credentials are supplied by the operator.
    zelloRef.current = new ZelloService('comradcom', username, password);
    
    zelloRef.current.onMessage = (opusPacket) => {
      if (playerRef.current) {
        playerRef.current.playOpusPacket(opusPacket);
      }
    };

    zelloRef.current.onStatus = (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'Authenticated') {
        setIsConnected(true);
        setOperatorName(username);
        setLoginStatus('Login successful. Opening your dashboard…');
        localStorage.setItem('comradcom-login', JSON.stringify({ username, password }));
        startLocationSharing();
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
    stopLocationSharing();
    zelloRef.current?.disconnect();
    setIsConnected(false);
    setStatus('Exited');
    // Installed PWAs and ordinary browser tabs may refuse this request; the session
    // is still disconnected so no location or voice activity continues.
    window.close();
  };

  const startLocationSharing = () => {
    if (!isConnected || !navigator.geolocation) {
      setLocationStatus('Location is unavailable in this browser.');
      return;
    }
    if (locationWatchRef.current !== null) return;
    setLocationStatus('Requesting location permission…');
    setLocationSharing(true);
    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const sent = zelloRef.current?.sendLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationSharing(Boolean(sent));
        setLocationStatus(sent ? `Sharing live location (±${Math.round(position.coords.accuracy)} m).` : 'Waiting for the Zello connection.');
      },
      (error) => {
        setLocationSharing(false);
        setLocationStatus(`Location permission/error: ${error.message}`);
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
    
    // Ensure player is initialized/resumed on user interaction
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
            isReceiving={false} 
            onPttStart={handlePttStart} 
            onPttStop={handlePttStop} 
            pttStatus={pttStatus}
          />
        );
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
        return null;
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
