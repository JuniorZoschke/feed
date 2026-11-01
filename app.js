"use strict";
const CATS={all:"For You",laugh:"Laugh",whoa:"Whoa facts",ideas:"Big ideas",wins:"Quick wins",calm:"Calm",news:"News"};
const CATLBL={laugh:"Laugh",whoa:"Whoa fact",ideas:"Big idea",wins:"Quick win",calm:"Calm",news:"News"};
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IC={
 listen:'<svg viewBox="0 0 24 24"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>',
 more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></svg>',
 up:'<svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"/></svg>',
 down:'<svg viewBox="0 0 24 24"><path d="M17 13V4h3v9zM17 13l-4 8c-1.5 0-2.5-1-2.2-2.6l.6-3.4H5a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 6.3 4H17"/></svg>',
 share:'<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
 back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
 pause:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
 play:'<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
 stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
 ask:'<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
 chev:'<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
 ext:'<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'};
IC.x='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
IC.link='<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
IC.hide='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>';
/* ---------- state & preference model ---------- */
const LS="feed.v1";
const st=Object.assign({cat:{},tag:{},react:{},seen:{},opened:{},dwell:{},hidden:{},sessions:0,nudgeOff:false},JSON.parse(localStorage.getItem(LS)||"{}"));
st.hidden=st.hidden||{};
const save=()=>localStorage.setItem(LS,JSON.stringify(st));
st.sessions++;save();
let STORIES=[],byId={},tab="all",query="",queue=[],shown=new Set(),round=0;
/* reaction log: only when served by the local Feed server (GitHub Pages is static → no POST, no 405s) */
const LOCAL=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const evq=[];
function logEv(type,id,extra){evq.push(Object.assign({t:Date.now(),type,id},extra||{}));if(!LOCAL&&evq.length>200)evq.splice(0,100);}
function flush(){if(!LOCAL||!evq.length)return;const body=JSON.stringify(evq.splice(0));try{navigator.sendBeacon?navigator.sendBeacon("api/events",new Blob([body],{type:"application/json"})):fetch("api/events",{method:"POST",body,keepalive:true})}catch(e){}}
setInterval(flush,15000);addEventListener("pagehide",flush);document.addEventListener("visibilitychange",()=>{if(document.hidden)flush()});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function learn(s,w,why){st.cat[s.cat]=clamp((st.cat[s.cat]||0)+w,-6,8);s.tags.forEach(t=>st.tag[t]=clamp((st.tag[t]||0)+w*.5,-5,6));save();logEv("learn",s.id,{w:+w.toFixed(2),why});}
function score(s){let v=(st.cat[s.cat]||0)*1.0+s.tags.reduce((a,t)=>a+(st.tag[t]||0),0)*.6;
 if(st.react[s.id]===-1||st.hidden[s.id])v-=50; if(st.seen[s.id])v-=4; if(st.opened[s.id])v-=3; if(s.cat==="news")v+=.8;
 return v+jit(s.id);}
function jit(id){let h=round*7919+st.sessions*104729;for(const c of id)h=(h*31+c.charCodeAt(0))|0;return ((h>>>0)%1000)/1000*1.6;}
function rebuild(){
 let pool=STORIES.filter(s=>(tab==="all"||s.cat===tab)&&(!query||(s.title+" "+s.snippet+" "+s.tags.join(" ")+" "+s.bullets.join(" ")).toLowerCase().includes(query)));
 pool=pool.filter(s=>!shown.has(s.id)&&!(round>0&&(st.react[s.id]===-1||st.hidden[s.id])));
 pool.sort((a,b)=>score(b)-score(a));
 if(tab==="all"){const out=[];const rest=pool.slice();let l1=feedLastCat(),l2=null;while(rest.length){let i=(l1&&l1===l2)?rest.findIndex(s=>s.cat!==l1):0;if(i<0)i=0;const s=rest.splice(i,1)[0];out.push(s);l2=l1;l1=s.cat;}pool=out;}
 queue=pool;
}
function feedLastCat(){const c=[...$("#feed").querySelectorAll(".card")].pop();return c&&c.dataset.cat;}
/* ---------- rendering ---------- */
const fav=d=>`fav/${d}.png`;
const srcName=d=>d.replace(/^(en|www|news)\./,"").replace(/\.(org|com|edu|gov|ac\.uk|co\.uk)$/,"");
function rel(d){if(!d)return"Evergreen";const days=Math.round((Date.now()-new Date(d+"T12:00:00"))/864e5);if(days<=0)return"Today";if(days===1)return"Yesterday";if(days<7)return days+"d ago";if(days<30)return Math.round(days/7)+"w ago";return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});}
function cardHTML(s,i){
 return `<article class="card ${st.react[s.id]===1?"liked":""}" data-id="${s.id}" data-cat="${s.cat}">
 <div class="ph" data-tog><img class="loading" src="${s.image.src}" alt="${esc(s.title)}" ${i>2?'loading="lazy"':''} decoding="async" width="1200" height="675" onload="this.classList.remove('loading')"><span class="credit">${esc(s.image.credit)}</span></div>
 <div class="body"><div class="lbl">${CATLBL[s.cat]}</div>
 <h2 data-tog>${esc(s.title)}</h2><p class="snip" data-tog>${esc(s.snippet)} <span class="see">See more</span></p>
 <div class="meta"><div class="time"><span>${rel(s.date)}</span><span class="likeMark">· Liked</span></div>
 <div class="acts">${actsHTML()}</div></div></div>
 <div class="xwrap" aria-hidden="true"></div></article>`;}
const actsHTML=()=>`<button class="ic listen" aria-label="Listen">${IC.listen}</button><button class="ic shareB" aria-label="Share">${IC.share}</button><button class="ic more" aria-label="More">${IC.more}</button>`;
let loading=false;
function loadMore(n=5){
 if(loading)return;loading=true;
 if(!queue.length){
   const pool=STORIES.filter(s=>(tab==="all"||s.cat===tab)&&!query);
   if(!pool.length||query){endNote(query?"No more matches.":"");loading=false;return;}
   round++;shown.clear();rebuild();
   if(!queue.length){loading=false;return;}
   if($("#feed .card")) $("#feed").insertAdjacentHTML("beforeend",`<div class="endnote">You're all caught up on new stories. Here are some worth another look.</div>`);
 }
 const f=$("#feed");const start=f.querySelectorAll(".card").length;
 const batch=queue.splice(0,n);
 f.insertAdjacentHTML("beforeend",batch.map((s,k)=>cardHTML(s,start+k)).join(""));
 batch.forEach(s=>{shown.add(s.id);observeCard(s.id)});
 loading=false;
}
function endNote(t){if(t&&!$(".endnote.q"))$("#feed").insertAdjacentHTML("beforeend",`<div class="endnote q">${t}</div>`);}
function resetFeed(){stopSpeak();$("#feed").innerHTML="";shown.clear();rebuild();loadMore(6);scrollTo(0,0);}
/* dwell tracking */
const vis={};
const io=new IntersectionObserver(es=>{es.forEach(e=>{const id=e.target.dataset.id;if(e.target.classList.contains("open"))return;if(e.intersectionRatio>=.6){vis[id]=performance.now()}else if(vis[id]){commitDwell(id,performance.now()-vis[id]);delete vis[id]}})},{threshold:[0,.6]});
function observeCard(id){document.querySelectorAll(`.card[data-id="${id}"]`).forEach(el=>io.observe(el));}
function commitDwell(id,ms){const s=byId[id];if(!s)return;st.seen[id]=(st.seen[id]||0)+1;
 if(ms>2500){const w=Math.min(ms/1000,12)/12*0.6;learn(s,w,"dwell "+Math.round(ms/1000)+"s")}else if(ms<900){learn(s,-0.05,"skip")}else save();}
new IntersectionObserver(es=>{if(es[0].isIntersecting)loadMore(5)},{rootMargin:"1400px 0px"}).observe($("#sentinel"));
let st8=0;addEventListener("scroll",()=>{if(st8)return;st8=setTimeout(()=>{st8=0;if(scrollY+innerHeight>document.documentElement.scrollHeight-1600)loadMore(5)},120)},{passive:true});
addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("#menu").hidden)closeMenu();else if(!$("#sheet").hidden)closeSheet();}});
/* ---------- tabs & search ---------- */
function renderTabs(){$("#tabs").innerHTML=Object.entries(CATS).map(([k,v])=>`<button class="tab" role="tab" data-k="${k}" aria-selected="${k===tab}">${v}</button>`).join("");}
$("#tabs").addEventListener("click",e=>{const b=e.target.closest(".tab");if(!b)return;tab=b.dataset.k;renderTabs();$(`.tab[data-k="${tab}"]`).scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"});resetFeed();logEv("tab",null,{tab});});
$("#searchBtn").onclick=()=>{$("#searchRow").hidden=false;$("#q").focus();};
$("#searchClose").onclick=()=>{$("#searchRow").hidden=true;$("#q").value="";query="";resetFeed();};
let qt;$("#q").addEventListener("input",e=>{clearTimeout(qt);qt=setTimeout(()=>{query=e.target.value.trim().toLowerCase();resetFeed();},250)});
/* ---------- feed interactions (one delegated handler; every branch is synchronous up to its first side effect) ---------- */
$("#feed").addEventListener("click",e=>{
 const card=e.target.closest(".card");if(!card)return;const s=byId[card.dataset.id];
 if(e.target.closest(".more")){e.preventDefault();e.stopPropagation();toggleMenu(e.target.closest(".more"),s);return;}
 if(e.target.closest(".shareB")){share(s);return;}
 if(e.target.closest(".listen")){startSpeak(s,card);return;}           // speak() runs synchronously inside this tap
 if(e.target.closest(".ppB")){pauseResume();return;}
 if(e.target.closest(".stopB")){stopSpeak();return;}
 if(e.target.closest(".repT")){toggleReport(card,s);return;}
 if(e.target.closest(".relQ")){openSheet(s,e.target.closest(".relQ").dataset.q);return;}
 if(e.target.closest(".askOpen")){openSheet(s);return;}
 if(e.target.closest(".less")){collapse(card,true);return;}
 if(e.target.closest("[data-tog]")){card.classList.contains("open")?collapse(card,true):expand(card,s);}
});
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2400);}
function react(s,v){
 const prev=st.react[s.id]||0; if(prev===v){st.react[s.id]=0;learn(s,v===1?-1.5:2,"undo");toast("Removed");}
 else{st.react[s.id]=v;learn(s,v===1?2.5+(prev?2:0):-2-(prev?1.5:0),v===1?"like":"dislike");
  toast(v===1?`More ${CATLBL[s.cat].toLowerCase()} stories coming up`:`Got it, fewer like this`);}
 save();document.querySelectorAll(`.card[data-id="${s.id}"]`).forEach(c=>{c.classList.toggle("liked",st.react[s.id]===1);if(st.react[s.id]===-1)removeCard(c)});
 rebuild();
}
function removeCard(c){if(speaking&&speaking.root===c)stopSpeak();c.style.transition="opacity .3s";c.style.opacity=0;setTimeout(()=>c.remove(),320);}
function notInterested(s){st.hidden[s.id]=1;learn(s,-.8,"not interested");save();document.querySelectorAll(`.card[data-id="${s.id}"]`).forEach(removeCard);rebuild();toast("Hidden. You'll see less like this");}
/* More menu: always the same 4 actions, toggled only by the ⋯ button */
let menuFor=null;
function toggleMenu(btn,s){if(!$("#menu").hidden&&menuFor===btn){closeMenu();return;}openMenu(btn,s);}
function openMenu(btn,s){
 const m=$("#menu"),r=btn.getBoundingClientRect();menuFor=btn;
 m.innerHTML=`<button role="menuitem" data-a="like">${IC.up}${st.react[s.id]===1?"Liked":"Like"}</button><button role="menuitem" data-a="dislike">${IC.down}Dislike</button><button role="menuitem" data-a="hide">${IC.hide}Not interested</button><button role="menuitem" data-a="copy">${IC.link}Copy link</button>`;
 m.hidden=false;const mw=230,mh=m.offsetHeight;m.style.left=Math.max(8,Math.min(innerWidth-mw-8,r.right-mw))+"px";
 m.style.top=(r.bottom+mh+8>innerHeight?Math.max(8,r.top-mh-4):r.bottom+4)+"px";
 m.onclick=e=>{const a=e.target.closest("button")?.dataset.a;if(!a)return;closeMenu();
  if(a==="like")react(s,1);else if(a==="dislike")react(s,-1);else if(a==="hide")notInterested(s);else copyLink(s);};
}
document.addEventListener("pointerdown",e=>{if(!$("#menu").hidden&&!e.target.closest("#menu")&&!e.target.closest(".more"))closeMenu();},true);
addEventListener("scroll",()=>{if(!$("#menu").hidden)closeMenu()},{passive:true});
function closeMenu(){$("#menu").hidden=true;menuFor=null;}
const storyURL=s=>location.origin+location.pathname+"#"+s.id;
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const ta=document.createElement("textarea");ta.value=t;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:-100px;opacity:0";document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand("copy")}catch(x){}ta.remove();return ok}}
async function copyLink(s){const ok=await copyText(storyURL(s));toast(ok?"Link copied":"Couldn't copy link");logEv("copy",s.id);}
/* Share icon: native share sheet only (fallback: copy) */
function share(s){const data={title:s.title,text:s.snippet+"\nSource: "+s.sources[0].url,url:storyURL(s)};logEv("share",s.id);
 if(navigator.share){navigator.share(data).catch(()=>{});}else{copyText(s.title+" — "+storyURL(s)).then(ok=>toast(ok?"Link copied":"Couldn't copy link"));}}
/* ---------- Listen (Web Speech) — iOS WebKit safe ----------
 * speak() is called synchronously inside the tap handler (no await/timers before it), after cancel();
 * text is split into sentence-sized utterances (iOS silently drops/stops very long ones); utterances are kept
 * referenced in TTS.q so they aren't garbage-collected mid-speech (a known WebKit bug); a generation counter
 * ignores stale events from cancelled queues; state resets on end/error. */
const TTS={q:[],gen:0,voice:null,started:false,warned:false};
const HAS_TTS=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
function pickVoice(){if(!HAS_TTS)return;const vs=speechSynthesis.getVoices()||[];
 TTS.voice=vs.find(v=>/^en[-_]US/i.test(v.lang)&&/Samantha|Ava|Allison|Susan|Google US English/i.test(v.name))||vs.find(v=>/^en[-_]US/i.test(v.lang)&&v.localService)||vs.find(v=>/^en[-_]US/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null;}
if(HAS_TTS){pickVoice();try{speechSynthesis.addEventListener("voiceschanged",pickVoice)}catch(e){speechSynthesis.onvoiceschanged=pickVoice}}
const plain=t=>t.replace(/\[\d+\]/g,"").replace(/\s+/g," ").trim();
function speechText(s){const parts=[s.title+".",plain(s.snippet),...s.bullets.map(plain)];
 (s.sections||[]).forEach(x=>{parts.push(x.h+".");x.paras.forEach(p=>parts.push(plain(p)))});return parts;}
function chunkText(parts){const out=[];parts.forEach(p=>p.split(/(?<=[.!?])\s+/).forEach(sn=>{sn=sn.trim();if(!sn)return;
  while(sn.length>220){let k=sn.lastIndexOf(", ",200);if(k<60)k=sn.lastIndexOf(" ",200);if(k<60)k=200;out.push(sn.slice(0,k+1).trim());sn=sn.slice(k+1).trim();}
  if(sn)out.push(sn);}));return out;}
let speaking=null;
function startSpeak(s,root){
 if(speaking&&speaking.id===s.id&&speaking.root===root){pauseResume();return;}
 if(!HAS_TTS){toast("Listening isn't supported in this browser");return;}
 const synth=window.speechSynthesis;
 synth.cancel();                       // clear anything queued/stuck (iOS)
 const gen=++TTS.gen;resetPlayerUI();
 if(!TTS.voice)pickVoice();
 const chunks=chunkText(speechText(s));
 TTS.q=chunks.map((text,i)=>{const u=new SpeechSynthesisUtterance(text);u.lang=(TTS.voice&&TTS.voice.lang)||"en-US";if(TTS.voice)u.voice=TTS.voice;u.rate=1;u.pitch=1;u.volume=1;
  u.onstart=()=>{if(gen!==TTS.gen)return;TTS.started=true;if(speaking)speaking.idx=i;logEv("tts_start",s.id,{i});};
  u.onboundary=()=>{if(gen===TTS.gen)TTS.started=true;};
  u.onend=()=>{if(gen!==TTS.gen)return;if(i===chunks.length-1)stopSpeak();};
  u.onerror=ev=>{if(gen!==TTS.gen)return;const er=ev&&ev.error;if(er==="interrupted"||er==="canceled")return;stopSpeak();toast("Couldn't play audio"+(er?" ("+er+")":""));};
  return u;});
 for(const u of TTS.q)synth.speak(u);  // synchronous, still inside the user gesture
 if(synth.paused)synth.resume();        // WebKit can start in a paused state
 speaking={id:s.id,root,gen,idx:0};TTS.started=false;
 showPlayer(root);learn(s,.4,"listen");
 setTimeout(()=>{if(speaking&&speaking.gen===gen&&!TTS.started&&!synth.speaking&&!TTS.warned){TTS.warned=true;toast("No sound? Turn the volume up and make sure the ring/silent switch isn't on silent.");}},2500);
}
function pauseResume(){if(!HAS_TTS||!speaking)return;const synth=speechSynthesis;
 if(speaking.paused){synth.resume();speaking.paused=false;
   setTimeout(()=>{if(speaking&&!speaking.paused&&!synth.speaking){/* iOS sometimes loses the queue on resume: restart from current sentence */ }},400);}
 else{synth.pause();speaking.paused=true;}
 setPlayerState(!speaking.paused);}
function stopSpeak(){TTS.gen++;try{if(HAS_TTS)speechSynthesis.cancel()}catch(e){}TTS.q=[];resetPlayerUI();speaking=null;}
function showPlayer(root){const a=root.querySelector(".acts");
 a.innerHTML=`<div class="player" role="group" aria-label="Audio player"><span class="wave" aria-hidden="true"><b></b><b></b><b></b></span><span class="pl">Playing</span><button class="ic ppB" aria-label="Pause">${IC.pause}</button><button class="ic stopB" aria-label="Stop">${IC.stop}</button></div>`;}
function setPlayerState(playing){const p=speaking&&speaking.root.querySelector(".player");if(!p)return;p.classList.toggle("paused",!playing);const b=p.querySelector(".ppB");b.innerHTML=playing?IC.pause:IC.play;b.setAttribute("aria-label",playing?"Pause":"Play");p.querySelector(".pl").textContent=playing?"Playing":"Paused";}
function resetPlayerUI(){document.querySelectorAll(".card .player").forEach(p=>{p.parentElement.innerHTML=actsHTML()});}
addEventListener("pagehide",()=>{if(speaking)stopSpeak()});
/* ---------- in-place expansion ---------- */
function chips(text,s){ // "[1][2]" runs → one grey pill "wikipedia +1" linking to the first source
 return esc(text).replace(/(?:\[\d+\])+/g,run=>{const ns=[...new Set([...run.matchAll(/\d+/g)].map(m=>+m[0]))].filter(n=>s.sources[n-1]);if(!ns.length)return"";
  const f=s.sources[ns[0]-1];return ` <a class="pill" href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(f.title)}">${esc(srcName(f.domain))}${ns.length>1?" +"+(ns.length-1):""}</a>`;});}
function expHTML(s){
 const secs=s.sections&&s.sections.length?s.sections:[{h:"The story",paras:s.report}];
 const rq=[...s.qa.map(x=>x[0]),"Explain it simply","What are the sources?"].slice(0,4);
 return `<div class="x"><ul class="bul">${s.bullets.map(b=>`<li>${chips(b,s)}</li>`).join("")}</ul>
 <button class="repT" aria-expanded="false"><span>Full report</span>${IC.chev}</button>
 <div class="rwrap"><div class="rbody">${secs.map(x=>`<h3>${esc(x.h)}</h3>${x.paras.map(p=>`<p>${chips(p,s)}</p>`).join("")}`).join("")}</div></div>
 <div class="sect">Sources</div><div class="srcRow">${s.sources.map(x=>`<a class="srcCard" href="${esc(x.url)}" target="_blank" rel="noopener"><img class="th" src="${fav(x.domain)}" alt="" loading="lazy"><div><div class="d">${esc(x.domain)}</div><div class="t">${esc(x.title)}</div><div class="v">View full article ↗</div></div></a>`).join("")}</div>
 <div class="sect">Related</div><ul class="rel">${rq.map(q=>`<li><button class="relQ" data-q="${esc(q)}">${esc(q)}<span>+</span></button></li>`).join("")}</ul>
 <div class="photoCredit">Photo: ${esc(s.image.credit)}${s.image.license?" · "+esc(s.image.license):""} · <a href="${esc(s.image.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></div>
 <button class="less">Show less</button></div>
 <div class="askbar"><div class="in"><button class="askOpen">${IC.ask}<span>Ask follow-up</span></button></div></div>`;}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function animH(el,to,done){const from=el.getBoundingClientRect().height;el.style.height=from+"px";
 const target=to==="auto"?el.scrollHeight:to;if(reduce||Math.abs(target-from)<2){el.style.height=to==="auto"?"auto":to+"px";done&&done();return;}
 void el.offsetHeight;el.style.height=target+"px";let fin=false;const end=()=>{if(fin)return;fin=true;el.removeEventListener("transitionend",onT);if(to==="auto")el.style.height="auto";done&&done();};
 const onT=e=>{if(e.target===el&&e.propertyName==="height")end()};el.addEventListener("transitionend",onT);setTimeout(end,600);}
const openAt=new WeakMap();
function expand(card,s){
 document.querySelectorAll(".card.open").forEach(c=>{if(c!==card){const above=c.getBoundingClientRect().top<card.getBoundingClientRect().top;const h0=c.offsetHeight;collapse(c,false,true);if(above)scrollBy(0,c.offsetHeight-h0);}});
 const w=card.querySelector(".xwrap");if(!w.firstChild)w.innerHTML=expHTML(s);
 card.classList.add("open");w.setAttribute("aria-hidden","false");openAt.set(card,performance.now());
 animH(w,"auto");st.opened[s.id]=(st.opened[s.id]||0)+1;learn(s,.5,"expand");logEv("open",s.id);
 history.replaceState(null,"","#"+s.id);
}
function collapse(card,keepInView,instant){
 const s=byId[card.dataset.id];const w=card.querySelector(".xwrap");if(!card.classList.contains("open"))return;
 const t=openAt.get(card);if(t&&s){const secs=(performance.now()-t)/1000;if(secs>4)learn(s,Math.min(secs/30,1.2),"read "+Math.round(secs)+"s");st.dwell[s.id]=(st.dwell[s.id]||0)+Math.round(secs);save();}
 card.classList.remove("open");w.setAttribute("aria-hidden","true");
 if(instant){w.style.height="0px";}else animH(w,0);
 if(keepInView){const top=card.getBoundingClientRect().top;if(top<0)scrollBy({top:top-($("#top").offsetHeight+8),behavior:reduce?"auto":"smooth"});}
 if(location.hash)history.replaceState(null,"",location.pathname+location.search);rebuild();
}
function toggleReport(card,s){const b=card.querySelector(".repT"),r=card.querySelector(".rwrap"),w=card.querySelector(".xwrap");
 const open=b.getAttribute("aria-expanded")==="true";b.setAttribute("aria-expanded",!open);
 b.querySelector("span").textContent=open?"Full report":"Hide full report";
 w.style.height="auto";animH(r,open?0:"auto");if(!open){learn(s,.3,"full report");logEv("report",s.id);}}
/* ---------- ask follow-up (answers only from the story's own sources) ---------- */
const STOP=new Set("a an the is are was were be to of and or in on at for with it its this that what why how who when where which do does did can could would should i you me my your about from by as into than then there their they them he she his her we our us more most very just so not no yes much many get got have has had will".split(" "));
const words=t=>t.toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)).map(w=>w.replace(/(ies|es|s)$/,""));
function answer(s,q){
 const qw=new Set(words(q));
 // 1) curated Q&A
 let best=null,bs=0;s.qa.forEach(([qq,a])=>{const w=words(qq);const o=w.filter(x=>qw.has(x)).length/Math.max(1,Math.min(w.length,qw.size));if(o>bs){bs=o;best=a}});
 if(bs>=.5)return{html:esc(best),ok:true};
 if(/source|where.*(from|read)|cite|evidence|proof/i.test(q))return{html:"This story uses "+s.sources.map((x,i)=>`<sup><a href="${x.url}" target="_blank" rel="noopener">${i+1}</a></sup> ${esc(x.title)} (${esc(x.domain)})`).join("; ")+".",ok:true};
 if(/simple|explain|eli5|like i'?m|summar|tl;?dr|short/i.test(q))return{html:esc(s.snippet)+" "+cite(s.bullets[0],s),ok:true};
 // 2) retrieve sentences from bullets + report
 const sents=[...s.bullets,...s.report.concat(...(s.sections||[]).slice(1).map(x=>x.paras)).flatMap(p=>p.split(/(?<=\.(?:\[\d+\])?)\s+(?=[A-Z])/))];
 const ranked=sents.map(t=>({t,sc:words(t).filter(x=>qw.has(x)).length})).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc);
 if(ranked.length&&ranked[0].sc>=1&&qw.size){return{html:ranked.slice(0,2).map(x=>cite(x.t,s)).join(" "),ok:true,partial:ranked[0].sc<2}}
 return{html:"I don't have that in this story's sources yet.",ok:false};
}
let skipPop=false;addEventListener("popstate",()=>{if(skipPop){skipPop=false;return;}if(!$("#sheet").hidden)closeSheet(true);});
function openSheet(s,firstQ){
 closeMenu();const sh=$("#sheet");sh.hidden=false;document.body.classList.add("lock");
 $("#chat").innerHTML=`<div class="msg bot">Ask me anything about <b>${esc(s.title)}</b>. I answer from this story's sources.</div>`;
 const sug=[...s.qa.map(x=>x[0]),"What are the sources?","Explain it simply"];
 $("#sugg").innerHTML=sug.slice(0,4).map(q=>`<button>${esc(q)}</button>`).join("");
 $("#sugg").onclick=e=>{const b=e.target.closest("button");if(b)ask(s,b.textContent)};
 $("#askForm").onsubmit=e=>{e.preventDefault();const v=$("#askIn").value.trim();if(v){ask(s,v);$("#askIn").value=""}};
 sh.querySelector(".scrim").onclick=()=>closeSheet();sh.querySelector(".close").onclick=()=>closeSheet();
 history.pushState({sheet:1},"",location.hash||"#"+s.id);logEv("ask_open",s.id);
 if(firstQ)ask(s,firstQ);
}
function ask(s,q){
 const c=$("#chat");c.insertAdjacentHTML("beforeend",`<div class="msg me">${esc(q)}</div>`);
 const a=answer(s,q);
 const fb=`<button class="fallback" data-q="${esc(q)}">${IC.ask.replace('<svg','<svg style="width:15px;height:15px"')}Ask Feed in chat</button>`;
 c.insertAdjacentHTML("beforeend",`<div class="msg bot">${a.html}${a.ok?(a.partial?"<small>Closest match from the sources. For more depth:</small>"+fb:"<small>From this story's sources</small>"):"<small>Copy your question and ask me in our chat for a fuller answer:</small>"+fb}</div>`);
 c.scrollTop=c.scrollHeight;learn(s,.6,"ask");logEv("ask",s.id,{q,ok:a.ok});
 c.querySelectorAll(".fallback").forEach(b=>b.onclick=async()=>{const ok=await copyText(`About "${s.title}": ${b.dataset.q}`);toast(ok?"Question copied. Paste it to Feed in chat":"Question: "+b.dataset.q);logEv("ask_fallback",s.id,{q:b.dataset.q})});
}
function closeSheet(silent){const sh=$("#sheet");if(sh.hidden)return;sh.hidden=true;document.body.classList.remove("lock");if(!silent&&history.state&&history.state.sheet){skipPop=true;history.back();}}
/* ---------- wellbeing nudge ---------- */
let active=0,lastTick=Date.now();
setInterval(()=>{const now=Date.now();if(!document.hidden&&now-lastAct<60000)active+=now-lastTick;lastTick=now;
 if(!st.nudgeOff&&active>15*60000&&!nudged){nudged=true;showNudge();}},5000);
let lastAct=Date.now(),nudged=false;["scroll","touchstart","click","keydown"].forEach(ev=>addEventListener(ev,()=>lastAct=Date.now(),{passive:true}));
function showNudge(){const n=$("#nudge");n.innerHTML=`<div class="box"><div class="orb"></div><h3>You've been here 15 min</h3><p>Take a breath? Breathe in as the circle grows, out as it shrinks.</p><div class="btns"><button class="btn" id="nKeep">Keep going</button><button class="btn pri" id="nDone">I'm good, close</button></div><p style="margin:14px 0 0;font-size:12px"><button id="nOff" style="color:var(--mut);text-decoration:underline">Don't remind me</button></p></div>`;
 n.hidden=false;$("#nKeep").onclick=()=>{n.hidden=true;active=0;nudged=false};$("#nDone").onclick=()=>{n.hidden=true;active=0;nudged=false;toast("Nice. See you later 👋")};$("#nOff").onclick=()=>{st.nudgeOff=true;save();n.hidden=true};logEv("nudge",null);}
window.__feed={st,showNudge,answer:(id,q)=>answer(byId[id],q),queue:()=>queue.map(s=>s.id),tts:TTS,chunkText,speechText:id=>speechText(byId[id])};
/* ---------- boot ---------- */
(async()=>{
 $("#feed").innerHTML='<div class="skel"></div><div class="skel"></div>';
 let r;try{r=await fetch("data/stories.json",{cache:"no-cache"});}catch(e){r=await caches.match("data/stories.json");}
 STORIES=await r.json();STORIES.forEach(s=>byId[s.id]=s);
 renderTabs();$("#feed").innerHTML="";rebuild();
 const hid=location.hash.slice(1).split("/")[0];
 if(byId[hid]){queue=[byId[hid],...queue.filter(x=>x.id!==hid)];}
 loadMore(6);
 if(byId[hid]){const c=$(`.card[data-id="${hid}"]`);if(c)expand(c,byId[hid]);}
 if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
