// Push + notification-click handlers, pulled into the Workbox service worker via
// `workbox.importScripts` in vite.config.js. Payload: { title, body, url, tag }.

self.addEventListener('push', event => {
  let data
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  const scope = self.registration.scope
  event.waitUntil(self.registration.showNotification(data.title || 'Health Tracker', {
    body: data.body || '',
    tag: data.tag,
    renotify: !!data.tag,
    icon: scope + 'icon-192.png',
    badge: scope + 'icon-192.png',
    data: { url: new URL(data.url || './', scope).href },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || self.registration.scope
  const sheet = new URL(url).searchParams.get('open')
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const win = wins.find(w => w.url.startsWith(self.registration.scope))
    if (win) {
      await win.focus()
      if (sheet) win.postMessage({ type: 'open-sheet', sheet })
      return
    }
    await self.clients.openWindow(url)
  })())
})
