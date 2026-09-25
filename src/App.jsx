import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  activateKeepAlive,
  resumeSilentAudio,
  stopSilentAudio,
  persistAppState,
  restoreAppState,
  clearPersistedState
} from './services/backgroundKeepAlive';
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
  const [exitToast, setExitToast] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');
  const [operatorName, setOperatorName] = useState('Operator');
  const [locationSharing, setLocationSharing] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Location sharing is active.');
  const [zelloUsers, setZelloUsers] = useState([]);
  
  const zelloRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const locationWatchRef = useRef(null);
  const pttRequestedRef = useRef(false);
  const receivingTimeoutRef = useRef(null);
  const wakeLockRef = useRef(null);
  const isExitedRef = useRef(false);
  const screenStackRef = useRef(['Talk']);
  const backPressCountRef = useRef(0);
  const backPressTimerRef = useRef(null);
  const exitToastTimerRef = useRef(null);

  // ── Back Button Trap ─────────────────────────────────────────────────────────
  // Prevents the OS from closing the PWA on back press.
  // • While navigating between screens: goes back to the previous screen.
  // • While on the root screen: requires TWO back presses within 2 s to exit;
  //   shows a toast after the first press.
  useEffect(() => {
    // Always keep at least one extra history entry ahead so the PWA has
    // something to pop before the browser navigates away.
    window.history.replaceState({ screen: currentScreen, comradcom: true }, '');
    window.history.pushState({ screen: currentScreen, comradcom: true }, '');

    const handlePopState = () => {
      // Allow exit only when the user clicked the in-app Exit button
      if (isExitedRef.current) return;

      // Immediately re-push so we can never accidentally leave the PWA
      window.history.pushState({ screen: currentScreen, comradcom: true }, '');

      if (screenStackRef.current.length > 1) {
        // Navigate back within the app
        screenStackRef.current.pop();
        const prevScreen = screenStackRef.current[screenStackRef.current.length - 1] || 'Talk';
        setCurrentScreen(prevScreen);
        backPressCountRef.current = 0;
      } else {
        // Already at root – double-press to exit
        backPressCountRef.current += 1;

        if (backPressCountRef.current === 1) {
          // First press: show toast
          setExitToast(true);
          clearTimeout(exitToastTimerRef.current);
          exitToastTimerRef.current = setTimeout(() => {
            setExitToast(false);
            backPressCountRef.current = 0;
          }, 2500);
        } else {
          // Second press within 2.5 s: allow real exit
          clearTimeout(exitToastTimerRef.current);
          setExitToast(false);
          isExitedRef.current = true;
          window.history.go(-2); // pop the two synthetic entries we pushed
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentScreen]);

  const navigateToScreen = (newScreen) => {
    if (newScreen !== currentScreen) {
      screenStackRef.current.push(newScreen);
      setCurrentScreen(newScreen);
      // Persist the new screen so reopening restores to this screen
      persistAppState({ currentScreen: newScreen, operatorName, isConnected, locationSharing });
    }
  };



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

      // 2. Location access prompt (without sending to chat on boot/refresh)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocationStatus(`Location tracking active (±${Math.round(pos.coords.accuracy)} m).`);
          },
          (geoErr) => { console.warn('Location permission deferred:', geoErr); },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      // 3. Notifications: User taps 'Enable Alerts' in Dashboard to trigger native mobile prompt
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
    audioRef.current.onAudioData = (buffer) => zelloRef.current?.sendAudioChunk(buffer);

    // Prompt for all permissions on boot
    requestAppPermissions();
    requestWakeLock();

    // Restore last screen from persisted state
    const savedState = restoreAppState();
    if (savedState?.currentScreen && savedState.currentScreen !== 'Talk') {
      setCurrentScreen(savedState.currentScreen);
      screenStackRef.current = ['Talk', savedState.currentScreen];
    }

    // Re-acquire WakeLock, resume silent audio & re-sync location when app comes back to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isExitedRef.current) {
        requestWakeLock();
        resumeSilentAudio();
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
      clearTimeout(exitToastTimerRef.current);
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
    
    if (!playerRef.current) playerRef.current = new PlayerService();
    if (userInitiated) {
      await playerRef.current.init();
      playerRef.current.resume();
      // Prompt permissions again if user initiates login
      requestAppPermissions();
      // Start silent audio loop + Media Session from this user gesture
      activateKeepAlive();
    }

    zelloRef.current = new ZelloService('comradcom', username, password);
    zelloRef.current.onUsersUpdate = (users) => {
      setZelloUsers(users);
    };
    zelloRef.current.onUsersCountUpdate = (count) => {
      if (typeof count === 'number') {
        setZelloUsers((prev) => prev.length ? prev : Array.from({ length: count }, (_, i) => ({ username: `Operator ${i + 1}` })));
      }
    };
    zelloRef.current.onMessage = (opusPacket) => {
      setIsReceiving((prev) => {
        if (!prev) playerRef.current?.reset();
        return true;
      });
      if (receivingTimeoutRef.current) clearTimeout(receivingTimeoutRef.current);
      receivingTimeoutRef.current = setTimeout(() => setIsReceiving(false), 1500);
      playerRef.current?.playOpusPacket(opusPacket);
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
        // Persist connected state so re-opening restores context
        persistAppState({ currentScreen, operatorName: username, isConnected: true, locationSharing: true });
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
    pttRequestedRef.current = false;
    audioRef.current?.stopRecording();
    stopLocationSharing();
    zelloRef.current?.disconnect();
    localStorage.removeItem('comradcom-login');
    setIsConnected(false);
    setStatus('Disconnected');
    setPttStatus('');
    setLoginStatus('');
    setLoginOpen(true);
  };

  const handleExit = () => {
    isExitedRef.current = true;
    stopLocationSharing();
    releaseWakeLock();
    stopSilentAudio();
    clearPersistedState();
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
        setLocationSharing(true);
        setLocationStatus(`Live location tracking active (±${Math.round(position.coords.accuracy)} m).`);
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
    setIsRecording(false);
    setPttStatus('');
    audioRef.current?.stopRecording();
    zelloRef.current?.stopStream();
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
            zelloUsers={zelloUsers}
            operatorName={operatorName}
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
            zelloUsers={zelloUsers}
            operatorName={operatorName}
          />
        );
    }
  };

  return (
    <>
      <MasterLayout 
        currentScreen={currentScreen} 
        setCurrentScreen={navigateToScreen}
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

      {/* Back-to-exit toast */}
      {exitToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.82)',
            color: '#fff',
            padding: '10px 22px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            zIndex: 99999,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            animation: 'comradcomFadeIn 0.2s ease'
          }}
        >
          📻 Press back again to exit COMRADCOM
        </div>
      )}
    </>
  );
}

export default App;
