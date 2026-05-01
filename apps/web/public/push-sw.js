self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'HotelOS', body: event.data.text() };
  }

  const title = payload.title || 'HotelOS';
  const options = {
    body: payload.body || '',
    icon: '/apple-icon.svg',
    badge: '/apple-icon.svg',
    data: {
      href: payload.href || '/notifications',
    },
    tag: payload.event || 'hotel-os-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => 'focus' in client);
      if (matchingClient) {
        matchingClient.navigate(href);
        return matchingClient.focus();
      }
      return self.clients.openWindow(href);
    }),
  );
});
