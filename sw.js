// Service worker: aplikacija se otvara i bez interneta; izmene stižu čim ima veze.
var VERSION = "rekomp-v15";
var SHELL = [
  "./", "./index.html", "./styles.css", "./config.js", "./manifest.webmanifest", "./vendor/supabase.js",
  "./js/app.js", "./js/api.js", "./js/util.js", "./js/i18n.js", "./js/intake.js", "./js/intake-ui.js",
  "./js/client.js", "./js/admin.js", "./js/plan-format.js", "./js/demo-data.js", "./js/insights.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase i fontovi idu direktno na mrežu
  // Prvo mreža (da izmene stignu odmah), keš ako nema interneta.
  // cache: "no-cache" = uvek proveri kod servera da li ima nove verzije (brzo, 304 ako nema).
  // (navigacija mora bez opcija, inače pregledač odbija zahtev)
  var net = req.mode === "navigate" ? fetch(req) : fetch(req, { cache: "no-cache" });
  e.respondWith(net.then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || caches.match("./index.html"); });
  }));
});
