/**
 * COMRADCOM Background Keep-Alive Service
 *
 * Strategy stack (all combined for maximum Android/iOS compatibility):
 *  1. Silent audio loop  – a sub-audible tone plays continuously through an
 *     AudioContext so Android treats the app like an active audio app and never
 *     suspends its service worker or JavaScript runtime.
 *  2. Media Session API  – registers a "COMRADCOM Radio" media session so the OS
 *     lock screen shows the app, keeping the audio focus and preventing GC.
 *  3. Page Visibility API – re-acquires the audio context and wake lock every
 *     time the app is brought back to the foreground.
 *  4. App State Persistence – continuously serialises app state to localStorage
 *     so if the OS does force-kill the app, re-opening restores exactly where
 *     the user left off.
 */

// ─────────────────────────────────────────────────────
// 1. SILENT AUDIO LOOP
// ─────────────────────────────────────────────────────

let _silentCtx = null;
let _silentSource = null;
let _silentGain = null;
let _silentRunning = false;

/**
 * Starts a silent (volume ~0.001) oscillator loop through Web Audio API.
 * This tricks Android into keeping our JS runtime alive as an "audio app".
 * Must be called from a user-gesture context (tap/click) the first time.
 */
export async function startSilentAudio() {
  if (_silentRunning) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    _silentCtx = new AudioCtx();

    // Resume immediately in case the context started suspended
    if (_silentCtx.state === 'suspended') {
      await _silentCtx.resume();
    }

    // Oscillator at 18 kHz (above most human hearing) at near-zero gain
    const osc = _silentCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(18000, _silentCtx.currentTime);

    _silentGain = _silentCtx.createGain();
    _silentGain.gain.setValueAtTime(0.001, _silentCtx.currentTime); // practically inaudible

    osc.connect(_silentGain);
    _silentGain.connect(_silentCtx.destination);
    osc.start();

    _silentSource = osc;
    _silentRunning = true;

    console.info('[KeepAlive] Silent audio loop started.');
  } catch (err) {
    console.warn('[KeepAlive] Silent audio init failed:', err.message);
  }
}

/** Call when the user explicitly exits / logs out. */
export function stopSilentAudio() {
  _silentRunning = false;
  try { _silentSource?.stop(); } catch (_) {}
  try { _silentCtx?.close(); } catch (_) {}
  _silentSource = null;
  _silentGain = null;
  _silentCtx = null;
}

/** Re-resume the context if Android suspended it (call on visibilitychange). */
export async function resumeSilentAudio() {
  if (!_silentRunning) return;
  try {
    if (_silentCtx && _silentCtx.state === 'suspended') {
      await _silentCtx.resume();
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────
// 2. MEDIA SESSION API
// ─────────────────────────────────────────────────────

/**
 * Registers a "COMRADCOM Radio" media session.
 * This makes Android / iOS show the app on the lock screen and prevents the
 * system from treating it as idle.
 *
 * @param {object} opts
 * @param {() => void} [opts.onPlay]
 * @param {() => void} [opts.onPause]
 */
export function registerMediaSession({ onPlay, onPause } = {}) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'COMRADCOM Radio',
    artist: 'COMRADCOM Network Philippines',
    album: '146.020 MHz - Field Operations',
    artwork: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
    ]
  });

  navigator.mediaSession.playbackState = 'playing';

  navigator.mediaSession.setActionHandler('play', () => {
    navigator.mediaSession.playbackState = 'playing';
    resumeSilentAudio();
    onPlay?.();
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    // Keep playback state "playing" – we don't actually want to pause
    navigator.mediaSession.playbackState = 'playing';
    onPause?.();
  });

  // Nullify stop/skip so they can't kill the session
  try { navigator.mediaSession.setActionHandler('stop', null); } catch (_) {}
  try { navigator.mediaSession.setActionHandler('nexttrack', null); } catch (_) {}
  try { navigator.mediaSession.setActionHandler('previoustrack', null); } catch (_) {}

  console.info('[KeepAlive] Media session registered.');
}

// ─────────────────────────────────────────────────────
// 3. APP STATE PERSISTENCE
// ─────────────────────────────────────────────────────

const STATE_KEY = 'comradcom-app-state';

/**
 * Persist critical app state to localStorage.
 * Call this whenever state changes in App.jsx.
 *
 * @param {{ currentScreen: string, operatorName: string, isConnected: boolean, locationSharing: boolean }} state
 */
export function persistAppState(state) {
  try {
    const snapshot = {
      currentScreen: state.currentScreen,
      operatorName: state.operatorName,
      isConnected: state.isConnected,
      locationSharing: state.locationSharing,
      savedAt: Date.now()
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
  } catch (_) {}
}

/**
 * Restore previously persisted state.
 * Returns null if nothing is stored or the snapshot is stale (>24 h).
 *
 * @returns {{ currentScreen: string, operatorName: string, locationSharing: boolean } | null}
 */
export function restoreAppState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    // Ignore snapshots older than 24 hours
    if (Date.now() - snap.savedAt > 86400000) {
      localStorage.removeItem(STATE_KEY);
      return null;
    }
    return snap;
  } catch (_) {
    return null;
  }
}

/** Wipe persisted state (call on explicit logout / exit). */
export function clearPersistedState() {
  localStorage.removeItem(STATE_KEY);
}

// ─────────────────────────────────────────────────────
// 4. BACKGROUND SYNC HELPER (app to SW bridge)
// ─────────────────────────────────────────────────────

/**
 * Request a one-shot Background Sync from the service worker.
 * The SW will fire the 'sync' event (possibly after the app is closed)
 * when connectivity is available.
 *
 * @param {string} tag - sync tag registered in sw.js
 */
export async function requestBackgroundSync(tag = 'comradcom-sync') {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.sync) {
      await reg.sync.register(tag);
      console.info('[KeepAlive] Background sync registered:', tag);
    }
  } catch (err) {
    console.warn('[KeepAlive] Background sync unavailable:', err.message);
  }
}

// ─────────────────────────────────────────────────────
// 5. CONVENIENCE: start everything at once
// ─────────────────────────────────────────────────────

/**
 * Call this once from a user-gesture handler (e.g. login button tap).
 * Starts the silent audio loop and registers the Media Session.
 *
 * @param {{ onPlay?: () => void, onPause?: () => void }} opts
 */
export async function activateKeepAlive({ onPlay, onPause } = {}) {
  await startSilentAudio();
  registerMediaSession({ onPlay, onPause });
}
