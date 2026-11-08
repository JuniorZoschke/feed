const V="feed-v13.1";const CORE=["./","index.html","app.css?v=13","app.js?v=13.1","manifest.webmanifest","data/stories.json","icons/icon-192.png"];
const AUDIO="feed-audio-v3"; // listened stories are cached lazily for offline replay (kept across app updates)
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==AUDIO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function audio(req){ // full-file cache; answers Range requests from the cached blob (iOS Safari always sends Range for media)
 const c=await caches.open(AUDIO);const url=req.url.split("#")[0];let r=await c.match(url);
 if(!r){try{const n=await fetch(url);if(n.ok&&n.status===200){await c.put(url,n.clone());r=n.clone()}else return n}catch(e){return Response.error()}}
 const range=req.headers.get("range");if(!range)return r;
 const buf=await r.arrayBuffer();const m=/bytes=(\d*)-(\d*)/.exec(range)||[];const st=+m[1]||0;const en=m[2]?Math.min(+m[2],buf.byteLength-1):buf.byteLength-1;
 return new Response(buf.slice(st,en+1),{status:206,headers:{"Content-Type":"audio/mpeg","Content-Range":`bytes ${st}-${en}/${buf.byteLength}`,"Content-Length":String(en-st+1),"Accept-Ranges":"bytes"}});}
function remember(e,key,response){e.waitUntil(caches.open(V).then(c=>c.put(key,response)).catch(()=>{}));}
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.hostname.endsWith("workers.dev")||u.pathname.includes("/api/"))return; // API calls are never cached
 if(u.pathname.includes("/audio/")&&u.pathname.endsWith(".mp3")){e.respondWith(audio(e.request));return;}
 if(u.pathname.endsWith("stories.json")||u.pathname.endsWith("now.json")){ // network first, never the HTTP cache, so a fresh daily batch shows up immediately
  const key=u.origin+u.pathname;
  e.respondWith(fetch(key+"?sw="+Date.now(),{cache:"no-store"}).then(r=>{if(r.ok){const c=r.clone();remember(e,key,c)}return r}).catch(()=>caches.match(key,{ignoreSearch:true})));return;}
 if(u.pathname.endsWith("/")||u.pathname.endsWith(".html")){ // network first
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();remember(e,e.request,c);return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));return;}
 e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();remember(e,e.request,c)}return r})));});

// Offline packs survive page navigation. Each caller joins the same in-flight asset manifest.
const packs=new Map();
function packURLs(items,folder){
 const scope=new URL(self.registration.scope);
 return [...new Set((Array.isArray(items)?items:[]).slice(0,2000).map(x=>{
  try{const u=new URL(x,scope);return u.origin===scope.origin&&u.pathname.startsWith(scope.pathname+folder+"/")?u.href:null;}catch(e){return null;}
 }).filter(Boolean))];
}
async function packAssets(data,progress){
 const imgs=packURLs(data.images,"img"),auds=packURLs(data.audio,"audio");
 const core=await caches.open(V),ac=await caches.open(AUDIO),total=imgs.length+auds.length;
 const manifest=new URL("offline-pack-v13.json",self.registration.scope).href;
 const signature=String(data.signature||"");const previous=await core.match(manifest);
 if(previous&&await previous.text()===signature)return {total,fail:0};
 let done=0,fail=0;
 async function drain(items,cache){
  while(items.length){const u=items.shift();try{
   if(!await cache.match(u)){const r=await fetch(u);if(r.ok&&r.status===200)await cache.put(u,r);else fail++;}
  }catch(e){fail++;}
  done++;if(done===total||done%25===0)progress({type:"offline_progress",done,total});
  }
 }
 const iq=imgs.slice(),aq=auds.slice();
 await Promise.all([...Array.from({length:6},()=>drain(iq,core)),...Array.from({length:3},()=>drain(aq,ac))]);
 if(!fail)await core.put(manifest,new Response(signature));
 return {total,fail};
}
self.addEventListener("message",e=>{
 const data=e.data||{};if(data.type!=="FEED_OFFLINE_PACK")return;
 const port=e.ports&&e.ports[0];const send=x=>{try{if(port)port.postMessage(x);}catch(err){}};
 const key=String(data.signature||"");let job=packs.get(key);
 if(!job){job=packAssets(data,send);packs.set(key,job);job.then(()=>packs.delete(key),()=>packs.delete(key));}
 e.waitUntil(job.then(result=>send({type:"offline_done",...result})).catch(()=>send({type:"offline_error"})));
});
