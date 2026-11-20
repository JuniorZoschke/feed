/* Sunny v16 sync merge. One shared file: the app loads it as a script, the Worker bundles it.
 * State: {v:1, items:{saved|liked:{id:{on:1|0,t,s?}}, react:{id:{v:-1|0|1,t}}, hidden:{id:{on,t}}},
 *         seenAt:{id:ts}, seenKeys:{key:ts}, cat:{k:w}, tag:{k:w}, nudgeOff:{v,t}}
 * Items: the latest action wins (t = ms timestamp); on a tie the "off" side wins, so a removal is never undone by a tie.
 * Seen history: union, earliest time. Taste weights: the stronger signal. merge(a,b) is commutative and idempotent. */
(function(G){
 "use strict";
 var ID=/^[\w.:-]{1,160}$/, MAX_SEEN=15000, MAX_ITEMS=5000, MAX_STORY=40000;
 function num(v){return typeof v==="number"&&isFinite(v)&&v>=0?v:null;}
 function obj(v){return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}
 function cleanOn(e,withStory){e=obj(e);var t=num(e.t);if(t==null)return null;var o={on:e.on?1:0,t:t};
  if(o.on&&withStory&&e.s&&typeof e.s==="object"&&e.s.id){try{if(JSON.stringify(e.s).length<=MAX_STORY)o.s=e.s;}catch(_){}}return o;}
 function cleanReact(e){e=obj(e);var t=num(e.t);if(t==null)return null;var v=e.v===1||e.v===-1?e.v:0;return {v:v,t:t};}
 function pickOn(x,y){ if(!x)return y;if(!y)return x;
  var w; if(x.t!==y.t)w=x.t>y.t?x:y; else w=x.on<=y.on?x:y; // tie: off wins
  if(w.on&&!w.s){var l=w===x?y:x;if(l.on&&l.s){w={on:1,t:w.t,s:l.s};}}
  if(w.on&&w.s&&x.on&&y.on&&x.t===y.t&&x.s&&y.s){var a=JSON.stringify(x.s),b=JSON.stringify(y.s);w={on:1,t:w.t,s:a<=b?x.s:y.s};}
  return w;}
 function pickReact(x,y){if(!x)return y;if(!y)return x;if(x.t!==y.t)return x.t>y.t?x:y;
  var ax=Math.abs(x.v),ay=Math.abs(y.v);if(ax!==ay)return ax<ay?x:y;return x.v<=y.v?x:y;}
 function mergeMap(A,B,clean,pick){var out={},k,n=0;A=obj(A);B=obj(B);var keys={};for(k in A)keys[k]=1;for(k in B)keys[k]=1;
  for(k in keys){if(!ID.test(k))continue;var r=pick(clean(A[k]),clean(B[k]));if(r){out[k]=r;if(++n>=MAX_ITEMS)break;}}return out;}
 function minMap(A,B,keyOk,cap){var out={},k;A=obj(A);B=obj(B);
  for(k in A){var v=num(A[k]);if(v!=null&&keyOk(k))out[k]=v;}
  for(k in B){var w=num(B[k]);if(w==null||!keyOk(k))continue;out[k]=k in out?Math.min(out[k]||w,w||out[k]):w;}
  var ks=Object.keys(out);if(ks.length>cap){ks.sort(function(a,b){return out[b]-out[a];});var o2={};ks.slice(0,cap).forEach(function(x){o2[x]=out[x];});out=o2;}
  return out;}
 function absMap(A,B){var out={},k;A=obj(A);B=obj(B);var ok=function(k,v){return typeof k==="string"&&k.length<80&&num(Math.abs(v))!=null;};
  for(k in A)if(typeof A[k]==="number"&&ok(k,A[k]))out[k]=A[k];
  for(k in B)if(typeof B[k]==="number"&&ok(k,B[k])&&(!(k in out)||Math.abs(B[k])>Math.abs(out[k])||(Math.abs(B[k])===Math.abs(out[k])&&B[k]<out[k])))out[k]=B[k];return out;}
 function merge(a,b){a=obj(a);b=obj(b);var ia=obj(a.items),ib=obj(b.items);
  var on=function(e){return cleanOn(e,true);},onNS=function(e){return cleanOn(e,false);};
  var na=cleanReact(obj(a).nudgeOff&&{v:a.nudgeOff.v?1:0,t:a.nudgeOff.t}),nb=cleanReact(obj(b).nudgeOff&&{v:b.nudgeOff.v?1:0,t:b.nudgeOff.t});
  var nw=na&&nb?(na.t!==nb.t?(na.t>nb.t?na:nb):(na.v>=nb.v?na:nb)):(na||nb);
  return {v:1,items:{saved:mergeMap(ia.saved,ib.saved,on,pickOn),liked:mergeMap(ia.liked,ib.liked,on,pickOn),
    react:mergeMap(ia.react,ib.react,cleanReact,pickReact),hidden:mergeMap(ia.hidden,ib.hidden,onNS,pickOn)},
   seenAt:minMap(a.seenAt,b.seenAt,function(k){return ID.test(k);},MAX_SEEN),
   seenKeys:minMap(a.seenKeys,b.seenKeys,function(k){return k.length<300;},MAX_SEEN),
   cat:absMap(a.cat,b.cat),tag:absMap(a.tag,b.tag),nudgeOff:nw?{v:!!nw.v,t:nw.t}:{v:false,t:0}};}
 function same(a,b){return JSON.stringify(canon(a))===JSON.stringify(canon(b));}
 function canon(x){if(Array.isArray(x))return x.map(canon);if(x&&typeof x==="object"){var o={};Object.keys(x).sort().forEach(function(k){o[k]=canon(x[k]);});return o;}return x;}
 G.sunnyMerge={merge:merge,same:same,canon:canon};
})(typeof globalThis!=="undefined"?globalThis:self);
