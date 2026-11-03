const V="feed-v8";const CORE=["./","index.html","app.css?v=8","app.js?v=8","manifest.webmanifest","data/stories.json","data/now.json","icons/icon-192.png"];
const AUDIO="feed-audio-v3"; // listened stories are cached lazily for offline replay (kept across app updates)
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==AUDIO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function audio(req){ // full-file cache; answers Range requests from the cached blob (iOS Safari always sends Range for media)
 const c=await caches.open(AUDIO);const url=req.url.split("#")[0];let r=await c.match(url);
 if(!r){try{const n=await fetch(url);if(n.ok&&n.status===200){await c.put(url,n.clone());r=n.clone()}else return n}catch(e){return Response.error()}}
 const range=req.headers.get("range");if(!range)return r;
 const buf=await r.arrayBuffer();const m=/bytes=(\d*)-(\d*)/.exec(range)||[];const st=+m[1]||0;const en=m[2]?Math.min(+m[2],buf.byteLength-1):buf.byteLength-1;
 return new Response(buf.slice(st,en+1),{status:206,headers:{"Content-Type":"audio/mpeg","Content-Range":`bytes ${st}-${en}/${buf.byteLength}`,"Content-Length":String(en-st+1),"Accept-Ranges":"bytes"}});}
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.hostname.endsWith("workers.dev")||u.pathname.includes("/api/"))return; // API calls are never cached
 if(u.pathname.includes("/audio/")&&u.pathname.endsWith(".mp3")){e.respondWith(audio(e.request));return;}
 if(u.pathname.endsWith("stories.json")||u.pathname.endsWith("now.json")){ // network first, never the HTTP cache, so a fresh daily batch shows up immediately
  const key=u.origin+u.pathname;
  e.respondWith(fetch(key+"?sw="+Date.now(),{cache:"no-store"}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(key,c))}return r}).catch(()=>caches.match(key,{ignoreSearch:true})));return;}
 if(u.pathname.endsWith("/")||u.pathname.endsWith(".html")){ // network first
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));return;}
 e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r})));});
