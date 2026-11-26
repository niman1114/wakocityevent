// Web Push service worker for 和光市のイベント情報
self.addEventListener('push', (event) => {
    let data = { title: '和光市のイベント情報', body: '新しいイベントが追加されました', url: '/' };
    try {
        if (event.data) data = { ...data, ...event.data.json() };
    } catch (e) {
        // keep defaults
    }
    const options = {
        body: data.body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        data: { url: data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});
