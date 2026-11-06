// Service worker for the dashboard app (scope /admin/): shows new-order
// notifications and opens the order when one is tapped.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "CUSTOM ME", {
      body: data.body || "",
      icon: "/dashboard-icon-192.png",
      badge: "/dashboard-badge.png",
      tag: data.tag,
      data: { url: data.url || "/admin/orders" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin/orders", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const app = open.find((c) => new URL(c.url).pathname.startsWith("/admin"));
      if (app) {
        await app.focus();
        return app.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
