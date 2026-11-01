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
/* ---------- state & preference model ---------- */
const LS="feed.v1";
const st=Object.assign({cat:{},tag:{},react:{},seen:{},opened:{},dwell:{},sessions:0,nudgeOff:false},JSON.parse(localStorage.getItem(LS)||"{}"));
const save=()=>localStorage.setItem(LS,JSON.stringify(st));
st.sessions++;save();
let STORIES=[],byId={},tab="all",query="",queue=[],shown=new Set(),round=0,current=null;
const evq=[];
function logEv(type,id,extra){evq.push(Object.assign({t:Date.now(),type,id},extra||{}));}
function flush(){if(!evq.length)return;const body=JSON.stringify(evq.splice(0));try{navigator.sendBeacon?navigator.sendBeacon("api/events",new Blob([body],{type:"application/json"})):fetch("api/events",{method:"POST",body,keepalive:true})}catch(e){}}
setInterval(flush,15000);addEventListener("pagehide",flush);document.addEventListener("visibilitychange",()=>{if(document.hidden)flush()});
function learn(s,w,why){st.cat[s.cat]=clamp((st.cat[s.cat]||0)+w,-6,8);s.tags.forEach(t=>st.tag[t]=clamp((st.tag[t]||0)+w*.5,-5,6));save();logEv("learn",s.id,{w:+w.toFixed(2),why});}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function score(s){let v=(st.cat[s.cat]||0)*1.0+s.tags.reduce((a,t)=>a+(st.tag[t]||0),0)*.6;
 if(st.react[s.id]===-1)v-=50; if(st.seen[s.id])v-=4; if(st.opened[s.id])v-=3; if(s.cat==="news")v+=.8;
 return v+jit(s.id);}
function jit(id){let h=round*7919+st.sessions*104729;for(const c of id)h=(h*31+c.charCodeAt(0))|0;return ((h>>>0)%1000)/1000*1.6;}
function rebuild(){
 let pool=STORIES.filter(s=>(tab==="all"||s.cat===tab)&&(!query||(s.title+" "+s.snippet+" "+s.tags.join(" ")+" "+s.bullets.join(" ")).toLowerCase().includes(query)));
 pool=pool.filter(s=>!shown.has(s.id));
 pool.sort((a,b)=>score(b)-score(a));
 // diversity: avoid same category twice in a row in For You
 if(tab==="all"){const out=[];const rest=pool.slice();let l1=feedLastCat(),l2=null;while(rest.length){let i=(l1&&l1===l2)?rest.findIndex(s=>s.cat!==l1):0;if(i<0)i=0;const s=rest.splice(i,1)[0];out.push(s);l2=l1;l1=s.cat;}pool=out;}
 queue=pool;
}
function feedLastCat(){const c=$("#feed").lastElementChild;return c&&c.dataset.cat;}
/* ---------- rendering ---------- */
const fav=d=>`fav/${d}.png`;
function rel(d){if(!d)return"Evergreen";const days=Math.round((Date.now()-new Date(d+"T12:00:00"))/864e5);if(days<=0)return"Today";if(days===1)return"Yesterday";if(days<7)return days+"d ago";if(days<30)return Math.round(days/7)+"w ago";return"Evergreen";}
function cardHTML(s,i){
 const favs=[...new Set(s.sources.map(x=>x.domain))];
 return `<article class="card ${st.react[s.id]===1?"liked":""}" data-id="${s.id}" data-cat="${s.cat}" tabindex="0">
 <div class="ph"><img class="loading" src="${s.image.src}" alt="" ${i>2?'loading="lazy"':''} decoding="async" width="1200" height="675" onload="this.classList.remove('loading')"><span class="credit">📷 ${esc(s.image.credit)}</span></div>
 <div class="body"><span class="tag c-${s.cat}"><i></i>${CATLBL[s.cat]}</span>
 <h2>${esc(s.title)}</h2><p class="snip">${esc(s.snippet)}</p>
 <div class="meta"><div class="left"><span class="favs">${favs.map(d=>`<img src="${fav(d)}" alt="">`).join("")}</span><span>${rel(s.date)} · ${s.sources.length} source${s.sources.length>1?"s":""}</span><span class="likeMark">♥ Liked</span></div>
 <div class="acts"><button class="ic listen" aria-label="Listen">${IC.listen}</button><button class="ic more" aria-label="More">${IC.more}</button></div></div></div></article>`;}
let loading=false;
function loadMore(n=5){
 if(loading)return;loading=true;
 if(!queue.length){ // endless: start a new round, unseen first, then resurface
   const pool=STORIES.filter(s=>(tab==="all"||s.cat===tab)&&!query);
   if(!pool.length||query){endNote(query?"No more matches.":"");loading=false;return;}
   round++;shown.clear();rebuild();
   if($("#feed").children.length) $("#feed").insertAdjacentHTML("beforeend",`<div class="endnote">You're all caught up on new stories ✨ Here are some worth another look.</div>`);
 }
 const f=$("#feed");const start=f.querySelectorAll(".card").length;
 const batch=queue.splice(0,n);
 f.insertAdjacentHTML("beforeend",batch.map((s,k)=>cardHTML(s,start+k)).join(""));
 batch.forEach(s=>{shown.add(s.id);observeCard(s.id)});
 loading=false;
}
function endNote(t){if(t&&!$(".endnote.q"))$("#feed").insertAdjacentHTML("beforeend",`<div class="endnote q">${t}</div>`);}
function resetFeed(){$("#feed").innerHTML="";shown.clear();rebuild();loadMore(6);scrollTo(0,0);}
/* dwell tracking in feed */
const vis={};
const io=new IntersectionObserver(es=>{es.forEach(e=>{const id=e.target.dataset.id;if(e.intersectionRatio>=.6){vis[id]=performance.now()}else if(vis[id]){commitDwell(id,performance.now()-vis[id]);delete vis[id]}})},{threshold:[0,.6]});
function observeCard(id){const el=$(`.card[data-id="${id}"]`);if(el)io.observe(el);}
function commitDwell(id,ms){const s=byId[id];if(!s)return;st.seen[id]=(st.seen[id]||0)+1;
 if(ms>2500){const w=Math.min(ms/1000,12)/12*0.6;learn(s,w,"dwell "+Math.round(ms/1000)+"s")}else if(ms<900){learn(s,-0.05,"skip")}else save();}
new IntersectionObserver(es=>{if(es[0].isIntersecting)loadMore(5)},{rootMargin:"1400px 0px"}).observe($("#sentinel"));
let st8=0;addEventListener("scroll",()=>{if(st8)return;st8=setTimeout(()=>{st8=0;if(scrollY+innerHeight>document.documentElement.scrollHeight-1600)loadMore(5)},120)},{passive:true});
addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("#menu").hidden)closeMenu();else if(!$("#sheet").hidden)closeSheet();else if(!$("#detail").hidden)history.back();}});
/* ---------- tabs & search ---------- */
function renderTabs(){$("#tabs").innerHTML=Object.entries(CATS).map(([k,v])=>`<button class="tab" role="tab" data-k="${k}" aria-selected="${k===tab}">${v}</button>`).join("");}
$("#tabs").addEventListener("click",e=>{const b=e.target.closest(".tab");if(!b)return;tab=b.dataset.k;renderTabs();b.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"});resetFeed();logEv("tab",null,{tab});});
$("#searchBtn").onclick=()=>{$("#searchRow").hidden=false;$("#q").focus();};
$("#searchClose").onclick=()=>{$("#searchRow").hidden=true;$("#q").value="";query="";resetFeed();};
let qt;$("#q").addEventListener("input",e=>{clearTimeout(qt);qt=setTimeout(()=>{query=e.target.value.trim().toLowerCase();resetFeed();},250)});
/* ---------- feed interactions ---------- */
$("#feed").addEventListener("click",e=>{
 const card=e.target.closest(".card");if(!card)return;const s=byId[card.dataset.id];
 if(e.target.closest(".more")){openMenu(e.target.closest(".more"),s);return;}
 if(e.target.closest(".listen")||e.target.closest(".player")){listenCtl(e,s,card);return;}
 openDetail(s,card);
});
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200);}
function react(s,v){
 const prev=st.react[s.id]||0; if(prev===v){st.react[s.id]=0;learn(s,v===1?-1.5:2,"undo");toast("Removed");}
 else{st.react[s.id]=v;learn(s,v===1?2.5+(prev?2:0):-2-(prev?1.5:0),v===1?"like":"dislike");
  toast(v===1?`More ${CATLBL[s.cat].toLowerCase()} stories coming up`:`Got it, fewer like this`);}
 save();document.querySelectorAll(`.card[data-id="${s.id}"]`).forEach(c=>{c.classList.toggle("liked",st.react[s.id]===1);
  if(st.react[s.id]===-1){c.style.transition="opacity .3s,max-height .4s";c.style.opacity=0;setTimeout(()=>c.remove(),320)}});
 rebuild(); // reorder upcoming cards immediately
 updateDetailReact(s);
}
function openMenu(btn,s){
 const m=$("#menu"),r=btn.getBoundingClientRect();
 m.innerHTML=`<button data-a="like">${IC.up}${st.react[s.id]===1?"Liked ✓":"Like · more like this"}</button><button data-a="dislike">${IC.down}Dislike · show less</button><button data-a="share">${IC.share}Share</button><button data-a="src">${IC.ext}Open source</button>`;
 m.hidden=false;const mw=220,mh=m.offsetHeight;m.style.left=Math.max(8,Math.min(innerWidth-mw-8,r.right-mw))+"px";
 m.style.top=(r.bottom+mh+8>innerHeight?r.top-mh-4:r.bottom+4)+"px";
 m.onclick=e=>{const a=e.target.closest("button")?.dataset.a;if(!a)return;closeMenu();
  if(a==="like")react(s,1);else if(a==="dislike")react(s,-1);else if(a==="share")share(s);else window.open(s.sources[0].url,"_blank","noopener");};
}
document.addEventListener("pointerdown",e=>{if(!$("#menu").hidden&&!e.target.closest("#menu")&&!e.target.closest(".more,#dMore"))closeMenu();},true);
function closeMenu(){$("#menu").hidden=true;}
async function share(s){const data={title:s.title,text:s.snippet,url:s.sources[0].url};
 try{if(navigator.share){await navigator.share(data);}else{await navigator.clipboard.writeText(s.title+" — "+s.sources[0].url);toast("Link copied");}}catch(e){}logEv("share",s.id);}
/* ---------- listen (speechSynthesis) ---------- */
let speaking=null;
function speechText(s){return s.title+". "+s.bullets.map(b=>b.replace(/\[\d+\]/g,"")).join(" ");}
function listenCtl(e,s,root){
 const synth=window.speechSynthesis;
 if(e.target.closest(".stopB")){stopSpeak();return;}
 if(e.target.closest(".ppB")){if(!synth)return;if(synth.paused){synth.resume();setPlayer(root,true)}else{synth.pause();setPlayer(root,false)}return;}
 stopSpeak();speaking={id:s.id,root};
 const acts=root.querySelector(".acts");acts.dataset.orig=acts.innerHTML;
 acts.innerHTML=`<div class="player"><span class="wave"><b></b><b></b><b></b></span><span>Listening</span><button class="ic ppB" aria-label="Pause">${IC.pause}</button><button class="ic stopB" aria-label="Stop">${IC.stop}</button></div>`;
 learn(s,.4,"listen");
 if(synth&&window.SpeechSynthesisUtterance){const u=new SpeechSynthesisUtterance(speechText(s));u.rate=1.02;u.onend=()=>{if(speaking&&speaking.id===s.id)stopSpeak()};synth.cancel();synth.speak(u);}
 else toast("Speech isn't available on this browser");
}
function setPlayer(root,playing){const p=root.querySelector(".player");if(!p)return;p.classList.toggle("paused",!playing);p.querySelector(".ppB").innerHTML=playing?IC.pause:IC.play;p.querySelector("span:nth-child(2)").textContent=playing?"Listening":"Paused";}
function stopSpeak(){try{speechSynthesis.cancel()}catch(e){}if(speaking){const a=speaking.root.querySelector(".acts");if(a&&a.dataset.orig)a.innerHTML=a.dataset.orig;speaking=null;}}
/* ---------- detail ---------- */
let openedAt=0;
function cite(text,s){return esc(text).replace(/\[(\d+)\]/g,(m,n)=>{const src=s.sources[n-1];return src?`<sup><a href="${src.url}" target="_blank" rel="noopener">${n}</a></sup>`:""});}
function pills(text,s){const ns=[...text.matchAll(/\[(\d+)\]/g)].map(m=>+m[1]).filter(n=>s.sources[n-1]);
 const clean=esc(text.replace(/\[\d+\]/g,""));if(!ns.length)return clean;const f=s.sources[ns[0]-1];
 const name=f.domain.replace(/^en\./,"").replace(/\.(org|com|edu|gov|ac\.uk)$/,"");
 return clean+` <a class="pill" href="${f.url}" target="_blank" rel="noopener"><img src="${fav(f.domain)}" alt="">${esc(name)}${ns.length>1?" +"+(ns.length-1):""}</a>`;}
function openDetail(s,card){
 current=s;openedAt=performance.now();st.opened[s.id]=(st.opened[s.id]||0)+1;learn(s,.5,"open");stopSpeak();
 const d=$("#detail");
 d.innerHTML=`<div class="dtop"><button class="ic" id="dBack" aria-label="Back">${IC.back}</button><button class="ic" id="dMore" aria-label="More">${IC.more}</button></div>
 <div class="dwrap"><div class="dimg"><img src="${s.image.src}" alt="${esc(s.title)}"></div><div class="dbody">
 <span class="tag c-${s.cat}"><i></i>${CATLBL[s.cat]}</span><h1>${esc(s.title)}</h1>
 <div class="dmeta"><span class="favs">${[...new Set(s.sources.map(x=>x.domain))].map(dm=>`<img src="${fav(dm)}" alt="">`).join("")}</span>${rel(s.date)} · ${s.sources.length} source${s.sources.length>1?"s":""}</div>
 <div class="dacts"><button class="chip dLike">${IC.up}<span>Like</span></button><button class="chip dDis">${IC.down}<span>Less</span></button><button class="chip dListen">${IC.listen}<span>Listen</span></button><button class="chip dShare">${IC.share}<span>Share</span></button></div>
 <ul class="bul">${s.bullets.map(b=>`<li>${pills(b,s)}</li>`).join("")}</ul>
 <div class="rep" aria-expanded="false"><button class="repT"><span>Full report</span>${IC.chev}</button><div class="rbody">${s.report.map(p=>`<p>${cite(p,s)}</p>`).join("")}<ol style="color:var(--mut);font-size:13px;padding-left:18px;margin:0">${s.sources.map(x=>`<li><a style="color:var(--mut)" href="${x.url}" target="_blank" rel="noopener">${esc(x.title)}</a></li>`).join("")}</ol></div></div>
 <div class="sect">Sources</div>${s.sources.map(x=>`<a class="srcCard" href="${x.url}" target="_blank" rel="noopener"><div class="d"><img src="${fav(x.domain)}" alt="">${esc(x.domain)}</div><div class="t">${esc(x.title)}</div><div class="v">View full article →</div></a>`).join("")}
 <div class="photoCredit">Photo: ${esc(s.image.credit)}${s.image.license?" · "+esc(s.image.license):""} · <a href="${s.image.page}" target="_blank" rel="noopener">Wikimedia Commons</a></div>
 </div></div><button class="askFab" id="askFab">${IC.ask}Ask follow up</button>`;
 d.hidden=false;d.scrollTop=0;d.classList.remove("leave");d.classList.add("enter");document.body.classList.add("lock");
 updateDetailReact(s);
 if(!history.state||history.state.d!==s.id)history.pushState({d:s.id},"","#"+s.id);
 $("#dBack").onclick=()=>history.back();
 d.onscroll=()=>d.querySelector(".dtop")?.classList.toggle("solid",d.scrollTop>180);
 $("#dMore").onclick=e=>openMenu(e.currentTarget,s);
 d.querySelector(".dLike").onclick=()=>react(s,1);
 d.querySelector(".dDis").onclick=()=>{react(s,-1);if(st.react[s.id]===-1)setTimeout(()=>history.back(),500)};
 d.querySelector(".dShare").onclick=()=>share(s);
 d.querySelector(".dListen").onclick=e=>{const c=e.currentTarget;if(c.classList.contains("on")){stopDetailSpeak(c)}else{c.classList.add("on");c.querySelector("span").textContent="Stop";
   try{const u=new SpeechSynthesisUtterance(speechText(s));u.onend=()=>stopDetailSpeak(c);speechSynthesis.cancel();speechSynthesis.speak(u)}catch(x){toast("Speech isn't available")}learn(s,.4,"listen")}};
 d.querySelector(".repT").onclick=e=>{const r=e.currentTarget.parentElement;const x=r.getAttribute("aria-expanded")==="true";r.setAttribute("aria-expanded",!x);if(!x){learn(s,.3,"full report")}};
 $("#askFab").onclick=()=>openSheet(s);
 logEv("open",s.id);
}
function stopDetailSpeak(c){try{speechSynthesis.cancel()}catch(e){}c.classList.remove("on");c.querySelector("span").textContent="Listen";}
function updateDetailReact(s){const d=$("#detail");if(d.hidden||!current||current.id!==s.id)return;d.querySelector(".dLike")?.classList.toggle("on",st.react[s.id]===1);d.querySelector(".dDis")?.classList.toggle("on",st.react[s.id]===-1);}
function closeDetail(){const d=$("#detail");if(d.hidden)return;const s=current;
 if(s){const secs=(performance.now()-openedAt)/1000;if(secs>4)learn(s,Math.min(secs/30,1.2),"read "+Math.round(secs)+"s");st.dwell[s.id]=(st.dwell[s.id]||0)+Math.round(secs);save();}
 try{speechSynthesis.cancel()}catch(e){}closeSheet(true);d.classList.remove("enter");d.classList.add("leave");document.body.classList.remove("lock");
 setTimeout(()=>{d.hidden=true;d.classList.remove("leave");d.innerHTML=""},200);current=null;rebuild();}
let skipPop=false;addEventListener("popstate",e=>{if(skipPop){skipPop=false;return;}if(!$("#sheet").hidden){closeSheet(true);return;}closeDetail();});
/* ---------- ask follow up ---------- */
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
 const sents=[...s.bullets,...s.report.flatMap(p=>p.split(/(?<=\.(?:\[\d+\])?)\s+(?=[A-Z])/))];
 const ranked=sents.map(t=>({t,sc:words(t).filter(x=>qw.has(x)).length})).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc);
 if(ranked.length&&ranked[0].sc>=1&&qw.size){return{html:ranked.slice(0,2).map(x=>cite(x.t,s)).join(" "),ok:true,partial:ranked[0].sc<2}}
 return{html:"I don't have that in this story's sources yet.",ok:false};
}
function openSheet(s){
 const sh=$("#sheet");sh.hidden=false;$("#chat").innerHTML=`<div class="msg bot">Ask me anything about <b>${esc(s.title)}</b>. I answer from this story's sources.</div>`;
 const sug=[...s.qa.map(x=>x[0]),"What are the sources?","Explain it simply"];
 $("#sugg").innerHTML=sug.slice(0,4).map(q=>`<button>${esc(q)}</button>`).join("");
 $("#sugg").onclick=e=>{const b=e.target.closest("button");if(b)ask(s,b.textContent)};
 $("#askForm").onsubmit=e=>{e.preventDefault();const v=$("#askIn").value.trim();if(v){ask(s,v);$("#askIn").value=""}};
 sh.querySelector(".scrim").onclick=()=>closeSheet();sh.querySelector(".close").onclick=()=>closeSheet();
 history.pushState({d:s.id,sheet:1},"","#"+s.id+"/ask");logEv("ask_open",s.id);
}
function ask(s,q){
 const c=$("#chat");c.insertAdjacentHTML("beforeend",`<div class="msg me">${esc(q)}</div>`);
 const a=answer(s,q);
 const fb=`<button class="fallback" data-q="${esc(q)}">${IC.ask.replace('<svg','<svg style="width:15px;height:15px"')}Ask Feed in chat</button>`;
 c.insertAdjacentHTML("beforeend",`<div class="msg bot">${a.html}${a.ok?(a.partial?"<small>Closest match from the sources. For more depth:</small>"+fb:"<small>From this story's sources</small>"):"<small>Copy your question and ask me in our chat for a fuller answer:</small>"+fb}</div>`);
 c.scrollTop=c.scrollHeight;learn(s,.6,"ask");logEv("ask",s.id,{q,ok:a.ok});
 c.querySelectorAll(".fallback").forEach(b=>b.onclick=async()=>{const txt=`About "${s.title}": ${b.dataset.q}`;try{await navigator.clipboard.writeText(txt);toast("Question copied. Paste it to Feed in chat")}catch(e){toast("Copy failed. Question: "+b.dataset.q)}logEv("ask_fallback",s.id,{q:b.dataset.q})});
}
function closeSheet(silent){const sh=$("#sheet");if(sh.hidden)return;sh.hidden=true;if(!silent&&history.state&&history.state.sheet){skipPop=true;history.back();}}
/* ---------- wellbeing nudge ---------- */
let active=0,lastTick=Date.now();
setInterval(()=>{const now=Date.now();if(!document.hidden&&now-lastAct<60000)active+=now-lastTick;lastTick=now;
 if(!st.nudgeOff&&active>15*60000&&!nudged){nudged=true;showNudge();}},5000);
let lastAct=Date.now(),nudged=false;["scroll","touchstart","click","keydown"].forEach(ev=>addEventListener(ev,()=>lastAct=Date.now(),{passive:true}));
function showNudge(){const n=$("#nudge");n.innerHTML=`<div class="box"><div class="orb"></div><h3>You've been here 15 min</h3><p>Take a breath? Breathe in as the circle grows, out as it shrinks.</p><div class="btns"><button class="btn" id="nKeep">Keep going</button><button class="btn pri" id="nDone">I'm good, close</button></div><p style="margin:14px 0 0;font-size:12px"><button id="nOff" style="color:var(--mut);text-decoration:underline">Don't remind me</button></p></div>`;
 n.hidden=false;$("#nKeep").onclick=()=>{n.hidden=true;active=0;nudged=false};$("#nDone").onclick=()=>{n.hidden=true;active=0;nudged=false;toast("Nice. See you later 👋")};$("#nOff").onclick=()=>{st.nudgeOff=true;save();n.hidden=true};logEv("nudge",null);}
window.__feed={st,showNudge,answer:(id,q)=>answer(byId[id],q),queue:()=>queue.map(s=>s.id)};
/* ---------- boot ---------- */
(async()=>{
 $("#feed").innerHTML='<div class="skel"></div><div class="skel"></div>';
 const r=await fetch("data/stories.json",{cache:"no-cache"}).catch(()=>caches.match("data/stories.json"));STORIES=await r.json();STORIES.forEach(s=>byId[s.id]=s);
 renderTabs();$("#feed").innerHTML="";rebuild();loadMore(6);
 if(location.hash.length>1){const id=location.hash.slice(1).split("/")[0];if(byId[id]){history.replaceState(null,"",location.pathname);openDetail(byId[id]);}}
 if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
