// ── WELLNESS TRACKER SERVICE WORKER ──────────────────
// v1.1.0 — handles local notification scheduling
// Update this file only when notification logic changes.
// All UI/feature changes belong in index.html.

const SW_VERSION = '1.1.0';

// ── INSTALL & ACTIVATE ────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── MESSAGE HANDLER ───────────────────────────────────
// Receives scheduling commands from the main app
self.addEventListener('message', e => {
  const { type, payload } = e.data || {};
  switch (type) {
    case 'SCHEDULE_PATCH':    schedulePatch(payload);   break;
    case 'SCHEDULE_DAILY':    scheduleDaily(payload);   break;
    case 'SCHEDULE_WEEKLY':   scheduleWeekly(payload);  break;
    case 'CANCEL_PATCH':      cancelAlarm('patch');     break;
    case 'CANCEL_DAILY':      cancelAlarm('daily');     break;
    case 'CANCEL_WEEKLY':     cancelAlarm('weekly');    break;
  }
});

// ── NOTIFICATION CLICK ────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});

// ── ALARM STORAGE ─────────────────────────────────────
// Uses IndexedDB-lite via a simple in-memory map +
// setTimeout approach (reliable while SW is alive)
const alarms = {};

function cancelAlarm(key) {
  if (alarms[key]) {
    clearTimeout(alarms[key]);
    delete alarms[key];
  }
}

// ── PATCH REMINDER ────────────────────────────────────
function schedulePatch({ hour, minute, dueDate }) {
  cancelAlarm('patch');
  const now = new Date();
  const fire = new Date(dueDate);
  fire.setHours(hour, minute, 0, 0);
  const delay = fire - now;
  if (delay <= 0) return;
  alarms['patch'] = setTimeout(() => {
    self.registration.showNotification('Wellness Tracker 🌸', {
      body: 'Time to change your patch today.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'patch',
    });
  }, delay);
}

// ── DAILY REMINDER ────────────────────────────────────
function scheduleDaily({ hour, minute }) {
  cancelAlarm('daily');
  const now = new Date();
  const fire = new Date();
  fire.setHours(hour, minute, 0, 0);
  if (fire <= now) fire.setDate(fire.getDate() + 1);
  const delay = fire - now;
  alarms['daily'] = setTimeout(() => {
    self.registration.showNotification('Wellness Tracker 🌸', {
      body: "Don't forget your daily check-in.",
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily',
    });
    // Reschedule for tomorrow
    scheduleDaily({ hour, minute });
  }, delay);
}

// ── WEEKLY SUMMARY ────────────────────────────────────
function scheduleWeekly({ hour, minute }) {
  cancelAlarm('weekly');
  const now = new Date();
  const fire = new Date();
  const daysUntilSunday = (7 - fire.getDay()) % 7 || 7;
  fire.setDate(fire.getDate() + daysUntilSunday);
  fire.setHours(hour, minute, 0, 0);
  if (fire <= now) fire.setDate(fire.getDate() + 7);
  const delay = fire - now;
  alarms['weekly'] = setTimeout(() => {
    self.registration.showNotification('Wellness Tracker 🌸', {
      body: 'Your weekly summary is ready — tap to take a look.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'weekly',
    });
    // Reschedule for next Sunday
    scheduleWeekly({ hour, minute });
  }, delay);
}
