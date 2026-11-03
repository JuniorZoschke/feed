"use strict";
const CATS={all:"For You",news:"News",money:"Money & Deals",health:"Health",adhd:"ADHD Edge",mind:"Mind",ai:"AI",travel:"Travel & Borders",english:"English",whoa:"Whoa",laugh:"Laugh",calm:"Calm"};
const CATLBL={news:"News",money:"Money & Deals",health:"Health",adhd:"ADHD Edge",mind:"Mind",ai:"AI",travel:"Travel & Borders",english:"English",whoa:"Whoa fact",laugh:"Laugh",calm:"Calm"};
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
IC.upF='<svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9z" fill="currentColor"/><path d="M7 11l4-8c1.5 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7z" fill="currentColor"/></svg>';
IC.save='<svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4z"/></svg>';IC.saveF='<svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4z" fill="currentColor"/></svg>';
IC.search='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
IC.hide='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>';
/* ---------- state & preference model ---------- */
const LS="feed.v1";
const st=Object.assign({cat:{},tag:{},react:{},seen:{},opened:{},dwell:{},hidden:{},sessions:0,nudgeOff:false},JSON.parse(localStorage.getItem(LS)||"{}"));
st.hidden=st.hidden||{};
const save=()=>localStorage.setItem(LS,JSON.stringify(st));
/* v7 seen-tracking: impression (>=60% visible for 1.5s) or opened. Legacy dwell counts become "seen" once. */
if(!st.seenAt){st.seenAt={};Object.keys(st.seen||{}).concat(Object.keys(st.opened||{})).forEach(id=>st.seenAt[id]=1);}
const isSeen=s=>!!(st.seenAt[s.id]||st.opened[s.id]);
function markSeen(id,how){if(!st.seenAt[id]){st.seenAt[id]=Date.now();save();logEv("seen",id,{how});}}
st.sessions++;save();
/* library: full story copies of saved + liked items, so they outlive the 14-day prune */
const LIBK="feed.library";const LIB=Object.assign({saved:{},liked:{}},JSON.parse(localStorage.getItem(LIBK)||"{}"));
const saveLib=()=>{try{localStorage.setItem(LIBK,JSON.stringify(LIB))}catch(e){toast("Storage full")}};
const libCopy=s=>{const c=Object.assign({},s);delete c._sec;return c;};
let STORIES=[],byId={},tab="all",query="",queue=[],shown=new Set(),round=0,SEENQ=[],NEWN=0,UNSEENN=0,BONUSN=0;const JUSTIN=new Set(); // stories that arrived via refresh during this session lead the feed
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
/* ---------- freshness: Today batch, New badges, Earlier, evergreen mixed 1 in 4 ---------- */
const DAY=864e5,FRESH_DAYS=14;
const VKEY="feed.lastVisit";const PREV_VISIT=+localStorage.getItem(VKEY)||0;
const isEver=s=>!!s.evergreen||!s.addedAt;
const tAdded=s=>s.addedAt?Date.parse(s.addedAt):0;
const tPub=s=>Date.parse(s.publishedAt||(s.date?s.date+"T12:00:00Z":0))||0;
let NEWEST=0;
const isToday=s=>!isEver(s)&&NEWEST-tAdded(s)<20*3600e3;
const isNew=s=>!isEver(s)&&(PREV_VISIT?tAdded(s)>PREV_VISIT:isToday(s));
function prune(list){const now=Date.now();return list.filter(s=>isEver(s)||now-tPub(s)<=FRESH_DAYS*DAY);}
function mixEver(fresh,ever){const out=[];let e=0;fresh.forEach((s,i)=>{out.push(s);if((i+1)%3===0&&e<ever.length)out.push(ever[e++]);});return {out,used:e};}
function rebuild(){
 let pool=STORIES.filter(s=>(tab==="all"||s.cat===tab)&&(!query||(s.title+" "+s.snippet+" "+s.tags.join(" ")+" "+s.bullets.join(" ")+" "+(CATS[s.cat]||"")).toLowerCase().includes(query)));
 pool=pool.filter(s=>!shown.has(s.id)&&!(round>0&&(st.react[s.id]===-1||st.hidden[s.id])));
 pool.sort((a,b)=>score(b)-score(a));
 if(!query&&round===0){
  const un=pool.filter(x=>!isSeen(x)),seen=pool.filter(isSeen);
  const uf=un.filter(x=>!isEver(x)).sort((a,b)=>fscore(b)-fscore(a)),ue=un.filter(isEver).sort((a,b)=>score(b)-score(a));
  const ji=uf.filter(x=>JUSTIN.has(x.id));let lead=[...ji,...catMix(rotate(uf.filter(x=>!JUSTIN.has(x.id))))];
  if(tab==="all")lead=diversify(lead);
  // Bonus picks: short + finite. His best unseen evergreen; if fewer than 3, top up with the evergreen he saw longest ago.
  const BN=tab==="all"?5:3;let leadRun=0;for(const x of lead)leadRun=isExplore(x)?0:leadRun+1;let bonus=(tab==="all"?diversify(ue,leadRun):ue).slice(0,BN);
  if(bonus.length<3){const old=seen.filter(isEver).sort((a,b)=>(st.seenAt[a.id]||0)-(st.seenAt[b.id]||0)).slice(0,3-bonus.length);bonus=bonus.concat(old);}
  const bset=new Set(bonus.map(x=>x.id));const rest=seen.filter(x=>!bset.has(x.id)).sort((a,b)=>score(b)-score(a));
  lead.forEach((x,i)=>x._sec=i===0&&tab==="all"?"hook":"");bonus.forEach((x,i)=>x._sec=i===0?"bonus":"");rest.forEach(x=>x._sec="");
  BONUSN=bonus.length;
  if(document.querySelector("#feed .seenT.open")){queue=[...lead,...bonus,...catMix(rest)];SEENQ=[];return;}
  queue=[...lead,...bonus];SEENQ=catMix(rest);return;}
 pool.forEach(x=>x._sec="");
 if(tab==="all"){const out=[];const rest=pool.slice();let l1=feedLastCat(),l2=null;while(rest.length){let i=(l1&&l1===l2)?rest.findIndex(s=>s.cat!==l1):0;if(i<0)i=0;const s=rest.splice(i,1)[0];out.push(s);l2=l1;l1=s.cat;}pool=out;}
 queue=tab==="all"&&!query?diversify(pool,feedRun()):pool;
}
/* fresher + liked first; rotate the top few each open; never two of a category in a row (if avoidable) */
function fscore(s){return score(s)+(isNew(s)?3:0)+Math.max(0,2-(NEWEST-tAdded(s))/DAY)+Math.max(0,1.5-(Date.now()-tPub(s))/(2*DAY));}
function rotate(a){const nn=a.findIndex(s=>!isNew(s));const k=Math.min(5,a.length,nn>1?nn:(nn===-1?a.length:5));if(k<2)return a;const r=st.sessions%k;const top=a.slice(0,k);return [...top.slice(r),...top.slice(0,r),...a.slice(k)];}
function catMix(a){const out=[],rest=a.slice();let last=null;while(rest.length){let i=rest.findIndex(s=>s.cat!==last);if(i<0)i=0;const s=rest.splice(i,1)[0];out.push(s);last=s.cat;}return out;}
/* anti-bubble: at least 1 in every 4 cards is from a category he hasn't liked, or a 'whoa' story, whatever the like weighting */
const LIKEDCAT=c=>(st.cat[c]||0)>0.5;
const isExplore=s=>s.cat==="whoa"||!LIKEDCAT(s.cat);
function diversify(a,run0=0){const out=[],rest=a.slice();let run=run0;
 while(rest.length){let i=0;
  if(run>=3&&!isExplore(rest[0])){const last=out.length?out[out.length-1].cat:null;let j=rest.findIndex(x=>isExplore(x)&&x.cat!==last);if(j<0)j=rest.findIndex(isExplore);if(j>=0)i=j;}
  const x=rest.splice(i,1)[0];out.push(x);run=isExplore(x)?0:run+1;}
 // tail fix: if explore stories ran out, tuck leftover liked ones back into earlier gaps (never >3 in a row)
 const runOk=(a,k)=>{let r=0,w=0;for(const x of a){r=isExplore(x)?0:r+1;w=Math.max(w,r);}return w<=3;};
 let r=run0,tail=0;for(const x of out){r=isExplore(x)?0:r+1;}tail=r;
 if(tail>3){const extra=out.splice(out.length-(tail-3),tail-3);
  for(const x of extra.reverse()){let placed=false;for(let k=out.length-1;k>0;k--){const c=out.slice();c.splice(k,0,x);if(runOk(c)&&c[k-1].cat!==x.cat){out.splice(k,0,x);placed=true;break;}}if(!placed)out.push(x);}}
 return out;}
function feedRun(){const cs=[...$("#feed").querySelectorAll(".card")];let r=0;for(let k=cs.length-1;k>=0;k--){const s=byId[cs[k].dataset.id];if(!s||isExplore(s))break;r++;}return r;}
function feedLastCat(){const c=[...$("#feed").querySelectorAll(".card")].pop();return c&&c.dataset.cat;}
/* ---------- rendering ---------- */
const fav=d=>`fav/${d}.png`;
const srcName=d=>d.replace(/^(en|www|news)\./,"").replace(/\.(org|com|edu|gov|ac\.uk|co\.uk)$/,"");
function rel(d){if(!d)return"Evergreen";const days=Math.round((Date.now()-new Date(d+"T12:00:00"))/864e5);if(days<=0)return"Today";if(days===1)return"Yesterday";if(days<7)return days+"d ago";if(days<30)return Math.round(days/7)+"w ago";return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});}
function relT(s){const t=tPub(s);if(!t)return rel(s.date);const m=(Date.now()-t)/6e4;if(m<60)return Math.max(1,Math.round(m))+"m ago";if(m<1440)return Math.round(m/60)+"h ago";return rel(new Date(t).toISOString().slice(0,10));}
const ago=t=>{const m=(Date.now()-t)/6e4;return m<1?"just now":m<60?Math.round(m)+" min ago":m<1440?Math.round(m/60)+" h ago":Math.round(m/1440)+" d ago";};
function nextBatch(){const d=new Date(),m=d.getHours()*60+d.getMinutes();const slots=[[6,0],[12,30],[18,30]];const nx=slots.find(([h,mi])=>h*60+mi>m)||slots[0];
 const t=new Date(d);t.setHours(nx[0],nx[1],0,0);return (nx===slots[0]&&m>=18*60+30?"tomorrow ":"")+t.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit"});}
function todayHead(){const d=new Date();const nm=tab==="all"?"":` in ${CATS[tab]}`;
 const nl=NEWN?`<b>${NEWN} new</b> since your last visit${UNSEENN>NEWN?` · ${UNSEENN} unread`:""}`:(UNSEENN?`<b>${UNSEENN} unread</b>${nm} for you`:`Nothing new${nm} yet · bonus picks below · next batch ${nextBatch()}`);
 return (tab==="all"?`<div class="todayH"><b>Today</b> · ${d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>`:"")+`<div class="newLine"><span class="dot"></span>${nl}</div>`;}
function counts(){const un=STORIES.filter(x=>(tab==="all"||x.cat===tab)&&!isEver(x)&&!isSeen(x)&&!st.hidden[x.id]&&st.react[x.id]!==-1);UNSEENN=un.length;NEWN=un.filter(x=>PREV_VISIT?tAdded(x)>PREV_VISIT:isToday(x)).length;}
/* See other sides: 2-4 real articles on the same event from outlets across the spectrum (built + link-checked by pipeline/sides.py) */
const SCALE='<svg viewBox="0 0 24 24"><path d="M12 3v18M5 21h14M4 8h16M4 8l-3 6a3 3 0 0 0 6 0zM20 8l-3 6a3 3 0 0 0 6 0z"/></svg>';
const hasSides=x=>Array.isArray(x.sides)&&x.sides.length>=2;
const sidesBtn=(x,key)=>hasSides(x)?`<button class="sidesB" data-sides="${esc(key)}" aria-label="See other sides">${SCALE}<span>See other sides · ${x.sides.length}</span></button>`:"";
function openSides(x){const ls={L:"Left-leaning",C:"Centre",R:"Right-leaning"};const el=$("#sides");
 el.innerHTML=`<div class="scrim"></div><div class="panel" role="dialog" aria-label="Other sides"><div class="grab"></div><div class="sheetHead"><b>Other sides</b><button class="ic close" aria-label="Close">${IC.x}</button></div><p class="sdIntro">Same story, other outlets: <i>${esc(x.title)}</i></p><ul class="sdList">${x.sides.map(o=>`<li><a href="${esc(o.url)}" target="_blank" rel="noopener"><span class="sdO"><b>${esc(o.outlet)}</b><span class="lean ${o.lean}">${ls[o.lean]||""}</span><span class="sdT">${ago(Date.parse(o.publishedAt))}</span></span><span class="sdH">${esc(o.title)}</span></a></li>`).join("")}</ul><p class="sdNote">Headlines as each outlet published them. Lean labels follow common media-bias ratings.</p></div>`;
 el.hidden=false;document.body.classList.add("lock");el.querySelector(".scrim").onclick=closeSides;el.querySelector(".close").onclick=closeSides;logEv("sides",x.id||null);}
function closeSides(){$("#sides").hidden=true;if($("#sheet").hidden&&$("#lib").hidden)document.body.classList.remove("lock");}
document.addEventListener("click",e=>{const b=e.target.closest(".sidesB");if(!b)return;e.preventDefault();e.stopPropagation();const k=b.dataset.sides;const x=byId[k];if(x)openSides(x);},true);
function cardHTML(s,i){
 const hook=s._sec==="hook",bon=s._sec==="bonus";s._sec="";
 return `${bon?`<div class="secH bonusH">Bonus picks · worth your time</div>`:""}<article class="card ${hook?"hook ":""}${st.react[s.id]===1?"liked":""}" data-id="${s.id}" data-cat="${s.cat}">${hook?`<div class="hookK"><span class="spark">●</span> ${!isEver(s)&&Date.now()-tPub(s)<12*3600e3?"Just in":isNew(s)?"New for you":"Fresh for you"} · ${isEver(s)?"Top pick":relT(s)}</div>`:""}
 <div class="ph" data-tog><img class="loading" src="${s.image.src}" alt="${esc(s.title)}" ${i>2?'loading="lazy"':''} decoding="async" width="1200" height="675" onload="this.classList.remove('loading')"><span class="credit">${esc(s.image.credit)}</span></div>
 <div class="body"><div class="lbl">${isNew(s)?'<span class="newB">New</span>':""}${CATLBL[s.cat]}</div>
 <h2 data-tog>${esc(s.title)}</h2><p class="snip" data-tog>${esc(s.snippet)} <span class="see">See more</span></p>${sidesBtn(s,s.id)}
 <div class="meta"><div class="time"><span>${isEver(s)?"Evergreen":relT(s)}</span><span class="likeMark">· Liked</span></div>
 <div class="acts">${actsHTML(s.id)}</div></div></div>
 <div class="xwrap" aria-hidden="true"></div></article>`;}
const actsHTML=(id)=>{const r=id?st.react[id]||0:0;return `<button class="ic listen" aria-label="Listen">${IC.listen}</button><button class="ic likeB${r===1?" on":""}" aria-label="Like" aria-pressed="${r===1}">${r===1?IC.upF:IC.up}</button><button class="ic lessB" aria-label="Less like this" aria-pressed="false">${IC.down}</button><button class="ic saveB${id&&LIB.saved[id]?" on":""}" aria-label="Save" aria-pressed="${!!(id&&LIB.saved[id])}">${id&&LIB.saved[id]?IC.saveF:IC.save}</button><button class="ic shareB" aria-label="Share">${IC.share}</button><button class="ic more" aria-label="More">${IC.more}</button>`;};
let loading=false;
function loadMore(n=5){
 if(loading)return;loading=true;
 if(!queue.length&&!query&&round===0&&!$("#feed .seenT.open")){endCard();loading=false;return;}
 if(!queue.length){
   const pool=STORIES.filter(s=>(tab==="all"||s.cat===tab)&&!query);
   if(!pool.length||query){endNote(query?"No more matches.":"");loading=false;return;}
   round++;shown.clear();rebuild();
   if(!queue.length){loading=false;return;}
   if($("#feed .card")) $("#feed").insertAdjacentHTML("beforeend",`<div class="endnote">That's everything in Seen. Here are some worth another look.</div>`);
 }
 const f=$("#feed");const start=f.querySelectorAll(".card").length;
 const batch=queue.splice(0,n);
 f.insertAdjacentHTML("beforeend",batch.map((s,k)=>cardHTML(s,start+k)).join(""));
 batch.forEach(s=>{shown.add(s.id);observeCard(s.id)});
 if(!queue.length&&!query&&round===0&&!$("#feed .seenT.open"))endCard();
 loading=false;
}
function endCard(){if($("#feed .endCard"))return;const n=SEENQ.length;$("#feed").insertAdjacentHTML("beforeend",`<div class="endCard" role="status"><b>You're done for now ✓</b><span>Next fresh batch around ${nextBatch()}. Pull down any time to reshuffle.</span></div>${n?`<button class="seenT" aria-expanded="false">${IC.chev}<span>Seen · ${n} ${n===1?"story":"stories"} you've scrolled past</span></button>`:""}`);}
function endNote(t){if(t&&!$(".endnote.q"))$("#feed").insertAdjacentHTML("beforeend",`<div class="endnote q">${t}</div>`);}
function openSeen(btn){btn.setAttribute("aria-expanded","true");btn.classList.add("open");btn.disabled=true;btn.insertAdjacentHTML("afterend",`<div class="secH seenH">Seen</div>`);queue=SEENQ;SEENQ=[];logEv("seenOpen",null);loadMore(6);}
document.addEventListener("click",e=>{const b=e.target.closest(".seenT");if(b&&!b.disabled)openSeen(b);});
function resetFeed(){stopSpeak();SEENQ=[];counts();$("#feed").innerHTML=!query?todayHead():"";shown.clear();rebuild();loadMore(6);scrollTo(0,0);}
/* dwell tracking */
const vis={},imp={};
const io=new IntersectionObserver(es=>{es.forEach(e=>{const id=e.target.dataset.id;if(e.target.classList.contains("open"))return;if(e.intersectionRatio>=.6){vis[id]=performance.now();clearTimeout(imp[id]);imp[id]=setTimeout(()=>{if(vis[id])markSeen(id,"view")},1500)}else if(vis[id]){clearTimeout(imp[id]);commitDwell(id,performance.now()-vis[id]);delete vis[id]}})},{threshold:[0,.6]});
function observeCard(id){document.querySelectorAll(`.card[data-id="${id}"]`).forEach(el=>io.observe(el));}
function commitDwell(id,ms){const s=byId[id];if(!s)return;st.seen[id]=(st.seen[id]||0)+1;
 if(ms>2500){const w=Math.min(ms/1000,12)/12*0.6;learn(s,w,"dwell "+Math.round(ms/1000)+"s")}else if(ms<900){learn(s,-0.05,"skip")}else save();}
new IntersectionObserver(es=>{if(es[0].isIntersecting)loadMore(5)},{rootMargin:"1400px 0px"}).observe($("#sentinel"));
let st8=0;addEventListener("scroll",()=>{if(st8)return;st8=setTimeout(()=>{st8=0;if(scrollY+innerHeight>document.documentElement.scrollHeight-1600)loadMore(5)},120)},{passive:true});
addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("#sides").hidden){closeSides();return;}if(!$("#lib").hidden){closeLib();return;}if(!$("#menu").hidden)closeMenu();else if(!$("#sheet").hidden)closeSheet();}});
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
 if(e.target.closest(".likeB")){react(s,1);return;}
 if(e.target.closest(".lessB")){react(s,-1);return;}
 if(e.target.closest(".saveB")){toggleSave(s);return;}
 if(e.target.closest(".srcT")){toggleSrc(card);return;}
 if(e.target.closest(".openStory")){const o=byId[e.target.closest(".openStory").dataset.id];if(o)jumpTo(o);return;}
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
 if(st.react[s.id]===1)LIB.liked[s.id]={s:libCopy(s),t:Date.now()};else delete LIB.liked[s.id];saveLib();
 save();document.querySelectorAll(`.card[data-id="${s.id}"]`).forEach(c=>{c.classList.toggle("liked",st.react[s.id]===1);
  const lb=c.querySelector(".likeB");if(lb){const on=st.react[s.id]===1;lb.classList.toggle("on",on);lb.setAttribute("aria-pressed",on);lb.innerHTML=on?IC.upF:IC.up;lb.classList.remove("pop");void lb.offsetWidth;lb.classList.add("pop");}
  if(st.react[s.id]===-1){const lb2=c.querySelector(".lessB");if(lb2){lb2.classList.add("on");lb2.setAttribute("aria-pressed","true")}setTimeout(()=>removeCard(c),260)}});
 rebuild();
}
function toggleSave(s,silent){const on=!LIB.saved[s.id];if(on)LIB.saved[s.id]={s:libCopy(s),t:Date.now()};else delete LIB.saved[s.id];saveLib();
 if(on)learn(s,1,"save");logEv(on?"save":"unsave",s.id);if(!silent)toast(on?"Saved to Library":"Removed from Saved");
 document.querySelectorAll(`.card[data-id="${s.id}"] .saveB`).forEach(b=>{b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);b.innerHTML=on?IC.saveF:IC.save;b.classList.remove("pop");void b.offsetWidth;b.classList.add("pop");});}
/* Library screen */
let libTab="saved";
function libItems(){const q=$("#libQ").value.trim().toLowerCase();return Object.values(LIB[libTab]).sort((a,b)=>b.t-a.t).map(x=>x.s).filter(s=>!q||[s.title,s.snippet,(s.bullets||[]).join(" "),(s.report||[]).map(r=>r.t).join(" "),CATLBL[s.cat]||s.cat,(s.tags||[]).join(" "),(s.sources||[]).map(x=>x.domain+" "+x.title).join(" ")].join(" ").toLowerCase().includes(q));}
function renderLib(){const items=libItems(),q=$("#libQ").value.trim(),total=Object.keys(LIB[libTab]).length;
 document.querySelectorAll(".libTabs button").forEach(b=>{b.setAttribute("aria-selected",b.dataset.t===libTab);b.innerHTML=(b.dataset.t==="saved"?"Saved":"Liked")+`<span class="n">${Object.keys(LIB[b.dataset.t]).length}</span>`});
 $("#libList").innerHTML=items.length?items.map(s=>`<li class="li" data-id="${s.id}"><button class="open"><img src="${esc(s.image.src)}" alt="" loading="lazy"><span class="tx"><span class="lt">${esc(s.title)}</span><span class="lm"><b>${esc(CATLBL[s.cat]||s.cat)}</b> · ${esc(s.date?new Date(s.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"Evergreen")}</span></span></button><button class="ic rm" aria-label="${libTab==="saved"?"Unsave":"Unlike"}">${IC.x}</button></li>`).join("")
  :`<li class="libEmpty">${total&&q?`<b>No matches</b>Nothing in ${libTab==="saved"?"Saved":"Liked"} matches "${esc(q)}".`:libTab==="saved"?`<b>Nothing saved yet</b>Tap the bookmark on any story to keep it here.`:`<b>No liked stories yet</b>Tap the thumbs-up on stories you enjoy and they'll appear here.`}</li>`;}
function openLib(){closeMenu();$("#lib").hidden=false;document.body.classList.add("lock");renderLib();logEv("library",null);}
function closeLib(){$("#lib").hidden=true;document.body.classList.remove("lock");}
$("#libBtn").onclick=openLib;$(".libClose").onclick=closeLib;
$(".libTabs").onclick=e=>{const b=e.target.closest("button");if(b){libTab=b.dataset.t;renderLib();}};
$("#libQ").addEventListener("input",renderLib);
$("#libList").onclick=e=>{const li=e.target.closest(".li");if(!li)return;const x=LIB[libTab][li.dataset.id];if(!x)return;let s=byId[x.s.id];
 if(e.target.closest(".rm")){if(libTab==="saved")toggleSave(s||x.s);else if(s)react(s,1);else{delete LIB.liked[x.s.id];st.react[x.s.id]=0;save();saveLib();}renderLib();return;}
 if(!s){s=x.s;byId[s.id]=s;}closeLib();jumpTo(s);};
function removeCard(c){if(speaking&&speaking.root===c)stopSpeak();c.style.transition="opacity .3s";c.style.opacity=0;setTimeout(()=>c.remove(),320);}
function notInterested(s){st.hidden[s.id]=1;learn(s,-.8,"not interested");save();document.querySelectorAll(`.card[data-id="${s.id}"]`).forEach(removeCard);rebuild();toast("Hidden. You'll see less like this");}
/* More menu: always the same 4 actions, toggled only by the ⋯ button */
let menuFor=null;
function toggleMenu(btn,s){if(!$("#menu").hidden&&menuFor===btn){closeMenu();return;}openMenu(btn,s);}
function openMenu(btn,s){
 const m=$("#menu"),r=btn.getBoundingClientRect();menuFor=btn;
 m.innerHTML=`<button role="menuitem" data-a="hide">${IC.hide}Not interested</button><button role="menuitem" data-a="copy">${IC.link}Copy link</button><button role="menuitem" data-a="src">${IC.ext}Open original source</button>`;
 m.hidden=false;const mw=230,mh=m.offsetHeight;m.style.left=Math.max(8,Math.min(innerWidth-mw-8,r.right-mw))+"px";
 m.style.top=(r.bottom+mh+8>innerHeight?Math.max(8,r.top-mh-4):r.bottom+4)+"px";
 m.onclick=e=>{const a=e.target.closest("button")?.dataset.a;if(!a)return;closeMenu();
  if(a==="hide")notInterested(s);else if(a==="src"){window.open(s.sources[0].url,"_blank","noopener");logEv("src",s.id);}else copyLink(s);};
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
/* ---------- Listen: pre-generated natural neural-voice MP3 per story (audio/<id>.mp3) ----------
 * play() is called synchronously inside the tap (iOS needs the user gesture). One shared <audio> element.
 * Progress bar + elapsed time, pause/resume, stop, Media Session (lock-screen controls + artwork).
 * Fallback: Web Speech, only when the MP3 can't be loaded (e.g. offline and never played before). */
const AU=new Audio();AU.preload="none";AU.setAttribute("playsinline","");AU.setAttribute("webkit-playsinline","");
const CAN_MP3=(()=>{try{return AU.canPlayType("audio/mpeg")!==""}catch(e){return false}})();
const TTS={q:[],gen:0,voice:null,started:false,warned:false};
const HAS_TTS=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
function pickVoice(){if(!HAS_TTS)return;const vs=speechSynthesis.getVoices()||[];
 TTS.voice=vs.find(v=>/^en[-_](GB|US)/i.test(v.lang)&&/Premium|Enhanced|Neural|Natural|Siri|Ava|Samantha|Google UK English Female|Google US English/i.test(v.name))||vs.find(v=>/^en[-_]GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null;}
if(HAS_TTS){pickVoice();try{speechSynthesis.addEventListener("voiceschanged",pickVoice)}catch(e){speechSynthesis.onvoiceschanged=pickVoice}}
const plain=t=>t.replace(/\[\d+\]/g,"").replace(/\s+/g," ").trim();
function speechText(s){return [s.title+".",plain(s.snippet),...s.bullets.map(plain),s.why?"Why it matters to you. "+s.why:"",s.tryit?"One thing to try. "+s.tryit:""].filter(Boolean);}
function chunkText(parts){const out=[];parts.forEach(p=>p.split(/(?<=[.!?])\s+/).forEach(sn=>{sn=sn.trim();if(!sn)return;
  while(sn.length>220){let k=sn.lastIndexOf(", ",200);if(k<60)k=sn.lastIndexOf(" ",200);if(k<60)k=200;out.push(sn.slice(0,k+1).trim());sn=sn.slice(k+1).trim();}
  if(sn)out.push(sn);}));return out;}
let speaking=null;
const fmt=t=>!isFinite(t)||t<0?"0:00":Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");
function startSpeak(s,root){
 if(speaking&&speaking.id===s.id&&speaking.root===root){pauseResume();return;}
 stopSpeak();
 const gen=++TTS.gen;speaking={id:s.id,root,gen,mode:"audio",paused:false};
 showPlayer(root);
 if(!CAN_MP3){fallbackTTS(s,gen);setMedia(s);learn(s,.4,"listen");logEv("listen",s.id);return;}
 AU.src=s.audio||("audio/"+s.id+".mp3");
 let p;try{p=AU.play();}catch(e){p=Promise.reject(e)}          // synchronous, inside the tap
 if(p&&p.catch)p.catch(err=>{if(!speaking||speaking.gen!==gen)return;
   if(err&&err.name==="AbortError")return;
   if(err&&err.name==="NotAllowedError"){setPlayerState(false);toast("Tap play to start audio");return;}
   fallbackTTS(s,gen);});
 setMedia(s);learn(s,.4,"listen");logEv("listen",s.id);
}
AU.addEventListener("error",()=>{if(speaking&&speaking.mode==="audio"&&AU.getAttribute("src"))fallbackTTS(byId[speaking.id],speaking.gen)});
AU.addEventListener("timeupdate",()=>{if(!speaking||speaking.mode!=="audio")return;const p=speaking.root.querySelector(".player");if(!p)return;
 const d=AU.duration||0;p.querySelector(".bar i").style.width=(d?AU.currentTime/d*100:0)+"%";p.querySelector(".pl").textContent=fmt(AU.currentTime)+(d?" / "+fmt(d):"");});
AU.addEventListener("playing",()=>{if(speaking&&speaking.mode==="audio"){speaking.paused=false;setPlayerState(true)}});
AU.addEventListener("pause",()=>{if(speaking&&speaking.mode==="audio"&&!AU.ended){speaking.paused=true;setPlayerState(false)}});
AU.addEventListener("ended",()=>{if(speaking&&speaking.mode==="audio"){logEv("listen_done",speaking.id);stopSpeak();}});
function setMedia(s){if(!("mediaSession" in navigator))return;try{
 navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:"Feed · "+(CATLBL[s.cat]||""),album:"Feed",artwork:[{src:new URL(s.image.src,location.href).href,sizes:"1200x675",type:"image/jpeg"},{src:new URL("icons/icon-512.png",location.href).href,sizes:"512x512",type:"image/png"}]});
 navigator.mediaSession.setActionHandler("play",()=>{if(speaking&&speaking.paused)pauseResume()});
 navigator.mediaSession.setActionHandler("pause",()=>{if(speaking&&!speaking.paused)pauseResume()});
 navigator.mediaSession.setActionHandler("stop",()=>stopSpeak());
 navigator.mediaSession.setActionHandler("seekbackward",()=>{AU.currentTime=Math.max(0,AU.currentTime-10)});
 navigator.mediaSession.setActionHandler("seekforward",()=>{AU.currentTime=Math.min(AU.duration||0,AU.currentTime+10)});
}catch(e){}}
function fallbackTTS(s,gen){ // only when the MP3 can't load
 if(!speaking||speaking.gen!==gen)return;try{AU.pause();AU.removeAttribute("src");AU.load();}catch(e){}
 if(!HAS_TTS){toast("Audio isn't available offline for this story yet");stopSpeak();return;}
 speaking.mode="tts";const synth=speechSynthesis;synth.cancel();if(!TTS.voice)pickVoice();
 const chunks=chunkText(speechText(s));
 TTS.q=chunks.map((text,i)=>{const u=new SpeechSynthesisUtterance(text);u.lang=(TTS.voice&&TTS.voice.lang)||"en-GB";if(TTS.voice)u.voice=TTS.voice;u.rate=1;
  u.onstart=()=>{if(gen!==TTS.gen)return;TTS.started=true;const p=speaking&&speaking.root.querySelector(".player .bar i");if(p)p.style.width=(i/chunks.length*100)+"%";};
  u.onend=()=>{if(gen!==TTS.gen)return;if(i===chunks.length-1)stopSpeak();};
  u.onerror=ev=>{if(gen!==TTS.gen)return;const er=ev&&ev.error;if(er==="interrupted"||er==="canceled")return;stopSpeak();toast("Couldn't play audio");};return u;});
 for(const u of TTS.q)synth.speak(u);if(synth.paused)synth.resume();
 const pl=speaking.root.querySelector(".player .pl");if(pl)pl.textContent="Device voice";logEv("tts_fallback",s.id);
}
function pauseResume(){if(!speaking)return;
 if(speaking.mode==="audio"){if(AU.paused){const p=AU.play();if(p&&p.catch)p.catch(()=>{});speaking.paused=false;}else{AU.pause();speaking.paused=true;}}
 else if(HAS_TTS){if(speaking.paused){speechSynthesis.resume();speaking.paused=false}else{speechSynthesis.pause();speaking.paused=true}}
 setPlayerState(!speaking.paused);}
function stopSpeak(){TTS.gen++;const was=speaking;speaking=null;
 try{if(!AU.paused)AU.pause();if(AU.getAttribute("src")){AU.removeAttribute("src");AU.load();}}catch(e){}
 try{if(HAS_TTS&&was&&was.mode==="tts")speechSynthesis.cancel()}catch(e){}
 TTS.q=[];resetPlayerUI();if("mediaSession" in navigator)try{navigator.mediaSession.playbackState="none"}catch(e){}}
function showPlayer(root){const a=root.querySelector(".acts");
 a.innerHTML=`<div class="player" role="group" aria-label="Audio player"><span class="wave" aria-hidden="true"><b></b><b></b><b></b></span><span class="bar" aria-hidden="true"><i></i></span><span class="pl">0:00</span><button class="ic ppB" aria-label="Pause">${IC.pause}</button><button class="ic stopB" aria-label="Stop">${IC.stop}</button></div>`;}
function setPlayerState(playing){const p=speaking&&speaking.root.querySelector(".player");if(!p)return;p.classList.toggle("paused",!playing);const b=p.querySelector(".ppB");b.innerHTML=playing?IC.pause:IC.play;b.setAttribute("aria-label",playing?"Pause":"Play");
 if("mediaSession" in navigator)try{navigator.mediaSession.playbackState=playing?"playing":"paused"}catch(e){}}
function resetPlayerUI(){document.querySelectorAll(".card .player").forEach(p=>{const c=p.closest(".card");p.parentElement.innerHTML=actsHTML(c&&c.dataset.id)});}
addEventListener("pagehide",()=>{if(speaking)stopSpeak()});
/* ---------- in-place expansion ---------- */
function chips(text,s){ // "[1][2]" → one tiny inline cite: favicon + short domain (+1)
 return esc(text).replace(/(?:\[\d+\])+/g,run=>{const ns=[...new Set([...run.matchAll(/\d+/g)].map(m=>+m[0]))].filter(n=>s.sources[n-1]);if(!ns.length)return"";
  const f=s.sources[ns[0]-1];return `<a class="cite" href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(f.title)}"><img src="${fav(f.domain)}" alt="" width="11" height="11">${esc(srcName(f.domain))}${ns.length>1?" +"+(ns.length-1):""}</a>`;});}
function srcBlock(s){const fs=[...new Set(s.sources.map(x=>x.domain))].slice(0,3);
 return `<button class="srcT" aria-expanded="false"><span class="favs">${fs.map(d=>`<img src="${fav(d)}" alt="" width="16" height="16">`).join("")}</span><span>Sources · ${s.sources.length}</span>${IC.chev}</button>
 <ol class="srcList" hidden>${s.sources.map((x,i)=>`<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><span class="n">${i+1}</span><img src="${fav(x.domain)}" alt="" width="14" height="14"><span class="sd">${esc(srcName(x.domain))}</span><span class="st">${esc(x.title)}</span></a></li>`).join("")}</ol>`;}
function toggleSrc(card){const b=card.querySelector(".srcT"),l=card.querySelector(".srcList"),w=card.querySelector(".xwrap");const open=b.getAttribute("aria-expanded")==="true";
 b.setAttribute("aria-expanded",!open);l.hidden=open;w.style.height="auto";if(!open)logEv("sources",card.dataset.id);}
const repWords=s=>(s.report||[]).reduce((a,x)=>a+x.t.split(/\s+/).length,0)+((s.why||"")+" "+(s.tryit||"")).split(/\s+/).length;
function expHTML(s){
 const rq=s.qa.map(x=>x[0]).slice(0,5);const mins=Math.max(1,Math.round(repWords(s)/220));
 return `<div class="x"><ul class="bul">${s.bullets.map(b=>`<li>${chips(b,s)}</li>`).join("")}</ul>
 ${srcBlock(s)}
 <button class="repT" aria-expanded="false"><span>Quick read · ${mins} min</span>${IC.chev}</button>
 <div class="rwrap"><div class="rbody">${(s.report||[]).map(x=>`<h3>${esc(x.h)}</h3><p>${chips(x.t,s)}</p>`).join("")}
  ${s.why?`<div class="why"><b>Why it matters to you</b><p>${esc(s.why)}</p></div>`:""}
  ${s.tryit?`<div class="try"><b>Try this</b><p>${esc(s.tryit)}</p></div>`:""}
  ${/health|peptide|sexual|weight|skin|hair|men's/.test(s.tags.join(" "))&&s.cat!=="calm"?`<p class="disc">General information from the sources above, not medical advice.</p>`:""}
  ${/tax|money|deals|business|savings/.test(s.tags.join(" "))?`<p class="disc">General information, not financial or tax advice.</p>`:""}</div></div>
 <div class="sect">Related</div><ul class="rel">${rq.map(q=>`<li><button class="relQ" data-q="${esc(q)}">${esc(q)}<span>+</span></button></li>`).join("")}</ul>
 <div class="photoCredit">Photo: ${esc(s.image.credit)}${s.image.license?" · "+esc(s.image.license):""} · <a href="${esc(s.image.page)}" target="_blank" rel="noopener">${/commons\.wikimedia/.test(s.image.page||"")?"Wikimedia Commons":"Publisher"}</a></div>
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
 animH(w,"auto");st.opened[s.id]=(st.opened[s.id]||0)+1;markSeen(s.id,"open");learn(s,.5,"expand");logEv("open",s.id);
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
 b.classList.toggle("on",!open);
 w.style.height="auto";animH(r,open?0:"auto");if(!open){learn(s,.3,"quick read");logEv("report",s.id);}}
/* ---------- ask follow-up: every question gets a visible answer, instantly ----------
 * 1) pre-written Q&As from the sources  2) intents (sources / simple / why / try)  3) local retrieval over the story
 * (bullets, quick read, Q&As) with chips  4) other Feed stories that match  5) graceful "not in these sources" card
 * with one-tap Perplexity/Grok search + a live Wikipedia lookup (keyless, CORS) appended when it arrives. */
const STOP=new Set("a an the is are was were be been to of and or in on at for with it its it's this that these those what whats why how who whom when where which do does did can could would should will shall may might i im i'm you me my your yours about from by as into than then there their they them he she his her we our us more most very just so not no yes much many get got have has had if any some tell explain mean means really also like one thing things".split(" "));
const stem=w=>w.replace(/'s$/,"").replace(/(ies)$/,"y").replace(/(ing|ed|es|s)$/,"");
const words=t=>t.toLowerCase().replace(/[^a-z0-9£$€%\s-]/g," ").split(/[\s-]+/).filter(w=>w.length>1&&!STOP.has(w)).map(stem).filter(w=>w.length>1);
let DF=null;function df(){if(DF)return DF;DF={};STORIES.forEach(s=>{new Set(words(docText(s))).forEach(w=>DF[w]=(DF[w]||0)+1)});return DF;}
const idf=w=>Math.log(1+STORIES.length/(1+(df()[w]||0)));
const docText=s=>[s.title,s.snippet,s.tags.join(" "),...s.bullets,...(s.report||[]).map(x=>x.h+". "+x.t),s.why||"",s.tryit||"",...s.qa.map(x=>x.join(" "))].join(" ");
function sentencesOf(s){const out=[];const push=(t,kind)=>t.split(/(?<=[.!?](?:\[\d+\])*)\s+(?=[A-Z0-9'"‘£$])/).forEach(x=>{x=x.trim();if(x.length>12)out.push({t:x,kind})});
 s.bullets.forEach(b=>push(b,"b"));(s.report||[]).forEach(x=>push(x.t,"r"));s.qa.forEach(([q,a])=>push(a,"qa"));if(s.why)push(s.why,"w");return out;}
function overlap(qw,t){const tw=new Set(words(t));let sc=0,n=0;qw.forEach(w=>{if(tw.has(w)){sc+=idf(w);n++}});return{sc,n};}
function cite(t,s){return chips(t,s)}
function answer(s,q){
 const qw=[...new Set(words(q))];const ql=q.toLowerCase();
 // 1) curated Q&A (exact or strong overlap)
 let best=null,bs=0;s.qa.forEach(([qq,a])=>{if(qq.toLowerCase().replace(/[?.!\s]+$/,"")===ql.replace(/[?.!\s]+$/,"")){best=a;bs=9;return}
  const w=[...new Set(words(qq))];const hit=w.filter(x=>qw.includes(x));const o=hit.reduce((a,x)=>a+idf(x),0)/Math.max(1e-6,w.reduce((a,x)=>a+idf(x),0));
  const cov=qw.length?hit.length/qw.length:0;const sc=Math.min(o,1)*.6+cov*.4;if(sc>bs){bs=sc;best=a}});
 if(bs>=.62)return{html:cite(best,s),conf:"high"};
 // 2) intents
 if(/\b(source|sources|cite|citation|evidence|proof|where.*(from|read|info))\b/.test(ql))return{html:"This story uses: "+s.sources.map((x,i)=>`<a class="cite" href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${fav(x.domain)}" alt="" width="11" height="11">${esc(srcName(x.domain))}</a> ${esc(x.title)}`).join("; ")+".",conf:"high"};
 if(/\b(simpl|eli5|tl;?dr|summar|in short|short version|gist|main point|key point)/.test(ql)||/explain (it|this)( simply)?\??$/.test(ql))return{html:esc(s.snippet)+" "+cite(s.bullets[0],s),conf:"high"};
 if(/\b(matter|relevant|why should i care|so what|affect me|for me|mean for me|impact on me)\b/.test(ql)&&s.why)return{html:esc(s.why)+(s.bullets[1]?" "+cite(s.bullets[1],s):""),conf:"high"};
 if(/\b(what (can|should) i do|try|practical|takeaway|action|next step|how (can|do) i (use|apply|start))\b/.test(ql)&&s.tryit)return{html:esc(s.tryit),conf:"high"};
 // 3) retrieval inside this story
 if(qw.length){const ranked=sentencesOf(s).map(x=>Object.assign(x,overlap(qw,x.t))).filter(x=>x.n>0).sort((a,b)=>b.sc-a.sc||(a.kind==="qa"?-1:1));
  const top=ranked[0];const qmax=qw.reduce((a,w)=>a+idf(w),0);
  if(top&&(top.n>=2||top.sc/qmax>=.55)&&top.sc>=1.6){const pick=[top];const second=ranked.find(x=>x!==top&&x.t!==top.t&&x.sc>=top.sc*.6);if(second)pick.push(second);
   return{html:pick.map(x=>cite(x.t,s)).join(" "),conf:top.sc/qmax>=.6?"high":"mid"};}
  if(bs>=.45)return{html:cite(best,s),conf:"mid"};}
 return{html:"",conf:"low"};
}
function otherStories(s,q){const qw=[...new Set(words(q))];if(!qw.length)return[];const qmax=qw.reduce((a,w)=>a+idf(w),0);
 return STORIES.filter(x=>x!==s).map(x=>({x,...overlap(qw,x.title+" "+x.tags.join(" ")+" "+x.snippet+" "+x.bullets.join(" "))})).filter(r=>r.sc/qmax>=.5&&r.sc>=2).sort((a,b)=>b.sc-a.sc).slice(0,2).map(r=>r.x);}
/* hand-off to other AIs: a context-rich prompt (story title + summary + source + question), copied first (Safari-safe), then the official deep link */
const AIS=[["perplexity","Perplexity","https://www.perplexity.ai/search?q="],["chatgpt","ChatGPT","https://chatgpt.com/?q="],["claude","Claude","https://claude.ai/new?q="],["grok","Grok","https://grok.com/?q="]];
function sumOf(s){const t=plain(s.snippet)+" "+s.bullets.map(plain).join(" ");const ss=t.split(/(?<=[.!?])\s+/).filter(Boolean);let out="";for(const x of ss){if((out+" "+x).length>520||out.split(/(?<=[.!?])\s+/).length>=3&&out)break;out=(out?out+" ":"")+x;}return out||plain(s.snippet);}
function handoffPrompt(s,q){const src=s.sources&&s.sources[0]?s.sources[0].url:"";
 let sum=sumOf(s);const mk=()=>`I'm reading a story: "${s.title}". Summary: ${sum} ${src?"Source: "+src+". ":""}My question: ${q} Please answer with current, reliable sources.`;
 let t=mk();while(t.length>1500&&sum.length>80){sum=sum.slice(0,sum.length-80).replace(/\s\S*$/,"")+"…";t=mk();}return t.slice(0,1500);}
const extBtns=(q,s)=>{s=s||byId[$("#sheet").dataset.id];const P=s?handoffPrompt(s,q):q;
 return `<div class="ext"><span class="extL">Ask elsewhere</span><div class="extR">${AIS.map(([k,n,u])=>`<a class="extB ai-${k}" data-ai="${k}" href="${esc(u+encodeURIComponent(P))}" target="_blank" rel="noopener noreferrer">${n}</a>`).join("")}<button class="extB copyQ" data-p="${esc(P)}">Copy with context</button></div></div>`;};
document.addEventListener("click",e=>{const a=e.target.closest(".ext .extB");if(!a)return;const P=a.dataset.p||a.closest(".ext").querySelector(".copyQ").dataset.p;
 if(a.classList.contains("copyQ")){e.preventDefault();copyText(P).then(ok=>toast(ok?"Question copied with story context":"Couldn't copy"));logEv("handoff_copy",$("#sheet").dataset.id);return;}
 copyText(P);toast("Opening "+a.textContent+" · question also copied");logEv("handoff",$("#sheet").dataset.id,{ai:a.dataset.ai});});
async function liveWiki(q,ms){ // Wikipedia search+extract: free, no key, CORS (origin=*)
 const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),ms);
 try{const term=words(q).join(" ")||q;const u="https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=1&gsrsearch="+encodeURIComponent(term)+"&prop=extracts|info&exintro=1&explaintext=1&exsentences=3&inprop=url&redirects=1";
  const r=await fetch(u,{signal:ctl.signal});const j=await r.json();const p=j.query&&Object.values(j.query.pages)[0];if(!p||!p.extract)return null;
  return{title:p.title,url:p.fullurl,text:p.extract.replace(/\s+/g," ").trim()};}catch(e){return null}finally{clearTimeout(t)}}
let skipPop=false;addEventListener("popstate",()=>{if(skipPop){skipPop=false;return;}if(!$("#sheet").hidden)closeSheet(true);});
function openSheet(s,firstQ){
 closeMenu();const sh=$("#sheet");sh.hidden=false;document.body.classList.add("lock");sh.dataset.id=s.id;
 $("#chat").innerHTML=`<div class="msg bot">Ask me anything about <b>${esc(s.title)}</b>. I answer from this story's sources, and point you to a live search when they don't cover it.</div>`;
 const sug=[...s.qa.map(x=>x[0]),s.why?"Why does this matter to me?":"","What are the sources?"].filter(Boolean).slice(0,6);
 $("#sugg").innerHTML=sug.map(q=>`<button>${esc(q)}</button>`).join("");
 $("#sugg").onclick=e=>{const b=e.target.closest("button");if(b)ask(s,b.textContent)};
 $("#askForm").onsubmit=e=>{e.preventDefault();const v=$("#askIn").value.trim();if(v){askLive(s,v);$("#askIn").value="";$("#askIn").blur()}};
 sh.querySelector(".scrim").onclick=()=>closeSheet();sh.querySelector(".close").onclick=()=>closeSheet();
 history.pushState({sheet:1},"",location.hash||"#"+s.id);logEv("ask_open",s.id);
 if(firstQ)ask(s,firstQ);
}
function ask(s,q){
 const c=$("#chat");c.insertAdjacentHTML("beforeend",`<div class="msg me">${esc(q)}</div>`);
 const a=answer(s,q);const others=otherStories(s,q);const id="a"+Date.now()+Math.floor(Math.random()*1e3);
 const rel=others.length?`<div class="also">Also in Feed: ${others.map(o=>`<button class="openStory" data-id="${o.id}">${esc(o.title)}</button>`).join("")}</div>`:"";
 let html;
 if(a.conf==="high")html=`${a.html}<small>From this story's sources</small>${extBtns(q,s)}${rel}`;
 else if(a.conf==="mid")html=`${a.html}<small>Closest match in this story's sources. Want more depth?</small>${extBtns(q,s)}${rel}`;
 else html=`<p class="nb">This story's sources don't cover that directly. Here's what they do say: ${esc(s.snippet)}</p>${rel}<div class="live" id="${id}"><span class="dot"></span>Checking Wikipedia…</div>${extBtns(q,s)}`;
 c.insertAdjacentHTML("beforeend",`<div class="msg bot ${a.conf}">${html}</div>`);
 c.scrollTop=c.scrollHeight;learn(s,.6,"ask");logEv("ask",s.id,{q,conf:a.conf});
 c.querySelectorAll(".openStory").forEach(b=>b.onclick=()=>{const o=byId[b.dataset.id];closeSheet();if(o)jumpTo(o)});
 if(a.conf==="low")liveWiki(q,4000).then(w=>{const el=document.getElementById(id);if(!el)return;
  el.outerHTML=w?`<div class="live ok"><b>Live from Wikipedia: ${esc(w.title)}</b><p>${esc(w.text.length>420?w.text.slice(0,420).replace(/\s\S*$/,"")+"…":w.text)}</p><a class="cite" href="${esc(w.url)}" target="_blank" rel="noopener"><img src="${fav("en.wikipedia.org")}" alt="" width="11" height="11">wikipedia</a> <span class="warn">Automatic match. Check it fits your question.</span></div>`:`<div class="live none">No live result right now${navigator.onLine===false?" (you're offline)":""}.</div>`;
  if(c.scrollHeight-c.scrollTop-c.clientHeight<200)c.scrollTop=c.scrollHeight;});
}
/* live AI answer via Cloudflare Worker (Gemini); falls back to the local chain above on any failure */
const ASK_API="https://feed-ask.juniorfeed.workers.dev/";
const storyText=s=>[s.snippet,...s.bullets,...(s.report||[]).map(x=>x.h+". "+x.t),s.why?"Why it matters: "+s.why:"",s.tryit?"Try: "+s.tryit:"",...s.qa.map(x=>"Q: "+x[0]+" A: "+x[1])].filter(Boolean).join("\n").replace(/\[\d+\]/g,"");
function chatHistory(){return [...$("#chat").querySelectorAll(".msg")].slice(1).slice(-6).map(m=>({role:m.classList.contains("me")?"me":"bot",text:m.innerText.slice(0,400)}));}
function fmtAnswer(t){const lines=t.split(/\n+/).map(x=>x.trim()).filter(Boolean);const bl=lines.filter(x=>/^[-*•]\s+/.test(x));
 if(bl.length>=2){const pre=lines.filter(x=>!/^[-*•]\s+/.test(x));return pre.map(x=>`<p>${esc(x)}</p>`).join("")+`<ul class="aiList">${bl.map(x=>`<li>${esc(x.replace(/^[-*•]\s+/,""))}</li>`).join("")}</ul>`;}
 return `<p>${esc(lines.join(" "))}</p>`;}
async function askLive(s,q){
 const c=$("#chat");const hist=chatHistory();c.insertAdjacentHTML("beforeend",`<div class="msg me">${esc(q)}</div>`);
 const id="L"+Date.now();c.insertAdjacentHTML("beforeend",`<div class="msg bot ai loading" id="${id}"><span class="typing"><i></i><i></i><i></i></span><span class="lt">Thinking…</span></div>`);c.scrollTop=c.scrollHeight;
 const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),15000);let j=null;
 try{const r=await fetch(window.__ASK_API||ASK_API,{method:"POST",cache:"no-store",signal:ctl.signal,headers:{"content-type":"application/json"},body:JSON.stringify({question:q,story:{title:s.title,text:storyText(s),sources:s.sources},history:hist})});
  if(r.ok){j=await r.json();if(!j||!j.answer)j=null}}catch(e){j=null}finally{clearTimeout(t)}
 const el=document.getElementById(id);if(!el)return;
 if(!j){el.remove();c.lastElementChild&&c.lastElementChild.classList.contains("me")&&c.lastElementChild.remove();logEv("ask_live_fail",s.id);ask(s,q);return;}
 const src=(j.sources||[]).slice(0,3);
 el.classList.remove("loading");el.innerHTML=fmtAnswer(j.answer)+(src.length?`<div class="aiSrc">${src.map(x=>`<a class="cite" href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${fav(x.domain)}" alt="" width="11" height="11">${esc(srcName(x.domain))}</a>`).join("")}</div>`:"")+`<small>${j.capped?"Daily limit reached":"AI answer"+(j.fromStory===false?" from general knowledge, not this story":" based on this story")}. Double-check anything important.</small>`+extBtns(q,s);
 if(c.scrollHeight-c.scrollTop-c.clientHeight<400)el.scrollIntoView({block:"nearest"});
 learn(s,.6,"ask");logEv("ask",s.id,{q,conf:"live"});}
function jumpTo(s){let c=$(`.card[data-id="${s.id}"]`);if(!c){const f=$("#feed");const cur=[...f.querySelectorAll(".card")].find(x=>x.getBoundingClientRect().bottom>0);
  const html=cardHTML(s,1);if(cur)cur.insertAdjacentHTML("afterend",html);else f.insertAdjacentHTML("afterbegin",html);shown.add(s.id);observeCard(s.id);c=$(`.card[data-id="${s.id}"]`);}
 expand(c,s);setTimeout(()=>{scrollBy({top:c.getBoundingClientRect().top-($("#top").offsetHeight+8),behavior:reduce?"auto":"smooth"})},60);}
function closeSheet(silent){const sh=$("#sheet");if(sh.hidden)return;sh.hidden=true;document.body.classList.remove("lock");if(!silent&&history.state&&history.state.sheet){skipPop=true;history.back();}}
/* ---------- wellbeing nudge ---------- */
let active=0,lastTick=Date.now();
setInterval(()=>{const now=Date.now();if(!document.hidden&&now-lastAct<60000)active+=now-lastTick;lastTick=now;
 if(!st.nudgeOff&&active>15*60000&&!nudged){nudged=true;showNudge();}},5000);
let lastAct=Date.now(),nudged=false;["scroll","touchstart","click","keydown"].forEach(ev=>addEventListener(ev,()=>lastAct=Date.now(),{passive:true}));
function showNudge(){const n=$("#nudge");n.innerHTML=`<div class="box"><div class="orb"></div><h3>You've been here 15 min</h3><p>Take a breath? Breathe in as the circle grows, out as it shrinks.</p><div class="btns"><button class="btn" id="nKeep">Keep going</button><button class="btn pri" id="nDone">I'm good, close</button></div><p style="margin:14px 0 0;font-size:12px"><button id="nOff" style="color:var(--mut);text-decoration:underline">Don't remind me</button></p></div>`;
 n.hidden=false;$("#nKeep").onclick=()=>{n.hidden=true;active=0;nudged=false};$("#nDone").onclick=()=>{n.hidden=true;active=0;nudged=false;toast("Nice. See you later 👋")};$("#nOff").onclick=()=>{st.nudgeOff=true;save();n.hidden=true};logEv("nudge",null);}
window.__feed={lib:LIB,refresh,isNew:id=>isNew(byId[id]),prevVisit:PREV_VISIT,handoffPrompt:(id,q)=>handoffPrompt(byId[id],q),stories:()=>STORIES,st,showNudge,answer:(id,q)=>answer(byId[id],q),queue:()=>queue.map(s=>s.id),tts:TTS,audio:AU,speaking:()=>speaking,chunkText,speechText:id=>speechText(byId[id])};
/* ---------- boot ---------- */
function setData(list){list.forEach(x=>{if(st.react[x.id]===1&&!LIB.liked[x.id])LIB.liked[x.id]={s:libCopy(x),t:Date.now()}});saveLib();STORIES=prune(list);byId={};STORIES.forEach(x=>byId[x.id]=x);DF=null;NEWEST=Math.max(0,...STORIES.map(tAdded));updStamp();}
function updStamp(){const el=$("#upd");if(el)el.textContent=NEWEST?"Updated "+ago(NEWEST):"";}
setInterval(updStamp,60000);
async function getStories(fresh){let r;
 try{r=await fetch("data/stories.json"+(fresh?"?t="+Date.now():""),{cache:fresh?"reload":"no-cache"});if(!r.ok)throw 0;}
 catch(e){r=await caches.match("data/stories.json",{ignoreSearch:true});}
 return r.json();}
let refreshing=false;
async function refresh(manual){if(refreshing)return;refreshing=true;$("#refreshBtn").classList.add("spin");
 try{const before=new Set(STORIES.map(x=>x.id));const list=await getStories(true);setData(list);
  const addL=STORIES.filter(x=>!before.has(x.id));addL.forEach(x=>JUSTIN.add(x.id));const added=addL.length;
  st.sessions++;save(); // reshuffle: new rotation + jitter seed
  round=0;resetFeed();
  if(manual)toast(added?`${added} new ${added===1?"story":"stories"} at the top`:(UNSEENN?`Reshuffled · ${UNSEENN} unread`:`Reshuffled · next batch ${nextBatch()}`));logEv("refresh",null,{added});}
 catch(e){if(manual)toast("Couldn't refresh. Check your connection");}
 finally{refreshing=false;$("#refreshBtn").classList.remove("spin");}}
$("#refreshBtn").onclick=()=>refresh(true);
let hiddenAt=0;document.addEventListener("visibilitychange",()=>{if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>30*6e4&&$("#sheet").hidden)refresh(false);});
/* pull to refresh */
(()=>{let y0=null,dy=0;const pt=$("#ptr");
 addEventListener("touchstart",e=>{y0=(scrollY<=0&&$("#sheet").hidden&&e.touches.length===1)?e.touches[0].clientY:null;dy=0;},{passive:true});
 addEventListener("touchmove",e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy>0&&scrollY<=0){pt.style.height=Math.min(dy*.5,70)+"px";pt.classList.toggle("ready",dy>120);}},{passive:true});
 addEventListener("touchend",()=>{if(y0==null)return;const go=dy>120;y0=null;pt.style.height="";pt.classList.remove("ready");if(go)refresh(true);},{passive:true});})();
/* ---------- boot ---------- */
(async()=>{
 $("#feed").innerHTML='<div class="skel"></div><div class="skel"></div>';
 setData(await getStories(false));
 localStorage.setItem(VKEY,String(Date.now()));
 counts();
 renderTabs();$("#feed").innerHTML=todayHead();rebuild();
 const hid=location.hash.slice(1).split("/")[0];
 if(byId[hid]){queue=[byId[hid],...queue.filter(x=>x.id!==hid)];}
 loadMore(6);
 if(byId[hid]){const c=$(`.card[data-id="${hid}"]`);if(c)expand(c,byId[hid]);}
 if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
