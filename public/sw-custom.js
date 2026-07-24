// Sarvam Planner service worker — push delivery only (no offline shell).
// Handles `push` (show a notification when the tab is closed/hidden) and
// `notificationclick` (focus an existing tab or open /check-in).
/* eslint-disable no-restricted-globals */

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.resolve());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Sarvam", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Sarvam Planner";
  const options = {
    body: payload.body || "One nudge. Show up.",
    data: { url: payload.url || "/check-in" },
    tag: "sarvam-daily",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/check-in";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (client.navigate) client.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
