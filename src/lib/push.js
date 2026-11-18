// Browser side of push reminders: permission + subscription for this device.
import { VAPID_PUBLIC_KEY } from './reminders'
import { savePushSubscription, deletePushSubscription } from './db'

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// The service worker only exists in the built app (GitHub Pages / `npm run preview`), not `npm run dev`.
async function registration() {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) throw new Error('Notifications need the installed app (no service worker on the dev server).')
  return navigator.serviceWorker.ready
}

function deviceLabel() {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad/i.test(ua)) return 'iOS'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac/i.test(ua)) return 'Mac'
  return 'Browser'
}

function keyToBytes(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export async function getPushSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support push notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted. Enable it in Android settings → Apps → Health.')
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) })
  await savePushSubscription(sub.toJSON(), deviceLabel())
  return sub
}

export async function disablePush() {
  const sub = await getPushSubscription()
  if (!sub) return
  await deletePushSubscription(sub.endpoint)
  await sub.unsubscribe()
}

// Keep the stored subscription fresh (endpoints can rotate).
export async function refreshPushSubscription() {
  const sub = await getPushSubscription()
  if (sub && Notification.permission === 'granted') await savePushSubscription(sub.toJSON(), deviceLabel())
  return sub
}

// Local notification through the service worker — checks permission + display without the server.
export async function showLocalTest() {
  const reg = await registration()
  await reg.showNotification('🔔 Notifications are on', {
    body: 'Reminders will look like this.',
    icon: reg.scope + 'icon-192.png',
    tag: 'local-test',
  })
}
