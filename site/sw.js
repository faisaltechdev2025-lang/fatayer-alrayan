/* sw.js — يسمح بتثبيت الموقع كتطبيق ويعرض آخر نسخة محفوظة عند انقطاع الإنترنت.
   لتغيير النسخة المخزنة بعد أي تحديث كبير غيّر رقم VERSION. */
const VERSION = 'alrayyan-v1';
const CORE = ['./', 'index.html', 'tracking.js', 'manifest.json', 'icons/icon-192.png'];

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
    var r = e.request;
    if (r.method !== 'GET') return;
    var u = new URL(r.url);
    if (u.origin !== location.origin) return;                       // لا نتدخل في جوجل/الخرائط/بوابة الدفع
    if (u.searchParams.has('status') && u.searchParams.has('id')) return;   // عودة الدفع الإلكتروني
    // الصفحة والسكربتات: الشبكة أولاً (لتظهر التحديثات فوراً) ثم النسخة المحفوظة
    if (r.mode === 'navigate' || /\.(html|js|json)$/.test(u.pathname)) {
        e.respondWith(fetch(r).then(function (res) {
            if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(r, copy); }); }
            return res;
        }).catch(function () {
            return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); });
        }));
        return;
    }
    // الصور وباقي الملفات: المحفوظ أولاً مع تحديثه بالخلفية
    e.respondWith(caches.match(r).then(function (m) {
        var net = fetch(r).then(function (res) {
            if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(r, copy); }); }
            return res;
        }).catch(function () { return m; });
        return m || net;
    }));
});
