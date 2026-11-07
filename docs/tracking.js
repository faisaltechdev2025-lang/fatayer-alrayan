/* =====================================================================
   tracking.js — أدوات التتبع (Google Analytics 4 / TikTok Pixel / Snapchat Pixel)
   - كل المعرّفات في الأعلى فقط. اترك المعرّف فارغاً لتعطيل الأداة (لا يُحمَّل شيء).
   - لا تُحمَّل سكربتات المنصات إلا بعد اكتمال الصفحة ثم عند الخمول أو أول تفاعل،
     فلا تؤثر على سرعة العرض الأول.
   - لا تُرسَل بيانات شخصية (اسم، رقم، عنوان، موقع) إلى أي منصة؛ فقط الأصناف والقيمة.
   ===================================================================== */
(function () {
    'use strict';

    var CFG = {
        ga4:    'G-NWEXNZYJM6',      // معرّف قياس GA4، مثال: G-XXXXXXXXXX
        tiktok: '',      // معرّف TikTok Pixel
        snap:   '',      // معرّف Snapchat Pixel
        currency: 'SAR',
        requireConsent: false,   // true = يظهر شريط موافقة، ولا يُحمَّل أي تتبع قبل الموافقة
        idleDelay: 2500          // أقصى انتظار (ملي ثانية) بعد اكتمال الصفحة قبل التحميل
    };

    // ربط أحداث الموقع بالأحداث القياسية لكل منصة (null = غير مدعوم في تلك المنصة)
    var MAP = {
        add_to_cart:    { ga: 'add_to_cart',    tt: 'AddToCart',        sc: 'ADD_CART' },
        begin_checkout: { ga: 'begin_checkout', tt: 'InitiateCheckout', sc: 'START_CHECKOUT' },
        order_placed:   { ga: 'generate_lead',  tt: 'PlaceAnOrder',     sc: 'PURCHASE' },   // طلب أُرسل لواتساب (كاش)
        order_paid:     { ga: 'purchase',       tt: 'CompletePayment',  sc: 'PURCHASE' },   // دفع إلكتروني مؤكد
        contact:        { ga: 'contact',        tt: 'Contact',          sc: null },
        select_branch:  { ga: 'select_branch',  tt: null,               sc: null },
        social_click:   { ga: 'social_click',   tt: null,               sc: null }
    };

    var enabled = !!(CFG.ga4 || CFG.tiktok || CFG.snap);
    var queue = (window.__tq || []).map(function (a) { return [].slice.call(a); });
    window.__tq = [];
    var loaded = false, consent = !CFG.requireConsent;

    if (!enabled) { window.track = function () {}; return; }

    /* ---------- تحميل المنصات ---------- */
    function initGA() {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        gtag('js', new Date()); gtag('config', CFG.ga4);
        var s = document.createElement('script'); s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.ga4);
        document.head.appendChild(s);
    }
    function initTikTok() {
        !function (w, d, t) {
            w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
            ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
            ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
            for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
            ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
            ttq.load = function (e, n) {
                var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
                ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {};
                var s = d.createElement("script"); s.type = "text/javascript"; s.async = !0; s.src = r + "?sdkid=" + e + "&lib=" + t;
                var f = d.getElementsByTagName("script")[0]; f.parentNode.insertBefore(s, f);
            };
            ttq.load(CFG.tiktok); ttq.page();
        }(window, document, 'ttq');
    }
    function initSnap() {
        (function (e, t, n) {
            if (e.snaptr) return;
            var a = e.snaptr = function () { a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments); };
            a.queue = [];
            var s = t.createElement('script'); s.async = !0; s.src = n;
            var u = t.getElementsByTagName('script')[0]; u.parentNode.insertBefore(s, u);
        })(window, document, 'https://sc-static.net/scevent.min.js');
        snaptr('init', CFG.snap); snaptr('track', 'PAGE_VIEW');
    }

    /* ---------- إرسال الأحداث ---------- */
    function clean(o) { Object.keys(o).forEach(function (k) { if (o[k] === undefined || o[k] === null) delete o[k]; }); return o; }
    function send(a) {
        var name = a[0], p = a[1] || {}, m = MAP[name]; if (!m) return;
        var items = p.items || [], cur = CFG.currency;
        if (CFG.ga4 && m.ga) gtag('event', m.ga, clean({ value: p.value, currency: cur, items: items, method: p.method, branch: p.branch, transaction_id: p.id }));
        if (CFG.tiktok && m.tt && window.ttq) ttq.track(m.tt, clean({
            value: p.value, currency: cur, content_type: 'product',
            contents: items.map(function (i) { return { content_id: i.item_name, content_name: i.item_name, quantity: i.quantity, price: i.price }; })
        }));
        if (CFG.snap && m.sc && window.snaptr) snaptr('track', m.sc, clean({
            price: p.value, currency: cur, transaction_id: p.id,
            item_ids: items.map(function (i) { return i.item_name; }),
            number_items: items.reduce(function (t, i) { return t + (i.quantity || 1); }, 0)
        }));
    }
    function loadAll() {
        if (loaded || !consent) return; loaded = true;
        if (CFG.ga4) initGA(); if (CFG.tiktok) initTikTok(); if (CFG.snap) initSnap();
        queue.splice(0).forEach(send);
    }
    window.track = function (name, params) {
        var a = [name, params];
        if (loaded) send(a); else queue.push(a);
    };

    /* ---------- موعد التحميل: بعد اكتمال الصفحة (خمول) أو أول تفاعل ---------- */
    var evs = ['pointerdown', 'scroll', 'keydown', 'touchstart'];
    function onFirst() { evs.forEach(function (e) { removeEventListener(e, onFirst); }); loadAll(); }
    function schedule() {
        evs.forEach(function (e) { addEventListener(e, onFirst, { passive: true }); });
        var go = function () { onFirst(); };
        if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: CFG.idleDelay }); else setTimeout(go, CFG.idleDelay);
    }

    /* ---------- شريط الموافقة (اختياري) ---------- */
    function saved() { try { return localStorage.getItem('trk-consent'); } catch (e) { return null; } }
    function save(v) { try { localStorage.setItem('trk-consent', v); } catch (e) {} }
    function banner() {
        var d = document.createElement('div'); d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'الموافقة على ملفات التتبع');
        d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:95;background:#161616;border-top:1px solid rgba(207,165,96,.45);color:#fff;padding:12px 16px;font:14px Cairo,sans-serif;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap';
        var b = 'border:0;border-radius:10px;padding:8px 16px;font:700 14px Cairo,sans-serif;cursor:pointer;';
        d.innerHTML = '<span>نستخدم أدوات تحليل وإعلانات لتحسين تجربتك. هل توافق؟</span><span><button type="button" id="trk-y" style="' + b + 'background:#cfa560;color:#121212">موافق</button> <button type="button" id="trk-n" style="' + b + 'background:#333;color:#fff">رفض</button></span>';
        document.body.appendChild(d);
        d.querySelector('#trk-y').onclick = function () { save('yes'); consent = true; d.remove(); loadAll(); };
        d.querySelector('#trk-n').onclick = function () { save('no'); d.remove(); };
    }

    function start() {
        if (CFG.requireConsent) {
            var s = saved();
            if (s === 'yes') { consent = true; schedule(); }
            else if (s !== 'no') banner();
        } else schedule();
    }
    if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
