// COMRADCOM Custom Service Worker
// Built with vite-plugin-pwa injectManifest strategy
// Handles: Precaching, Push Notifications, Periodic Background Sync, Notification Clicks

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { skipWaiting, clientsClaim } from 'workbox-core';

// Always activate this worker immediately
skipWaiting();
clientsClaim();

// Precache all static assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Serve the app shell (index.html) for navigation requests (SPA routing)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'))
);

// ───────────────────────────────────────────────────
// PUSH NOTIFICATION HANDLER (Web Push API)
// ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'COMRADCOM Alert', body: 'New alert received.' };

  try {
    if (event.data) data = event.data.json();
  } catch {
    data.body = event.data ? event.data.text() : 'New alert received.';
  }

  const title = data.title || 'COMRADCOM Network Philippines';
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/badge.png',
    tag: data.tag || `comradcom-push-${Date.now()}`,
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    data: { url: data.url || '/', timestamp: new Date().toISOString() },
    actions: [
      { action: 'open', title: '📡 Open COMRADCOM' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ───────────────────────────────────────────────────
// PERIODIC BACKGROUND SYNC — weather & earthquake checks
// Fires even when the app is closed (Android Chrome + Edge with PWA)
// ───────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'comradcom-background-check') {
    event.waitUntil(runBackgroundCheck());
  }
});

async function runBackgroundCheck() {
  try {
    // ---- Weather Check (Open-Meteo API, default: Iligan City) ----
    const lat = 8.2280, lon = 124.2452;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FManila`;
    const wResp = await fetch(weatherUrl, { cache: 'no-store' });

    if (wResp.ok) {
      const wData = await wResp.json();
      const code = wData?.current?.weather_code;
      const windSpeed = wData?.current?.wind_speed_10m;
      const temp = wData?.current?.temperature_2m;
      const isStorm = code >= 95;
      const isHeavyRain = code >= 63 && code <= 67;
      const isHighWind = windSpeed >= 40;

      if (isStorm || isHeavyRain || isHighWind) {
        let body = '';
        if (isStorm) body = `⛈️ Thunderstorm conditions active. Wind: ${windSpeed} km/h, Temp: ${temp}°C`;
        else if (isHeavyRain) body = `🌧️ Heavy rain advisory. Wind: ${windSpeed} km/h, Temp: ${temp}°C`;
        else body = `💨 High wind advisory: ${windSpeed} km/h. Stay vigilant.`;

        await self.registration.showNotification('⚠️ COMRADCOM Weather Alert', {
          body,
          icon: '/pwa-192x192.png',
          badge: '/badge.png',
          tag: 'comradcom-weather-bg',
          renotify: true,
          data: { url: '/' }
        });
      }
    }

    // ---- Seismic Check (USGS, last 1 hour, M5.5+, Philippines region) ----
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const eqUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=5.5&minlatitude=4&maxlatitude=22&minlongitude=114&maxlongitude=128&starttime=${oneHourAgo}&limit=3`;
    const eqResp = await fetch(eqUrl, { cache: 'no-store' });

    if (eqResp.ok) {
      const eqData = await eqResp.json();
      const events = eqData?.features || [];
      if (events.length > 0) {
        const eq = events[0].properties;
        const mag = eq.mag;
        const place = eq.place || 'near Philippines';
        await self.registration.showNotification('🚨 COMRADCOM Seismic Alert', {
          body: `M${mag.toFixed(1)} earthquake detected ${place}. Activate emergency protocol if needed.`,
          icon: '/pwa-192x192.png',
          badge: '/badge.png',
          tag: 'comradcom-eq-bg',
          renotify: true,
          requireInteraction: mag >= 6.5,
          data: { url: '/' }
        });
      }
    }
  } catch (err) {
    console.error('[COMRADCOM SW] Background check error:', err);
  }
}

// ───────────────────────────────────────────────────
// NOTIFICATION CLICK — focus existing window or open new
// ───────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ───────────────────────────────────────────────────
// MESSAGE HANDLER — app→SW communication bridge
// ───────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Manually trigger a background check (called from app)
  if (event.data?.type === 'TRIGGER_BACKGROUND_CHECK') {
    runBackgroundCheck();
  }

  // Show a notification from the app (used when SW showNotification is needed on mobile)
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, requireInteraction } = event.data;
    self.registration.showNotification(title || 'COMRADCOM Alert', {
      body: body || '',
      icon: '/pwa-192x192.png',
      badge: '/badge.png',
      tag: tag || `comradcom-msg-${Date.now()}`,
      renotify: true,
      requireInteraction: !!requireInteraction,
      data: { url: '/' }
    });
  }
});
