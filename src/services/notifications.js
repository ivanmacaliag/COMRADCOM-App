const STORAGE_KEY = 'comradcom-notifications-history';

export const getStoredNotifications = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse notifications:', e);
  }
  return [
    {
      id: 'init-notif-1',
      title: 'COMRADCOM Emergency Network Active',
      body: 'Welcome to COMRADCOM Network Philippines. Radio channel 146.020 Mhz is connected.',
      timestamp: new Date().toISOString(),
      read: false,
      category: 'announcement'
    },
    {
      id: 'init-notif-2',
      title: '🌀 DOST-PAGASA Weather Monitoring Active',
      body: 'Live weather telemetry and severe storm advisory tracking enabled.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false,
      category: 'warning'
    }
  ];
};

export const saveNotification = (notification) => {
  try {
    const current = getStoredNotifications();
    const newNotif = {
      id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: notification.title || 'Notification',
      body: notification.body || '',
      category: notification.category || 'alert',
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
      ...notification
    };
    const updated = [newNotif, ...current.filter(n => n.id !== newNotif.id)].slice(0, 60);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('comradcom-notification-updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Failed to save notification:', e);
    return [];
  }
};

export const markNotificationAsRead = (id) => {
  try {
    const current = getStoredNotifications();
    const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('comradcom-notification-updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Failed to mark notification as read:', e);
    return [];
  }
};

export const markAllNotificationsAsRead = () => {
  try {
    const current = getStoredNotifications();
    const updated = current.map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('comradcom-notification-updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Failed to mark all as read:', e);
    return [];
  }
};

export const clearAllNotifications = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('comradcom-notification-updated', { detail: [] }));
    return [];
  } catch (e) {
    console.error('Failed to clear notifications:', e);
    return [];
  }
};
