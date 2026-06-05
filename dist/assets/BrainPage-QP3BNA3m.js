import{Q as vv,n as nh,m as _v,l as xv,q as yv,f as Sv,k as bv,x as Mv,t as Tv,p as Ev,w as to,j as wv,a as Av,i as Cv,h as Rv,g as Pv,o as D,e as Dv,z as si,A as Lv,T as Uv,r as ae,s as _p,X as xp,B as Nv,c as Iv,D as Fv,u as Ov,y as kv,v as Bv,b as zv,V as Vv,L as Gv,S as Hv,d as Wv}from"./index-Cj2Rw1rD.js";var jv=class extends vv{constructor(n,e){super(n,e)}bindMethods(){super.bindMethods(),this.fetchNextPage=this.fetchNextPage.bind(this),this.fetchPreviousPage=this.fetchPreviousPage.bind(this)}setOptions(n){super.setOptions({...n,behavior:nh()})}getOptimisticResult(n){return n.behavior=nh(),super.getOptimisticResult(n)}fetchNextPage(n){return this.fetch({...n,meta:{fetchMore:{direction:"forward"}}})}fetchPreviousPage(n){return this.fetch({...n,meta:{fetchMore:{direction:"backward"}}})}createResult(n,e){var g,v;const{state:t}=n,i=super.createResult(n,e),{isFetching:r,isRefetching:s,isError:a,isRefetchError:o}=i,l=(v=(g=t.fetchMeta)==null?void 0:g.fetchMore)==null?void 0:v.direction,c=a&&l==="forward",u=r&&l==="forward",h=a&&l==="backward",f=r&&l==="backward";return{...i,fetchNextPage:this.fetchNextPage,fetchPreviousPage:this.fetchPreviousPage,hasNextPage:xv(e,t.data),hasPreviousPage:_v(e,t.data),isFetchNextPageError:c,isFetchingNextPage:u,isFetchPreviousPageError:h,isFetchingPreviousPage:f,isRefetchError:o&&!c&&!h,isRefetching:s&&!u&&!f}}};function Xv(n,e){return yv(n,jv)}/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yv=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],qv=Sv("layers",Yv);function yp(n,e){return Xv({queryKey:["brain","timeline",n,e??{}],queryFn:({pageParam:t})=>bv(n,{cursor:t,limit:e==null?void 0:e.limit,kind:e==null?void 0:e.kind,to:e==null?void 0:e.to}),initialPageParam:void 0,getNextPageParam:t=>t.next_cursor??void 0,enabled:!!n})}function Kv(n){const e=Mv();return Tv({mutationFn:t=>Ev(n,t),onSuccess:()=>{e.invalidateQueries({queryKey:["brain","graph",n]}),e.invalidateQueries({queryKey:["brain","timeline",n]})}})}const Zv={detail:(n,e)=>["brain","memory",n,e]};function $v(n,e){return to({queryKey:Zv.detail(n,e??""),queryFn:async()=>{if(!e)return null;try{return await wv(n,e)}catch(t){if(t instanceof Av&&t.status===404)return null;throw t}},enabled:!!n&&!!e,staleTime:3e4,retry:!1})}function Jv(n){return to({queryKey:["brain","me",n],queryFn:()=>Cv(),enabled:!!n,staleTime:6e4})}function Qv(n,e){return to({queryKey:["brain","diff",n,e.date,e.window_days??1],queryFn:()=>Rv(n,{date:e.date,window_days:e.window_days}),enabled:!!n&&!!e.date&&e.enabled!==!1,staleTime:3e4})}function Xc(n){return to({queryKey:["brain","communities",n],queryFn:()=>Pv(),enabled:!!n,staleTime:6e4})}function e_({value:n,options:e,onChange:t,disabled:i=!1,ariaLabel:r,className:s,fullWidth:a=!1}){const o=a?{"--v2-seg-count":e.length}:void 0;return D.jsx("div",{className:Dv("v2-seg",a&&"v2-seg--grid",s),"aria-label":r,style:o,children:e.map(l=>D.jsx("button",{type:"button",disabled:i||l.disabled||!t,"aria-pressed":n===l.id,onClick:()=>{n!==l.id&&(t==null||t(l.id))},children:l.label},l.id))})}function t_({onMigrate:n}){const{t:e}=si();return D.jsxs("div",{className:"flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center",children:[D.jsxs("div",{className:"relative size-32 sm:size-40","aria-hidden":"true",children:[D.jsx("div",{className:"motion-safe:animate-pulse absolute inset-0 border border-zaki-brand/10"}),D.jsx("div",{className:"absolute inset-4 border border-zaki-brand/20"}),D.jsx("div",{className:"absolute inset-8 border border-zaki-brand/40"}),D.jsx("div",{className:"absolute inset-[44%] bg-zaki-brand"})]}),D.jsxs("div",{className:"max-w-md space-y-3",children:[D.jsx("h2",{className:"font-mono-ui text-2xl font-bold tracking-normal text-zaki-text",children:e("brain.empty.title",{defaultValue:"Your brain starts here"})}),D.jsx("p",{className:"text-sm leading-relaxed text-zaki-secondary",children:e("brain.empty.body",{defaultValue:"ZAKI builds your brain as you talk. Every fact, preference, person, project — every conversation adds to a network you'll see grow over time."})})]}),D.jsxs("button",{type:"button",onClick:n,className:"inline-flex items-center gap-2 rounded-[2px] border border-zaki-brand/30 bg-zaki-brand px-5 py-2.5 font-mono-ui text-sm font-medium text-white transition-colors hover:bg-zaki-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand/40","data-testid":"brain-empty-state-cta",children:[e("brain.empty.cta",{defaultValue:"Start a conversation"}),D.jsx(Lv,{className:"size-4"})]}),D.jsx("p",{className:"max-w-xs text-xs text-zaki-muted",children:e("brain.empty.hint",{defaultValue:"After your first few exchanges, come back here to see your brain take shape."})})]})}function n_({onDismiss:n}){const{t:e}=si();return D.jsxs("div",{className:"flex items-start gap-3 rounded-zaki-lg border border-zaki-warning bg-zaki-warning px-3 py-2.5 text-xs text-zaki-warning",children:[D.jsx(Uv,{className:"mt-0.5 size-4 shrink-0"}),D.jsxs("div",{className:"flex-1",children:[D.jsx("div",{className:"font-semibold",children:e("brain.degraded.title")}),D.jsx("div",{className:"mt-0.5 leading-relaxed opacity-90",children:e("brain.degraded.body")})]}),n&&D.jsx("button",{type:"button",onClick:n,className:"text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100",children:e("common.dismiss")})]})}const i_="#d24430",r_="#b8b2a9",Ys=["#4e79a7","#f28e2b","#59a14f","#e15759","#76b7b2","#edc948","#b07aa1","#ff9da7","#9c755f","#bab0ac","#86bcb6","#d37295"],Sp={preference:"#d24430",relationship:"#21916f",usage:"#c28d2c",attribute:"#b8b2a9",supersession:"#807a72",synthesis:"#9c968e",episode:"#565049"},bp={core:"#d24430",daily:"#c28d2c",conversation:"#9c968e"},Yc={core:"About you",daily:"Daily life",conversation:"Conversations"},Mp={week:"#d24430",month:"#c28d2c",older:"#8a857d"},s_={week:"This week",month:"This month",older:"Older"},a_=10080*60*1e3,o_=720*60*60*1e3;function l_(n){return n<1e12?n*1e3:n}function Tp(n,e){const t=e-l_(n);return t<=a_?"week":t<=o_?"month":"older"}function c_(n,e){return Mp[Tp(n,e)]}const Ba={live:"#b8b2a9",archived:"#57534e"},ih={live:"Live",archived:"Archived"};function u_(n){return n?Ba.archived:Ba.live}const Rr="#6b7280";function no(n){if(n==null||Number.isNaN(n))return Rr;const e=(n%Ys.length+Ys.length)%Ys.length;return Ys[e]??Rr}function h_(n){return n?Sp[n]??Rr:Rr}function rh(n){return n?bp[n]??Rr:Rr}function f_(n,e){return n==="mono"?r_:n==="community"?e.community_id!==null&&e.community_id!==void 0?no(e.community_id):rh(e.kind):n==="link_type"?h_(e.link_type):rh(e.kind)}function d_(n){return 5+13*(typeof n=="number"?Math.max(0,Math.min(1,n)):.3)}function p_(n,e,t){const i=[];for(const s of n){const a=t(s);typeof a=="number"&&Number.isFinite(a)&&i.push({id:e(s),value:a})}const r=new Map;if(i.length===0)return r;if(i.length===1)return r.set(i[0].id,.5),r;i.sort((s,a)=>s.value-a.value);for(let s=0;s<i.length;s++)r.set(i[s].id,s/(i.length-1));return r}function m_(n){if(n.type==="session")return .5;if(n.type==="semantic"){const i=typeof n.weight=="number"&&Number.isFinite(n.weight)?Math.max(0,Math.min(1,n.weight)):.5;return Math.max(0,Math.min(1,(i-.7)/.3))}if(n.type!=="typed")return .5;const e=typeof n.confidence=="number"&&Number.isFinite(n.confidence)?Math.max(0,Math.min(1,n.confidence)):1,t=typeof n.weight=="number"&&Number.isFinite(n.weight)?Math.max(0,n.weight):1;return Math.max(0,Math.min(1,e*Math.tanh(t/3)))}const Cl="cluster:",g_=18,v_=/\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i;function __(n){return`${Cl}${n}`}function sh(n){if(!n.startsWith(Cl))return null;const e=Number(n.slice(Cl.length));return Number.isFinite(e)?e:null}function x_(n,e=g_){const t=(n??[]).filter(c=>c.member_count>0&&!v_.test(c.name));if(t.length===0)return{nodes:[],edges:[]};const i=(c,u)=>u.member_count-c.member_count,r=t.filter(c=>c.name_source==="llm").sort(i),s=t.filter(c=>c.name_source!=="llm").sort(i),a=[...r,...s].slice(0,e),o=Math.max(...a.map(c=>c.member_count));return{nodes:a.map(c=>({id:__(c.community_id),label:c.name,importance:o>0?.5+.5*Math.sqrt(c.member_count/o):.7,color:no(c.community_id),kind:"cluster",communityId:c.community_id,stale:!1,isSelf:!1})),edges:[]}}function y_(n,e){if(!n)return n;const t=n.nodes.filter(s=>(s.community_id??null)===e),i=new Set(t.map(s=>s.id)),r=n.edges.filter(s=>i.has(s.source)&&i.has(s.target));return{...n,nodes:t,edges:r}}function S_(n,e){const t=(n==null?void 0:n.nodes)??[];if(t.length===0)return{nodes:[],edges:[]};const i=(n==null?void 0:n.edges)??[],r=new Map;for(const f of i)r.set(f.source,(r.get(f.source)??0)+1),r.set(f.target,(r.get(f.target)??0)+1);let s=0;for(const f of r.values())s=Math.max(s,f);const o=p_(t,f=>f.id,f=>typeof f.importance=="number"?f.importance:typeof f.importance_score=="number"?f.importance_score:s>0?(r.get(f.id)??0)/s:0),l=Date.now(),c=t.map(f=>{const d=e.selfKey!=null&&(f.key===e.selfKey||f.id===e.selfKey),g=f.valid_to!==null&&f.valid_to!==void 0;let v;return d?v=i_:e.colorPreset==="recency"?v=c_(f.created_at,l):e.colorPreset==="status"?v=u_(g):v=f_(e.colorPreset,{kind:f.kind,community_id:f.community_id??null,link_type:f.link_type??null}),{id:f.id,label:f.display_label||f.summary||f.key||f.id,importance:o.get(f.id)??.3,color:v,kind:f.kind,communityId:f.community_id??null,stale:g,isSelf:d}}),u=new Set(c.map(f=>f.id)),h=[];for(const f of i)!u.has(f.source)||!u.has(f.target)||b_(f,e.semanticEdgeThreshold)||h.push({source:f.source,target:f.target,relevance:m_(f),type:f.type});return{nodes:c,edges:h}}function b_(n,e){if(n.type!=="semantic")return!1;const t=n.weight;return typeof t=="number"&&t<e}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const qc="171",xn={ROTATE:0,DOLLY:1,PAN:2},xi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},M_=0,ah=1,T_=2,Ep=1,E_=2,qn=3,Mi=0,qt=1,kn=2,$n=0,Er=1,za=2,oh=3,lh=4,w_=5,ki=100,A_=101,C_=102,R_=103,P_=104,D_=200,L_=201,U_=202,N_=203,Rl=204,Pl=205,I_=206,F_=207,O_=208,k_=209,B_=210,z_=211,V_=212,G_=213,H_=214,Dl=0,Ll=1,Ul=2,Pr=3,Nl=4,Il=5,Fl=6,Ol=7,wp=0,W_=1,j_=2,Si=0,X_=1,Y_=2,q_=3,K_=4,Z_=5,$_=6,J_=7,Ap=300,Dr=301,Lr=302,kl=303,Bl=304,io=306,zl=1e3,zi=1001,Vl=1002,fn=1003,Q_=1004,qs=1005,Sn=1006,wo=1007,Vi=1008,ni=1009,Cp=1010,Rp=1011,Es=1012,Kc=1013,Xi=1014,Bn=1015,Jn=1016,Zc=1017,$c=1018,Ur=1020,Pp=35902,Dp=1021,Lp=1022,Un=1023,Up=1024,Np=1025,wr=1026,Nr=1027,Jc=1028,Qc=1029,Ip=1030,eu=1031,tu=1033,Ea=33776,wa=33777,Aa=33778,Ca=33779,Gl=35840,Hl=35841,Wl=35842,jl=35843,Xl=36196,Yl=37492,ql=37496,Kl=37808,Zl=37809,$l=37810,Jl=37811,Ql=37812,ec=37813,tc=37814,nc=37815,ic=37816,rc=37817,sc=37818,ac=37819,oc=37820,lc=37821,Ra=36492,cc=36494,uc=36495,Fp=36283,hc=36284,fc=36285,dc=36286,e0=3200,Op=3201,t0=0,n0=1,_i="",_n="srgb",Ir="srgb-linear",Va="linear",at="srgb",nr=7680,ch=519,i0=512,r0=513,s0=514,kp=515,a0=516,o0=517,l0=518,c0=519,uh=35044,u0=35048,hh="300 es",Zn=2e3,Ga=2001;class Ki{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const i=this._listeners[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const kt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Pa=Math.PI/180,pc=180/Math.PI;function Us(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(kt[n&255]+kt[n>>8&255]+kt[n>>16&255]+kt[n>>24&255]+"-"+kt[e&255]+kt[e>>8&255]+"-"+kt[e>>16&15|64]+kt[e>>24&255]+"-"+kt[t&63|128]+kt[t>>8&255]+"-"+kt[t>>16&255]+kt[t>>24&255]+kt[i&255]+kt[i>>8&255]+kt[i>>16&255]+kt[i>>24&255]).toLowerCase()}function et(n,e,t){return Math.max(e,Math.min(t,n))}function h0(n,e){return(n%e+e)%e}function Ao(n,e,t){return(1-t)*n+t*e}function es(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function tn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const f0={DEG2RAD:Pa};class je{constructor(e=0,t=0){je.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(et(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*i-a*r+e.x,this.y=s*r+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ze{constructor(e,t,i,r,s,a,o,l,c){Ze.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c)}set(e,t,i,r,s,a,o,l,c){const u=this.elements;return u[0]=e,u[1]=r,u[2]=o,u[3]=t,u[4]=s,u[5]=l,u[6]=i,u[7]=a,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[3],l=i[6],c=i[1],u=i[4],h=i[7],f=i[2],d=i[5],g=i[8],v=r[0],m=r[3],p=r[6],y=r[1],x=r[4],_=r[7],S=r[2],T=r[5],E=r[8];return s[0]=a*v+o*y+l*S,s[3]=a*m+o*x+l*T,s[6]=a*p+o*_+l*E,s[1]=c*v+u*y+h*S,s[4]=c*m+u*x+h*T,s[7]=c*p+u*_+h*E,s[2]=f*v+d*y+g*S,s[5]=f*m+d*x+g*T,s[8]=f*p+d*_+g*E,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*a*u-t*o*c-i*s*u+i*o*l+r*s*c-r*a*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],h=u*a-o*c,f=o*l-u*s,d=c*s-a*l,g=t*h+i*f+r*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/g;return e[0]=h*v,e[1]=(r*c-u*i)*v,e[2]=(o*i-r*a)*v,e[3]=f*v,e[4]=(u*t-r*l)*v,e[5]=(r*s-o*t)*v,e[6]=d*v,e[7]=(i*l-c*t)*v,e[8]=(a*t-i*s)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,a,o){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*a+c*o)+a+e,-r*c,r*l,-r*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Co.makeScale(e,t)),this}rotate(e){return this.premultiply(Co.makeRotation(-e)),this}translate(e,t){return this.premultiply(Co.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Co=new Ze;function Bp(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Ha(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function d0(){const n=Ha("canvas");return n.style.display="block",n}const fh={};function _r(n){n in fh||(fh[n]=!0,console.warn(n))}function p0(n,e,t){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:i()}}setTimeout(s,t)})}function m0(n){const e=n.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function g0(n){const e=n.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}const dh=new Ze().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ph=new Ze().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function v0(){const n={enabled:!0,workingColorSpace:Ir,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===at&&(r.r=Qn(r.r),r.g=Qn(r.g),r.b=Qn(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===at&&(r.r=Ar(r.r),r.g=Ar(r.g),r.b=Ar(r.b))),r},fromWorkingColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},toWorkingColorSpace:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===_i?Va:this.spaces[r].transfer},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[Ir]:{primaries:e,whitePoint:i,transfer:Va,toXYZ:dh,fromXYZ:ph,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:_n},outputColorSpaceConfig:{drawingBufferColorSpace:_n}},[_n]:{primaries:e,whitePoint:i,transfer:at,toXYZ:dh,fromXYZ:ph,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:_n}}}),n}const st=v0();function Qn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Ar(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let ir;class _0{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{ir===void 0&&(ir=Ha("canvas")),ir.width=e.width,ir.height=e.height;const i=ir.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=ir}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Ha("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Qn(s[a]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Qn(t[i]/255)*255):t[i]=Qn(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let x0=0;class zp{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:x0++}),this.uuid=Us(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(Ro(r[a].image)):s.push(Ro(r[a]))}else s=Ro(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function Ro(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?_0.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let y0=0;class Gt extends Ki{constructor(e=Gt.DEFAULT_IMAGE,t=Gt.DEFAULT_MAPPING,i=zi,r=zi,s=Sn,a=Vi,o=Un,l=ni,c=Gt.DEFAULT_ANISOTROPY,u=_i){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:y0++}),this.uuid=Us(),this.name="",this.source=new zp(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new je(0,0),this.repeat=new je(1,1),this.center=new je(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ze,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Ap)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case zl:e.x=e.x-Math.floor(e.x);break;case zi:e.x=e.x<0?0:1;break;case Vl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case zl:e.y=e.y-Math.floor(e.y);break;case zi:e.y=e.y<0?0:1;break;case Vl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Gt.DEFAULT_IMAGE=null;Gt.DEFAULT_MAPPING=Ap;Gt.DEFAULT_ANISOTROPY=1;class gt{constructor(e=0,t=0,i=0,r=1){gt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*i+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*i+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*i+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const l=e.elements,c=l[0],u=l[4],h=l[8],f=l[1],d=l[5],g=l[9],v=l[2],m=l[6],p=l[10];if(Math.abs(u-f)<.01&&Math.abs(h-v)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+f)<.1&&Math.abs(h+v)<.1&&Math.abs(g+m)<.1&&Math.abs(c+d+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const x=(c+1)/2,_=(d+1)/2,S=(p+1)/2,T=(u+f)/4,E=(h+v)/4,A=(g+m)/4;return x>_&&x>S?x<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(x),r=T/i,s=E/i):_>S?_<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(_),i=T/r,s=A/r):S<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(S),i=E/s,r=A/s),this.set(i,r,s,t),this}let y=Math.sqrt((m-g)*(m-g)+(h-v)*(h-v)+(f-u)*(f-u));return Math.abs(y)<.001&&(y=1),this.x=(m-g)/y,this.y=(h-v)/y,this.z=(f-u)/y,this.w=Math.acos((c+d+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this.z=et(this.z,e.z,t.z),this.w=et(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this.z=et(this.z,e,t),this.w=et(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class S0 extends Ki{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new gt(0,0,e,t),this.scissorTest=!1,this.viewport=new gt(0,0,e,t);const r={width:e,height:t,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Sn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const s=new Gt(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);s.flipY=!1,s.generateMipmaps=i.generateMipmaps,s.internalFormat=i.internalFormat,this.textures=[];const a=i.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let i=0,r=e.textures.length;i<r;i++)this.textures[i]=e.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new zp(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Nn extends S0{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class Vp extends Gt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=fn,this.minFilter=fn,this.wrapR=zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class b0 extends Gt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=fn,this.minFilter=fn,this.wrapR=zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Yi{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,a,o){let l=i[r+0],c=i[r+1],u=i[r+2],h=i[r+3];const f=s[a+0],d=s[a+1],g=s[a+2],v=s[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h;return}if(o===1){e[t+0]=f,e[t+1]=d,e[t+2]=g,e[t+3]=v;return}if(h!==v||l!==f||c!==d||u!==g){let m=1-o;const p=l*f+c*d+u*g+h*v,y=p>=0?1:-1,x=1-p*p;if(x>Number.EPSILON){const S=Math.sqrt(x),T=Math.atan2(S,p*y);m=Math.sin(m*T)/S,o=Math.sin(o*T)/S}const _=o*y;if(l=l*m+f*_,c=c*m+d*_,u=u*m+g*_,h=h*m+v*_,m===1-o){const S=1/Math.sqrt(l*l+c*c+u*u+h*h);l*=S,c*=S,u*=S,h*=S}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,i,r,s,a){const o=i[r],l=i[r+1],c=i[r+2],u=i[r+3],h=s[a],f=s[a+1],d=s[a+2],g=s[a+3];return e[t]=o*g+u*h+l*d-c*f,e[t+1]=l*g+u*f+c*h-o*d,e[t+2]=c*g+u*d+o*f-l*h,e[t+3]=u*g-o*h-l*f-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(i/2),u=o(r/2),h=o(s/2),f=l(i/2),d=l(r/2),g=l(s/2);switch(a){case"XYZ":this._x=f*u*h+c*d*g,this._y=c*d*h-f*u*g,this._z=c*u*g+f*d*h,this._w=c*u*h-f*d*g;break;case"YXZ":this._x=f*u*h+c*d*g,this._y=c*d*h-f*u*g,this._z=c*u*g-f*d*h,this._w=c*u*h+f*d*g;break;case"ZXY":this._x=f*u*h-c*d*g,this._y=c*d*h+f*u*g,this._z=c*u*g+f*d*h,this._w=c*u*h-f*d*g;break;case"ZYX":this._x=f*u*h-c*d*g,this._y=c*d*h+f*u*g,this._z=c*u*g-f*d*h,this._w=c*u*h+f*d*g;break;case"YZX":this._x=f*u*h+c*d*g,this._y=c*d*h+f*u*g,this._z=c*u*g-f*d*h,this._w=c*u*h-f*d*g;break;case"XZY":this._x=f*u*h-c*d*g,this._y=c*d*h-f*u*g,this._z=c*u*g+f*d*h,this._w=c*u*h+f*d*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],u=t[6],h=t[10],f=i+o+h;if(f>0){const d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(u-l)*d,this._y=(s-c)*d,this._z=(a-r)*d}else if(i>o&&i>h){const d=2*Math.sqrt(1+i-o-h);this._w=(u-l)/d,this._x=.25*d,this._y=(r+a)/d,this._z=(s+c)/d}else if(o>h){const d=2*Math.sqrt(1+o-i-h);this._w=(s-c)/d,this._x=(r+a)/d,this._y=.25*d,this._z=(l+u)/d}else{const d=2*Math.sqrt(1+h-i-o);this._w=(a-r)/d,this._x=(s+c)/d,this._y=(l+u)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(et(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+a*o+r*c-s*l,this._y=r*u+a*l+s*o-i*c,this._z=s*u+a*c+i*l-r*o,this._w=a*u-i*o-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+i*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=i,this._y=r,this._z=s,this;const l=1-o*o;if(l<=Number.EPSILON){const d=1-t;return this._w=d*a+t*this._w,this._x=d*i+t*this._x,this._y=d*r+t*this._y,this._z=d*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,o),h=Math.sin((1-t)*u)/c,f=Math.sin(t*u)/c;return this._w=a*h+this._w*f,this._x=i*h+this._x*f,this._y=r*h+this._y*f,this._z=s*h+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class te{constructor(e=0,t=0,i=0){te.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(mh.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(mh.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*r-o*i),u=2*(o*t-s*r),h=2*(s*i-a*t);return this.x=t+l*c+a*h-o*u,this.y=i+l*u+o*c-s*h,this.z=r+l*h+s*u-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this.z=et(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this.z=et(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(et(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=r*l-s*o,this.y=s*a-i*l,this.z=i*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Po.copy(this).projectOnVector(e),this.sub(Po)}reflect(e){return this.sub(Po.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(et(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Po=new te,mh=new Yi;class ai{constructor(e=new te(1/0,1/0,1/0),t=new te(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(An.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(An.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=An.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,An):An.fromBufferAttribute(s,a),An.applyMatrix4(e.matrixWorld),this.expandByPoint(An);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ks.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ks.copy(i.boundingBox)),Ks.applyMatrix4(e.matrixWorld),this.union(Ks)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,An),An.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ts),Zs.subVectors(this.max,ts),rr.subVectors(e.a,ts),sr.subVectors(e.b,ts),ar.subVectors(e.c,ts),ui.subVectors(sr,rr),hi.subVectors(ar,sr),Ai.subVectors(rr,ar);let t=[0,-ui.z,ui.y,0,-hi.z,hi.y,0,-Ai.z,Ai.y,ui.z,0,-ui.x,hi.z,0,-hi.x,Ai.z,0,-Ai.x,-ui.y,ui.x,0,-hi.y,hi.x,0,-Ai.y,Ai.x,0];return!Do(t,rr,sr,ar,Zs)||(t=[1,0,0,0,1,0,0,0,1],!Do(t,rr,sr,ar,Zs))?!1:($s.crossVectors(ui,hi),t=[$s.x,$s.y,$s.z],Do(t,rr,sr,ar,Zs))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,An).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(An).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Hn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Hn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Hn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Hn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Hn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Hn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Hn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Hn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Hn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const Hn=[new te,new te,new te,new te,new te,new te,new te,new te],An=new te,Ks=new ai,rr=new te,sr=new te,ar=new te,ui=new te,hi=new te,Ai=new te,ts=new te,Zs=new te,$s=new te,Ci=new te;function Do(n,e,t,i,r){for(let s=0,a=n.length-3;s<=a;s+=3){Ci.fromArray(n,s);const o=r.x*Math.abs(Ci.x)+r.y*Math.abs(Ci.y)+r.z*Math.abs(Ci.z),l=e.dot(Ci),c=t.dot(Ci),u=i.dot(Ci);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}const M0=new ai,ns=new te,Lo=new te;class Zi{constructor(e=new te,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):M0.setFromPoints(e).getCenter(i);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;ns.subVectors(e,this.center);const t=ns.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(ns,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Lo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(ns.copy(e.center).add(Lo)),this.expandByPoint(ns.copy(e.center).sub(Lo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Wn=new te,Uo=new te,Js=new te,fi=new te,No=new te,Qs=new te,Io=new te;class ro{constructor(e=new te,t=new te(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Wn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Wn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Wn.copy(this.origin).addScaledVector(this.direction,t),Wn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){Uo.copy(e).add(t).multiplyScalar(.5),Js.copy(t).sub(e).normalize(),fi.copy(this.origin).sub(Uo);const s=e.distanceTo(t)*.5,a=-this.direction.dot(Js),o=fi.dot(this.direction),l=-fi.dot(Js),c=fi.lengthSq(),u=Math.abs(1-a*a);let h,f,d,g;if(u>0)if(h=a*l-o,f=a*o-l,g=s*u,h>=0)if(f>=-g)if(f<=g){const v=1/u;h*=v,f*=v,d=h*(h+a*f+2*o)+f*(a*h+f+2*l)+c}else f=s,h=Math.max(0,-(a*f+o)),d=-h*h+f*(f+2*l)+c;else f=-s,h=Math.max(0,-(a*f+o)),d=-h*h+f*(f+2*l)+c;else f<=-g?(h=Math.max(0,-(-a*s+o)),f=h>0?-s:Math.min(Math.max(-s,-l),s),d=-h*h+f*(f+2*l)+c):f<=g?(h=0,f=Math.min(Math.max(-s,-l),s),d=f*(f+2*l)+c):(h=Math.max(0,-(a*s+o)),f=h>0?s:Math.min(Math.max(-s,-l),s),d=-h*h+f*(f+2*l)+c);else f=a>0?-s:s,h=Math.max(0,-(a*f+o)),d=-h*h+f*(f+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(Uo).addScaledVector(Js,f),d}intersectSphere(e,t){Wn.subVectors(e.center,this.origin);const i=Wn.dot(this.direction),r=Wn.dot(Wn)-i*i,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,a,o,l;const c=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,f=this.origin;return c>=0?(i=(e.min.x-f.x)*c,r=(e.max.x-f.x)*c):(i=(e.max.x-f.x)*c,r=(e.min.x-f.x)*c),u>=0?(s=(e.min.y-f.y)*u,a=(e.max.y-f.y)*u):(s=(e.max.y-f.y)*u,a=(e.min.y-f.y)*u),i>a||s>r||((s>i||isNaN(i))&&(i=s),(a<r||isNaN(r))&&(r=a),h>=0?(o=(e.min.z-f.z)*h,l=(e.max.z-f.z)*h):(o=(e.max.z-f.z)*h,l=(e.min.z-f.z)*h),i>l||o>r)||((o>i||i!==i)&&(i=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,Wn)!==null}intersectTriangle(e,t,i,r,s){No.subVectors(t,e),Qs.subVectors(i,e),Io.crossVectors(No,Qs);let a=this.direction.dot(Io),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;fi.subVectors(this.origin,e);const l=o*this.direction.dot(Qs.crossVectors(fi,Qs));if(l<0)return null;const c=o*this.direction.dot(No.cross(fi));if(c<0||l+c>a)return null;const u=-o*fi.dot(Io);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ut{constructor(e,t,i,r,s,a,o,l,c,u,h,f,d,g,v,m){ut.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c,u,h,f,d,g,v,m)}set(e,t,i,r,s,a,o,l,c,u,h,f,d,g,v,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=i,p[12]=r,p[1]=s,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=u,p[10]=h,p[14]=f,p[3]=d,p[7]=g,p[11]=v,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ut().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/or.setFromMatrixColumn(e,0).length(),s=1/or.setFromMatrixColumn(e,1).length(),a=1/or.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){const f=a*u,d=a*h,g=o*u,v=o*h;t[0]=l*u,t[4]=-l*h,t[8]=c,t[1]=d+g*c,t[5]=f-v*c,t[9]=-o*l,t[2]=v-f*c,t[6]=g+d*c,t[10]=a*l}else if(e.order==="YXZ"){const f=l*u,d=l*h,g=c*u,v=c*h;t[0]=f+v*o,t[4]=g*o-d,t[8]=a*c,t[1]=a*h,t[5]=a*u,t[9]=-o,t[2]=d*o-g,t[6]=v+f*o,t[10]=a*l}else if(e.order==="ZXY"){const f=l*u,d=l*h,g=c*u,v=c*h;t[0]=f-v*o,t[4]=-a*h,t[8]=g+d*o,t[1]=d+g*o,t[5]=a*u,t[9]=v-f*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const f=a*u,d=a*h,g=o*u,v=o*h;t[0]=l*u,t[4]=g*c-d,t[8]=f*c+v,t[1]=l*h,t[5]=v*c+f,t[9]=d*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const f=a*l,d=a*c,g=o*l,v=o*c;t[0]=l*u,t[4]=v-f*h,t[8]=g*h+d,t[1]=h,t[5]=a*u,t[9]=-o*u,t[2]=-c*u,t[6]=d*h+g,t[10]=f-v*h}else if(e.order==="XZY"){const f=a*l,d=a*c,g=o*l,v=o*c;t[0]=l*u,t[4]=-h,t[8]=c*u,t[1]=f*h+v,t[5]=a*u,t[9]=d*h-g,t[2]=g*h-d,t[6]=o*u,t[10]=v*h+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(T0,e,E0)}lookAt(e,t,i){const r=this.elements;return un.subVectors(e,t),un.lengthSq()===0&&(un.z=1),un.normalize(),di.crossVectors(i,un),di.lengthSq()===0&&(Math.abs(i.z)===1?un.x+=1e-4:un.z+=1e-4,un.normalize(),di.crossVectors(i,un)),di.normalize(),ea.crossVectors(un,di),r[0]=di.x,r[4]=ea.x,r[8]=un.x,r[1]=di.y,r[5]=ea.y,r[9]=un.y,r[2]=di.z,r[6]=ea.z,r[10]=un.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],u=i[1],h=i[5],f=i[9],d=i[13],g=i[2],v=i[6],m=i[10],p=i[14],y=i[3],x=i[7],_=i[11],S=i[15],T=r[0],E=r[4],A=r[8],M=r[12],b=r[1],L=r[5],P=r[9],I=r[13],F=r[2],K=r[6],G=r[10],$=r[14],O=r[3],W=r[7],Y=r[11],N=r[15];return s[0]=a*T+o*b+l*F+c*O,s[4]=a*E+o*L+l*K+c*W,s[8]=a*A+o*P+l*G+c*Y,s[12]=a*M+o*I+l*$+c*N,s[1]=u*T+h*b+f*F+d*O,s[5]=u*E+h*L+f*K+d*W,s[9]=u*A+h*P+f*G+d*Y,s[13]=u*M+h*I+f*$+d*N,s[2]=g*T+v*b+m*F+p*O,s[6]=g*E+v*L+m*K+p*W,s[10]=g*A+v*P+m*G+p*Y,s[14]=g*M+v*I+m*$+p*N,s[3]=y*T+x*b+_*F+S*O,s[7]=y*E+x*L+_*K+S*W,s[11]=y*A+x*P+_*G+S*Y,s[15]=y*M+x*I+_*$+S*N,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],u=e[2],h=e[6],f=e[10],d=e[14],g=e[3],v=e[7],m=e[11],p=e[15];return g*(+s*l*h-r*c*h-s*o*f+i*c*f+r*o*d-i*l*d)+v*(+t*l*d-t*c*f+s*a*f-r*a*d+r*c*u-s*l*u)+m*(+t*c*h-t*o*d-s*a*h+i*a*d+s*o*u-i*c*u)+p*(-r*o*u-t*l*h+t*o*f+r*a*h-i*a*f+i*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],h=e[9],f=e[10],d=e[11],g=e[12],v=e[13],m=e[14],p=e[15],y=h*m*c-v*f*c+v*l*d-o*m*d-h*l*p+o*f*p,x=g*f*c-u*m*c-g*l*d+a*m*d+u*l*p-a*f*p,_=u*v*c-g*h*c+g*o*d-a*v*d-u*o*p+a*h*p,S=g*h*l-u*v*l-g*o*f+a*v*f+u*o*m-a*h*m,T=t*y+i*x+r*_+s*S;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/T;return e[0]=y*E,e[1]=(v*f*s-h*m*s-v*r*d+i*m*d+h*r*p-i*f*p)*E,e[2]=(o*m*s-v*l*s+v*r*c-i*m*c-o*r*p+i*l*p)*E,e[3]=(h*l*s-o*f*s-h*r*c+i*f*c+o*r*d-i*l*d)*E,e[4]=x*E,e[5]=(u*m*s-g*f*s+g*r*d-t*m*d-u*r*p+t*f*p)*E,e[6]=(g*l*s-a*m*s-g*r*c+t*m*c+a*r*p-t*l*p)*E,e[7]=(a*f*s-u*l*s+u*r*c-t*f*c-a*r*d+t*l*d)*E,e[8]=_*E,e[9]=(g*h*s-u*v*s-g*i*d+t*v*d+u*i*p-t*h*p)*E,e[10]=(a*v*s-g*o*s+g*i*c-t*v*c-a*i*p+t*o*p)*E,e[11]=(u*o*s-a*h*s-u*i*c+t*h*c+a*i*d-t*o*d)*E,e[12]=S*E,e[13]=(u*v*r-g*h*r+g*i*f-t*v*f-u*i*m+t*h*m)*E,e[14]=(g*o*r-a*v*r-g*i*l+t*v*l+a*i*m-t*o*m)*E,e[15]=(a*h*r-u*o*r+u*i*l-t*h*l-a*i*f+t*o*f)*E,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,a=e.x,o=e.y,l=e.z,c=s*a,u=s*o;return this.set(c*a+i,c*o-r*l,c*l+r*o,0,c*o+r*l,u*o+i,u*l-r*a,0,c*l-r*o,u*l+r*a,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,a){return this.set(1,i,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,u=a+a,h=o+o,f=s*c,d=s*u,g=s*h,v=a*u,m=a*h,p=o*h,y=l*c,x=l*u,_=l*h,S=i.x,T=i.y,E=i.z;return r[0]=(1-(v+p))*S,r[1]=(d+_)*S,r[2]=(g-x)*S,r[3]=0,r[4]=(d-_)*T,r[5]=(1-(f+p))*T,r[6]=(m+y)*T,r[7]=0,r[8]=(g+x)*E,r[9]=(m-y)*E,r[10]=(1-(f+v))*E,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=or.set(r[0],r[1],r[2]).length();const a=or.set(r[4],r[5],r[6]).length(),o=or.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Cn.copy(this);const c=1/s,u=1/a,h=1/o;return Cn.elements[0]*=c,Cn.elements[1]*=c,Cn.elements[2]*=c,Cn.elements[4]*=u,Cn.elements[5]*=u,Cn.elements[6]*=u,Cn.elements[8]*=h,Cn.elements[9]*=h,Cn.elements[10]*=h,t.setFromRotationMatrix(Cn),i.x=s,i.y=a,i.z=o,this}makePerspective(e,t,i,r,s,a,o=Zn){const l=this.elements,c=2*s/(t-e),u=2*s/(i-r),h=(t+e)/(t-e),f=(i+r)/(i-r);let d,g;if(o===Zn)d=-(a+s)/(a-s),g=-2*a*s/(a-s);else if(o===Ga)d=-a/(a-s),g=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=h,l[12]=0,l[1]=0,l[5]=u,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=d,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,i,r,s,a,o=Zn){const l=this.elements,c=1/(t-e),u=1/(i-r),h=1/(a-s),f=(t+e)*c,d=(i+r)*u;let g,v;if(o===Zn)g=(a+s)*h,v=-2*h;else if(o===Ga)g=s*h,v=-1*h;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-f,l[1]=0,l[5]=2*u,l[9]=0,l[13]=-d,l[2]=0,l[6]=0,l[10]=v,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const or=new te,Cn=new ut,T0=new te(0,0,0),E0=new te(1,1,1),di=new te,ea=new te,un=new te,gh=new ut,vh=new Yi;class ii{constructor(e=0,t=0,i=0,r=ii.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],l=r[1],c=r[5],u=r[9],h=r[2],f=r[6],d=r[10];switch(t){case"XYZ":this._y=Math.asin(et(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,d),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(f,c),this._z=0);break;case"YXZ":this._x=Math.asin(-et(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(et(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-h,d),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-et(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(et(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-et(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return gh.makeRotationFromQuaternion(e),this.setFromRotationMatrix(gh,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return vh.setFromEuler(this),this.setFromQuaternion(vh,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}ii.DEFAULT_ORDER="XYZ";class nu{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let w0=0;const _h=new te,lr=new Yi,jn=new ut,ta=new te,is=new te,A0=new te,C0=new Yi,xh=new te(1,0,0),yh=new te(0,1,0),Sh=new te(0,0,1),bh={type:"added"},R0={type:"removed"},cr={type:"childadded",child:null},Fo={type:"childremoved",child:null};class rn extends Ki{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:w0++}),this.uuid=Us(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=rn.DEFAULT_UP.clone();const e=new te,t=new ii,i=new Yi,r=new te(1,1,1);function s(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new ut},normalMatrix:{value:new Ze}}),this.matrix=new ut,this.matrixWorld=new ut,this.matrixAutoUpdate=rn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=rn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new nu,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return lr.setFromAxisAngle(e,t),this.quaternion.multiply(lr),this}rotateOnWorldAxis(e,t){return lr.setFromAxisAngle(e,t),this.quaternion.premultiply(lr),this}rotateX(e){return this.rotateOnAxis(xh,e)}rotateY(e){return this.rotateOnAxis(yh,e)}rotateZ(e){return this.rotateOnAxis(Sh,e)}translateOnAxis(e,t){return _h.copy(e).applyQuaternion(this.quaternion),this.position.add(_h.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(xh,e)}translateY(e){return this.translateOnAxis(yh,e)}translateZ(e){return this.translateOnAxis(Sh,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(jn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?ta.copy(e):ta.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),is.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?jn.lookAt(is,ta,this.up):jn.lookAt(ta,is,this.up),this.quaternion.setFromRotationMatrix(jn),r&&(jn.extractRotation(r.matrixWorld),lr.setFromRotationMatrix(jn),this.quaternion.premultiply(lr.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(bh),cr.child=e,this.dispatchEvent(cr),cr.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(R0),Fo.child=e,this.dispatchEvent(Fo),Fo.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),jn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),jn.multiply(e.parent.matrixWorld)),e.applyMatrix4(jn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(bh),cr.child=e,this.dispatchEvent(cr),cr.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(is,e,A0),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(is,C0,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const h=l[c];s(e.shapes,h)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(s(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),u=a(e.images),h=a(e.shapes),f=a(e.skeletons),d=a(e.animations),g=a(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),h.length>0&&(i.shapes=h),f.length>0&&(i.skeletons=f),d.length>0&&(i.animations=d),g.length>0&&(i.nodes=g)}return i.object=r,i;function a(o){const l=[];for(const c in o){const u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}rn.DEFAULT_UP=new te(0,1,0);rn.DEFAULT_MATRIX_AUTO_UPDATE=!0;rn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Rn=new te,Xn=new te,Oo=new te,Yn=new te,ur=new te,hr=new te,Mh=new te,ko=new te,Bo=new te,zo=new te,Vo=new gt,Go=new gt,Ho=new gt;class Ln{constructor(e=new te,t=new te,i=new te){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Rn.subVectors(e,t),r.cross(Rn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){Rn.subVectors(r,t),Xn.subVectors(i,t),Oo.subVectors(e,t);const a=Rn.dot(Rn),o=Rn.dot(Xn),l=Rn.dot(Oo),c=Xn.dot(Xn),u=Xn.dot(Oo),h=a*c-o*o;if(h===0)return s.set(0,0,0),null;const f=1/h,d=(c*l-o*u)*f,g=(a*u-o*l)*f;return s.set(1-d-g,g,d)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,Yn)===null?!1:Yn.x>=0&&Yn.y>=0&&Yn.x+Yn.y<=1}static getInterpolation(e,t,i,r,s,a,o,l){return this.getBarycoord(e,t,i,r,Yn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Yn.x),l.addScaledVector(a,Yn.y),l.addScaledVector(o,Yn.z),l)}static getInterpolatedAttribute(e,t,i,r,s,a){return Vo.setScalar(0),Go.setScalar(0),Ho.setScalar(0),Vo.fromBufferAttribute(e,t),Go.fromBufferAttribute(e,i),Ho.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Vo,s.x),a.addScaledVector(Go,s.y),a.addScaledVector(Ho,s.z),a}static isFrontFacing(e,t,i,r){return Rn.subVectors(i,t),Xn.subVectors(e,t),Rn.cross(Xn).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Rn.subVectors(this.c,this.b),Xn.subVectors(this.a,this.b),Rn.cross(Xn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Ln.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Ln.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return Ln.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return Ln.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Ln.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let a,o;ur.subVectors(r,i),hr.subVectors(s,i),ko.subVectors(e,i);const l=ur.dot(ko),c=hr.dot(ko);if(l<=0&&c<=0)return t.copy(i);Bo.subVectors(e,r);const u=ur.dot(Bo),h=hr.dot(Bo);if(u>=0&&h<=u)return t.copy(r);const f=l*h-u*c;if(f<=0&&l>=0&&u<=0)return a=l/(l-u),t.copy(i).addScaledVector(ur,a);zo.subVectors(e,s);const d=ur.dot(zo),g=hr.dot(zo);if(g>=0&&d<=g)return t.copy(s);const v=d*c-l*g;if(v<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(i).addScaledVector(hr,o);const m=u*g-d*h;if(m<=0&&h-u>=0&&d-g>=0)return Mh.subVectors(s,r),o=(h-u)/(h-u+(d-g)),t.copy(r).addScaledVector(Mh,o);const p=1/(m+v+f);return a=v*p,o=f*p,t.copy(i).addScaledVector(ur,a).addScaledVector(hr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Gp={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},pi={h:0,s:0,l:0},na={h:0,s:0,l:0};function Wo(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class Ke{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=_n){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,st.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=st.workingColorSpace){return this.r=e,this.g=t,this.b=i,st.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=st.workingColorSpace){if(e=h0(e,1),t=et(t,0,1),i=et(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,a=2*i-s;this.r=Wo(a,s,e+1/3),this.g=Wo(a,s,e),this.b=Wo(a,s,e-1/3)}return st.toWorkingColorSpace(this,r),this}setStyle(e,t=_n){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=_n){const i=Gp[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Qn(e.r),this.g=Qn(e.g),this.b=Qn(e.b),this}copyLinearToSRGB(e){return this.r=Ar(e.r),this.g=Ar(e.g),this.b=Ar(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=_n){return st.fromWorkingColorSpace(Bt.copy(this),e),Math.round(et(Bt.r*255,0,255))*65536+Math.round(et(Bt.g*255,0,255))*256+Math.round(et(Bt.b*255,0,255))}getHexString(e=_n){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=st.workingColorSpace){st.fromWorkingColorSpace(Bt.copy(this),t);const i=Bt.r,r=Bt.g,s=Bt.b,a=Math.max(i,r,s),o=Math.min(i,r,s);let l,c;const u=(o+a)/2;if(o===a)l=0,c=0;else{const h=a-o;switch(c=u<=.5?h/(a+o):h/(2-a-o),a){case i:l=(r-s)/h+(r<s?6:0);break;case r:l=(s-i)/h+2;break;case s:l=(i-r)/h+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=st.workingColorSpace){return st.fromWorkingColorSpace(Bt.copy(this),t),e.r=Bt.r,e.g=Bt.g,e.b=Bt.b,e}getStyle(e=_n){st.fromWorkingColorSpace(Bt.copy(this),e);const t=Bt.r,i=Bt.g,r=Bt.b;return e!==_n?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(pi),this.setHSL(pi.h+e,pi.s+t,pi.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(pi),e.getHSL(na);const i=Ao(pi.h,na.h,t),r=Ao(pi.s,na.s,t),s=Ao(pi.l,na.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Bt=new Ke;Ke.NAMES=Gp;let P0=0;class Ns extends Ki{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:P0++}),this.uuid=Us(),this.name="",this.type="Material",this.blending=Er,this.side=Mi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Rl,this.blendDst=Pl,this.blendEquation=ki,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ke(0,0,0),this.blendAlpha=0,this.depthFunc=Pr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ch,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=nr,this.stencilZFail=nr,this.stencilZPass=nr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Er&&(i.blending=this.blending),this.side!==Mi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Rl&&(i.blendSrc=this.blendSrc),this.blendDst!==Pl&&(i.blendDst=this.blendDst),this.blendEquation!==ki&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Pr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ch&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==nr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==nr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==nr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const a=[];for(const o in s){const l=s[o];delete l.metadata,a.push(l)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(i.textures=s),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class Is extends Ns{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ke(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ii,this.combine=wp,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const St=new te,ia=new je;class sn{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=uh,this.updateRanges=[],this.gpuType=Bn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)ia.fromBufferAttribute(this,t),ia.applyMatrix3(e),this.setXY(t,ia.x,ia.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.applyMatrix3(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.applyMatrix4(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.applyNormalMatrix(e),this.setXYZ(t,St.x,St.y,St.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)St.fromBufferAttribute(this,t),St.transformDirection(e),this.setXYZ(t,St.x,St.y,St.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=es(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=tn(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=es(t,this.array)),t}setX(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=es(t,this.array)),t}setY(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=es(t,this.array)),t}setZ(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=es(t,this.array)),t}setW(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array),r=tn(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array),r=tn(r,this.array),s=tn(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==uh&&(e.usage=this.usage),e}}class Hp extends sn{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Wp extends sn{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class an extends sn{constructor(e,t,i){super(new Float32Array(e),t,i)}}let D0=0;const gn=new ut,jo=new rn,fr=new te,hn=new ai,rs=new ai,Rt=new te;class dn extends Ki{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:D0++}),this.uuid=Us(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Bp(e)?Wp:Hp)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Ze().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return gn.makeRotationFromQuaternion(e),this.applyMatrix4(gn),this}rotateX(e){return gn.makeRotationX(e),this.applyMatrix4(gn),this}rotateY(e){return gn.makeRotationY(e),this.applyMatrix4(gn),this}rotateZ(e){return gn.makeRotationZ(e),this.applyMatrix4(gn),this}translate(e,t,i){return gn.makeTranslation(e,t,i),this.applyMatrix4(gn),this}scale(e,t,i){return gn.makeScale(e,t,i),this.applyMatrix4(gn),this}lookAt(e){return jo.lookAt(e),jo.updateMatrix(),this.applyMatrix4(jo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(fr).negate(),this.translate(fr.x,fr.y,fr.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let r=0,s=e.length;r<s;r++){const a=e[r];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new an(i,3))}else{const i=Math.min(e.length,t.count);for(let r=0;r<i;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ai);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new te(-1/0,-1/0,-1/0),new te(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];hn.setFromBufferAttribute(s),this.morphTargetsRelative?(Rt.addVectors(this.boundingBox.min,hn.min),this.boundingBox.expandByPoint(Rt),Rt.addVectors(this.boundingBox.max,hn.max),this.boundingBox.expandByPoint(Rt)):(this.boundingBox.expandByPoint(hn.min),this.boundingBox.expandByPoint(hn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Zi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new te,1/0);return}if(e){const i=this.boundingSphere.center;if(hn.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];rs.setFromBufferAttribute(o),this.morphTargetsRelative?(Rt.addVectors(hn.min,rs.min),hn.expandByPoint(Rt),Rt.addVectors(hn.max,rs.max),hn.expandByPoint(Rt)):(hn.expandByPoint(rs.min),hn.expandByPoint(rs.max))}hn.getCenter(i);let r=0;for(let s=0,a=e.count;s<a;s++)Rt.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(Rt));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)Rt.fromBufferAttribute(o,c),l&&(fr.fromBufferAttribute(e,c),Rt.add(fr)),r=Math.max(r,i.distanceToSquared(Rt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new sn(new Float32Array(4*i.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let A=0;A<i.count;A++)o[A]=new te,l[A]=new te;const c=new te,u=new te,h=new te,f=new je,d=new je,g=new je,v=new te,m=new te;function p(A,M,b){c.fromBufferAttribute(i,A),u.fromBufferAttribute(i,M),h.fromBufferAttribute(i,b),f.fromBufferAttribute(s,A),d.fromBufferAttribute(s,M),g.fromBufferAttribute(s,b),u.sub(c),h.sub(c),d.sub(f),g.sub(f);const L=1/(d.x*g.y-g.x*d.y);isFinite(L)&&(v.copy(u).multiplyScalar(g.y).addScaledVector(h,-d.y).multiplyScalar(L),m.copy(h).multiplyScalar(d.x).addScaledVector(u,-g.x).multiplyScalar(L),o[A].add(v),o[M].add(v),o[b].add(v),l[A].add(m),l[M].add(m),l[b].add(m))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let A=0,M=y.length;A<M;++A){const b=y[A],L=b.start,P=b.count;for(let I=L,F=L+P;I<F;I+=3)p(e.getX(I+0),e.getX(I+1),e.getX(I+2))}const x=new te,_=new te,S=new te,T=new te;function E(A){S.fromBufferAttribute(r,A),T.copy(S);const M=o[A];x.copy(M),x.sub(S.multiplyScalar(S.dot(M))).normalize(),_.crossVectors(T,M);const L=_.dot(l[A])<0?-1:1;a.setXYZW(A,x.x,x.y,x.z,L)}for(let A=0,M=y.length;A<M;++A){const b=y[A],L=b.start,P=b.count;for(let I=L,F=L+P;I<F;I+=3)E(e.getX(I+0)),E(e.getX(I+1)),E(e.getX(I+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new sn(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let f=0,d=i.count;f<d;f++)i.setXYZ(f,0,0,0);const r=new te,s=new te,a=new te,o=new te,l=new te,c=new te,u=new te,h=new te;if(e)for(let f=0,d=e.count;f<d;f+=3){const g=e.getX(f+0),v=e.getX(f+1),m=e.getX(f+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,v),a.fromBufferAttribute(t,m),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),o.fromBufferAttribute(i,g),l.fromBufferAttribute(i,v),c.fromBufferAttribute(i,m),o.add(u),l.add(u),c.add(u),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(v,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let f=0,d=t.count;f<d;f+=3)r.fromBufferAttribute(t,f+0),s.fromBufferAttribute(t,f+1),a.fromBufferAttribute(t,f+2),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),i.setXYZ(f+0,u.x,u.y,u.z),i.setXYZ(f+1,u.x,u.y,u.z),i.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Rt.fromBufferAttribute(e,t),Rt.normalize(),e.setXYZ(t,Rt.x,Rt.y,Rt.z)}toNonIndexed(){function e(o,l){const c=o.array,u=o.itemSize,h=o.normalized,f=new c.constructor(l.length*u);let d=0,g=0;for(let v=0,m=l.length;v<m;v++){o.isInterleavedBufferAttribute?d=l[v]*o.data.stride+o.offset:d=l[v]*u;for(let p=0;p<u;p++)f[g++]=c[d++]}return new sn(f,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new dn,i=this.index.array,r=this.attributes;for(const o in r){const l=r[o],c=e(l,i);t.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let u=0,h=c.length;u<h;u++){const f=c[u],d=e(f,i);l.push(d)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let h=0,f=c.length;h<f;h++){const d=c[h];u.push(d.toJSON(e.data))}u.length>0&&(r[l]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(t));const r=e.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],h=s[c];for(let f=0,d=h.length;f<d;f++)u.push(h[f].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,u=a.length;c<u;c++){const h=a[c];this.addGroup(h.start,h.count,h.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Th=new ut,Ri=new ro,ra=new Zi,Eh=new te,sa=new te,aa=new te,oa=new te,Xo=new te,la=new te,wh=new te,ca=new te;class zt extends rn{constructor(e=new dn,t=new Is){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){la.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=o[l],h=s[l];u!==0&&(Xo.fromBufferAttribute(h,e),a?la.addScaledVector(Xo,u):la.addScaledVector(Xo.sub(t),u))}t.add(la)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),ra.copy(i.boundingSphere),ra.applyMatrix4(s),Ri.copy(e.ray).recast(e.near),!(ra.containsPoint(Ri.origin)===!1&&(Ri.intersectSphere(ra,Eh)===null||Ri.origin.distanceToSquared(Eh)>(e.far-e.near)**2))&&(Th.copy(s).invert(),Ri.copy(e.ray).applyMatrix4(Th),!(i.boundingBox!==null&&Ri.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Ri)))}_computeIntersections(e,t,i){let r;const s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,f=s.groups,d=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,v=f.length;g<v;g++){const m=f[g],p=a[m.materialIndex],y=Math.max(m.start,d.start),x=Math.min(o.count,Math.min(m.start+m.count,d.start+d.count));for(let _=y,S=x;_<S;_+=3){const T=o.getX(_),E=o.getX(_+1),A=o.getX(_+2);r=ua(this,p,e,i,c,u,h,T,E,A),r&&(r.faceIndex=Math.floor(_/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,d.start),v=Math.min(o.count,d.start+d.count);for(let m=g,p=v;m<p;m+=3){const y=o.getX(m),x=o.getX(m+1),_=o.getX(m+2);r=ua(this,a,e,i,c,u,h,y,x,_),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,v=f.length;g<v;g++){const m=f[g],p=a[m.materialIndex],y=Math.max(m.start,d.start),x=Math.min(l.count,Math.min(m.start+m.count,d.start+d.count));for(let _=y,S=x;_<S;_+=3){const T=_,E=_+1,A=_+2;r=ua(this,p,e,i,c,u,h,T,E,A),r&&(r.faceIndex=Math.floor(_/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,d.start),v=Math.min(l.count,d.start+d.count);for(let m=g,p=v;m<p;m+=3){const y=m,x=m+1,_=m+2;r=ua(this,a,e,i,c,u,h,y,x,_),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function L0(n,e,t,i,r,s,a,o){let l;if(e.side===qt?l=i.intersectTriangle(a,s,r,!0,o):l=i.intersectTriangle(r,s,a,e.side===Mi,o),l===null)return null;ca.copy(o),ca.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(ca);return c<t.near||c>t.far?null:{distance:c,point:ca.clone(),object:n}}function ua(n,e,t,i,r,s,a,o,l,c){n.getVertexPosition(o,sa),n.getVertexPosition(l,aa),n.getVertexPosition(c,oa);const u=L0(n,e,t,i,sa,aa,oa,wh);if(u){const h=new te;Ln.getBarycoord(wh,sa,aa,oa,h),r&&(u.uv=Ln.getInterpolatedAttribute(r,o,l,c,h,new je)),s&&(u.uv1=Ln.getInterpolatedAttribute(s,o,l,c,h,new je)),a&&(u.normal=Ln.getInterpolatedAttribute(a,o,l,c,h,new te),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const f={a:o,b:l,c,normal:new te,materialIndex:0};Ln.getNormal(sa,aa,oa,f.normal),u.face=f,u.barycoord=h}return u}class Fs extends dn{constructor(e=1,t=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],u=[],h=[];let f=0,d=0;g("z","y","x",-1,-1,i,t,e,a,s,0),g("z","y","x",1,-1,i,t,-e,a,s,1),g("x","z","y",1,1,e,i,t,r,a,2),g("x","z","y",1,-1,e,i,-t,r,a,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new an(c,3)),this.setAttribute("normal",new an(u,3)),this.setAttribute("uv",new an(h,2));function g(v,m,p,y,x,_,S,T,E,A,M){const b=_/E,L=S/A,P=_/2,I=S/2,F=T/2,K=E+1,G=A+1;let $=0,O=0;const W=new te;for(let Y=0;Y<G;Y++){const N=Y*L-I;for(let V=0;V<K;V++){const ee=V*b-P;W[v]=ee*y,W[m]=N*x,W[p]=F,c.push(W.x,W.y,W.z),W[v]=0,W[m]=0,W[p]=T>0?1:-1,u.push(W.x,W.y,W.z),h.push(V/E),h.push(1-Y/A),$+=1}}for(let Y=0;Y<A;Y++)for(let N=0;N<E;N++){const V=f+N+K*Y,ee=f+N+K*(Y+1),z=f+(N+1)+K*(Y+1),j=f+(N+1)+K*Y;l.push(V,ee,j),l.push(ee,z,j),O+=6}o.addGroup(d,O,M),d+=O,f+=$}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Fs(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Fr(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function Ht(n){const e={};for(let t=0;t<n.length;t++){const i=Fr(n[t]);for(const r in i)e[r]=i[r]}return e}function U0(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function jp(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:st.workingColorSpace}const ws={clone:Fr,merge:Ht};var N0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,I0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class jt extends Ns{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=N0,this.fragmentShader=I0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fr(e.uniforms),this.uniformsGroups=U0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Xp extends rn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ut,this.projectionMatrix=new ut,this.projectionMatrixInverse=new ut,this.coordinateSystem=Zn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const mi=new te,Ah=new je,Ch=new je;class yn extends Xp{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=pc*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Pa*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return pc*2*Math.atan(Math.tan(Pa*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){mi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(mi.x,mi.y).multiplyScalar(-e/mi.z),mi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(mi.x,mi.y).multiplyScalar(-e/mi.z)}getViewSize(e,t){return this.getViewBounds(e,Ah,Ch),t.subVectors(Ch,Ah)}setViewOffset(e,t,i,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Pa*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*r/l,t-=a.offsetY*i/c,r*=a.width/l,i*=a.height/c}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const dr=-90,pr=1;class F0 extends rn{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new yn(dr,pr,e,t);r.layers=this.layers,this.add(r);const s=new yn(dr,pr,e,t);s.layers=this.layers,this.add(s);const a=new yn(dr,pr,e,t);a.layers=this.layers,this.add(a);const o=new yn(dr,pr,e,t);o.layers=this.layers,this.add(o);const l=new yn(dr,pr,e,t);l.layers=this.layers,this.add(l);const c=new yn(dr,pr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,a,o,l]=t;for(const c of t)this.remove(c);if(e===Zn)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Ga)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,l,c,u]=this.children,h=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const v=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,a),e.setRenderTarget(i,2,r),e.render(t,o),e.setRenderTarget(i,3,r),e.render(t,l),e.setRenderTarget(i,4,r),e.render(t,c),i.texture.generateMipmaps=v,e.setRenderTarget(i,5,r),e.render(t,u),e.setRenderTarget(h,f,d),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Yp extends Gt{constructor(e,t,i,r,s,a,o,l,c,u){e=e!==void 0?e:[],t=t!==void 0?t:Dr,super(e,t,i,r,s,a,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class O0 extends Nn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new Yp(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Sn}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Fs(5,5,5),s=new jt({name:"CubemapFromEquirect",uniforms:Fr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:qt,blending:$n});s.uniforms.tEquirect.value=t;const a=new zt(r,s),o=t.minFilter;return t.minFilter===Vi&&(t.minFilter=Sn),new F0(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,i,r){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,r);e.setRenderTarget(s)}}class k0 extends rn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ii,this.environmentIntensity=1,this.environmentRotation=new ii,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class B0 extends Gt{constructor(e=null,t=1,i=1,r,s,a,o,l,c=fn,u=fn,h,f){super(null,a,o,l,c,u,r,s,h,f),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class mc extends sn{constructor(e,t,i,r=1){super(e,t,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const mr=new ut,Rh=new ut,ha=[],Ph=new ai,z0=new ut,ss=new zt,as=new Zi;class V0 extends zt{constructor(e,t,i){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new mc(new Float32Array(i*16),16),this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<i;r++)this.setMatrixAt(r,z0)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new ai),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,mr),Ph.copy(e.boundingBox).applyMatrix4(mr),this.boundingBox.union(Ph)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Zi),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,mr),as.copy(e.boundingSphere).applyMatrix4(mr),this.boundingSphere.union(as)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const i=t.morphTargetInfluences,r=this.morphTexture.source.data.data,s=i.length+1,a=e*s+1;for(let o=0;o<i.length;o++)i[o]=r[a+o]}raycast(e,t){const i=this.matrixWorld,r=this.count;if(ss.geometry=this.geometry,ss.material=this.material,ss.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),as.copy(this.boundingSphere),as.applyMatrix4(i),e.ray.intersectsSphere(as)!==!1))for(let s=0;s<r;s++){this.getMatrixAt(s,mr),Rh.multiplyMatrices(i,mr),ss.matrixWorld=Rh,ss.raycast(e,ha);for(let a=0,o=ha.length;a<o;a++){const l=ha[a];l.instanceId=s,l.object=this,t.push(l)}ha.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new mc(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const i=t.morphTargetInfluences,r=i.length+1;this.morphTexture===null&&(this.morphTexture=new B0(new Float32Array(r*this.count),r,this.count,Jc,Bn));const s=this.morphTexture.source.data.data;let a=0;for(let c=0;c<i.length;c++)a+=i[c];const o=this.geometry.morphTargetsRelative?1:1-a,l=r*e;s[l]=o,s.set(i,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}const Yo=new te,G0=new te,H0=new Ze;class vi{constructor(e=new te(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Yo.subVectors(i,t).cross(G0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Yo),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||H0.getNormalMatrix(e),r=this.coplanarPoint(Yo).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Pi=new Zi,fa=new te;class qp{constructor(e=new vi,t=new vi,i=new vi,r=new vi,s=new vi,a=new vi){this.planes=[e,t,i,r,s,a]}set(e,t,i,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Zn){const i=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],l=r[3],c=r[4],u=r[5],h=r[6],f=r[7],d=r[8],g=r[9],v=r[10],m=r[11],p=r[12],y=r[13],x=r[14],_=r[15];if(i[0].setComponents(l-s,f-c,m-d,_-p).normalize(),i[1].setComponents(l+s,f+c,m+d,_+p).normalize(),i[2].setComponents(l+a,f+u,m+g,_+y).normalize(),i[3].setComponents(l-a,f-u,m-g,_-y).normalize(),i[4].setComponents(l-o,f-h,m-v,_-x).normalize(),t===Zn)i[5].setComponents(l+o,f+h,m+v,_+x).normalize();else if(t===Ga)i[5].setComponents(o,h,v,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Pi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Pi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Pi)}intersectsSprite(e){return Pi.center.set(0,0,0),Pi.radius=.7071067811865476,Pi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Pi)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(fa.x=r.normal.x>0?e.max.x:e.min.x,fa.y=r.normal.y>0?e.max.y:e.min.y,fa.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(fa)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class iu extends Ns{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ke(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Wa=new te,ja=new te,Dh=new ut,os=new ro,da=new Zi,qo=new te,Lh=new te;class W0 extends rn{constructor(e=new dn,t=new iu){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let r=1,s=t.count;r<s;r++)Wa.fromBufferAttribute(t,r-1),ja.fromBufferAttribute(t,r),i[r]=i[r-1],i[r]+=Wa.distanceTo(ja);e.setAttribute("lineDistance",new an(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),da.copy(i.boundingSphere),da.applyMatrix4(r),da.radius+=s,e.ray.intersectsSphere(da)===!1)return;Dh.copy(r).invert(),os.copy(e.ray).applyMatrix4(Dh);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,u=i.index,f=i.attributes.position;if(u!==null){const d=Math.max(0,a.start),g=Math.min(u.count,a.start+a.count);for(let v=d,m=g-1;v<m;v+=c){const p=u.getX(v),y=u.getX(v+1),x=pa(this,e,os,l,p,y);x&&t.push(x)}if(this.isLineLoop){const v=u.getX(g-1),m=u.getX(d),p=pa(this,e,os,l,v,m);p&&t.push(p)}}else{const d=Math.max(0,a.start),g=Math.min(f.count,a.start+a.count);for(let v=d,m=g-1;v<m;v+=c){const p=pa(this,e,os,l,v,v+1);p&&t.push(p)}if(this.isLineLoop){const v=pa(this,e,os,l,g-1,d);v&&t.push(v)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function pa(n,e,t,i,r,s){const a=n.geometry.attributes.position;if(Wa.fromBufferAttribute(a,r),ja.fromBufferAttribute(a,s),t.distanceSqToSegment(Wa,ja,qo,Lh)>i)return;qo.applyMatrix4(n.matrixWorld);const l=e.ray.origin.distanceTo(qo);if(!(l<e.near||l>e.far))return{distance:l,point:Lh.clone().applyMatrix4(n.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:n}}const Uh=new te,Nh=new te;class Kp extends W0{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let r=0,s=t.count;r<s;r+=2)Uh.fromBufferAttribute(t,r),Nh.fromBufferAttribute(t,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+Uh.distanceTo(Nh);e.setAttribute("lineDistance",new an(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class xr extends rn{constructor(){super(),this.isGroup=!0,this.type="Group"}}class Zp extends Gt{constructor(e,t,i,r,s,a,o,l,c,u=wr){if(u!==wr&&u!==Nr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&u===wr&&(i=Xi),i===void 0&&u===Nr&&(i=Ur),super(null,r,s,a,o,l,u,i,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:fn,this.minFilter=l!==void 0?l:fn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class $i extends dn{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(i),l=Math.floor(r),c=o+1,u=l+1,h=e/o,f=t/l,d=[],g=[],v=[],m=[];for(let p=0;p<u;p++){const y=p*f-a;for(let x=0;x<c;x++){const _=x*h-s;g.push(_,-y,0),v.push(0,0,1),m.push(x/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let y=0;y<o;y++){const x=y+c*p,_=y+c*(p+1),S=y+1+c*(p+1),T=y+1+c*p;d.push(x,_,T),d.push(_,S,T)}this.setIndex(d),this.setAttribute("position",new an(g,3)),this.setAttribute("normal",new an(v,3)),this.setAttribute("uv",new an(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new $i(e.width,e.height,e.widthSegments,e.heightSegments)}}class so extends dn{constructor(e=1,t=32,i=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const l=Math.min(a+o,Math.PI);let c=0;const u=[],h=new te,f=new te,d=[],g=[],v=[],m=[];for(let p=0;p<=i;p++){const y=[],x=p/i;let _=0;p===0&&a===0?_=.5/t:p===i&&l===Math.PI&&(_=-.5/t);for(let S=0;S<=t;S++){const T=S/t;h.x=-e*Math.cos(r+T*s)*Math.sin(a+x*o),h.y=e*Math.cos(a+x*o),h.z=e*Math.sin(r+T*s)*Math.sin(a+x*o),g.push(h.x,h.y,h.z),f.copy(h).normalize(),v.push(f.x,f.y,f.z),m.push(T+_,1-x),y.push(c++)}u.push(y)}for(let p=0;p<i;p++)for(let y=0;y<t;y++){const x=u[p][y+1],_=u[p][y],S=u[p+1][y],T=u[p+1][y+1];(p!==0||a>0)&&d.push(x,_,T),(p!==i-1||l<Math.PI)&&d.push(_,S,T)}this.setIndex(d),this.setAttribute("position",new an(g,3)),this.setAttribute("normal",new an(v,3)),this.setAttribute("uv",new an(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new so(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class $p extends Ns{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=e0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Jp extends Ns{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Qp extends Xp{constructor(e=-1,t=1,i=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,a=i+e,o=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class j0 extends dn{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){const e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}}class X0 extends yn{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class Y0{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Ih(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=Ih();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function Ih(){return performance.now()}const Fh=new ut;class q0{constructor(e,t,i=0,r=1/0){this.ray=new ro(e,t),this.near=i,this.far=r,this.camera=null,this.layers=new nu,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Fh.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Fh),this}intersectObject(e,t=!0,i=[]){return gc(e,this,i,t),i.sort(Oh),i}intersectObjects(e,t=!0,i=[]){for(let r=0,s=e.length;r<s;r++)gc(e[r],this,i,t);return i.sort(Oh),i}}function Oh(n,e){return n.distance-e.distance}function gc(n,e,t,i){let r=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(r=!1),r===!0&&i===!0){const s=n.children;for(let a=0,o=s.length;a<o;a++)gc(s[a],e,t,!0)}}class kh{constructor(e=1,t=0,i=0){return this.radius=e,this.phi=t,this.theta=i,this}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=et(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(et(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class K0 extends Ki{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}}function Bh(n,e,t,i){const r=Z0(i);switch(t){case Dp:return n*e;case Up:return n*e;case Np:return n*e*2;case Jc:return n*e/r.components*r.byteLength;case Qc:return n*e/r.components*r.byteLength;case Ip:return n*e*2/r.components*r.byteLength;case eu:return n*e*2/r.components*r.byteLength;case Lp:return n*e*3/r.components*r.byteLength;case Un:return n*e*4/r.components*r.byteLength;case tu:return n*e*4/r.components*r.byteLength;case Ea:case wa:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Aa:case Ca:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Hl:case jl:return Math.max(n,16)*Math.max(e,8)/4;case Gl:case Wl:return Math.max(n,8)*Math.max(e,8)/2;case Xl:case Yl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case ql:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Kl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Zl:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case $l:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Jl:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Ql:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case ec:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case tc:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case nc:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case ic:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case rc:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case sc:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case ac:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case oc:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case lc:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Ra:case cc:case uc:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Fp:case hc:return Math.ceil(n/4)*Math.ceil(e/4)*8;case fc:case dc:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Z0(n){switch(n){case ni:case Cp:return{byteLength:1,components:1};case Es:case Rp:case Jn:return{byteLength:2,components:1};case Zc:case $c:return{byteLength:2,components:4};case Xi:case Kc:case Bn:return{byteLength:4,components:1};case Pp:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:qc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=qc);/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function em(){let n=null,e=!1,t=null,i=null;function r(s,a){t(s,a),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function $0(n){const e=new WeakMap;function t(o,l){const c=o.array,u=o.usage,h=c.byteLength,f=n.createBuffer();n.bindBuffer(l,f),n.bufferData(l,c,u),o.onUploadCallback();let d;if(c instanceof Float32Array)d=n.FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?d=n.HALF_FLOAT:d=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=n.SHORT;else if(c instanceof Uint32Array)d=n.UNSIGNED_INT;else if(c instanceof Int32Array)d=n.INT;else if(c instanceof Int8Array)d=n.BYTE;else if(c instanceof Uint8Array)d=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:f,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:h}}function i(o,l,c){const u=l.array,h=l.updateRanges;if(n.bindBuffer(c,o),h.length===0)n.bufferSubData(c,0,u);else{h.sort((d,g)=>d.start-g.start);let f=0;for(let d=1;d<h.length;d++){const g=h[f],v=h[d];v.start<=g.start+g.count+1?g.count=Math.max(g.count,v.start+v.count-g.start):(++f,h[f]=v)}h.length=f+1;for(let d=0,g=h.length;d<g;d++){const v=h[d];n.bufferSubData(c,v.start*u.BYTES_PER_ELEMENT,u,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(n.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:r,remove:s,update:a}}var J0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Q0=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,ex=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,tx=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,nx=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ix=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,rx=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,sx=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,ax=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,ox=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,lx=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,cx=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ux=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,hx=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,fx=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,dx=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,px=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,mx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,gx=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,vx=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,_x=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,xx=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,yx=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Sx=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,bx=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Mx=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Tx=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ex=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,wx=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ax=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Cx="gl_FragColor = linearToOutputTexel( gl_FragColor );",Rx=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Px=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Dx=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Lx=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Ux=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Nx=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Ix=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Fx=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ox=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,kx=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Bx=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,zx=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Vx=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Gx=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Hx=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Wx=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,jx=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Xx=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Yx=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,qx=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Kx=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Zx=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,$x=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Jx=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Qx=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ey=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ty=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ny=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,iy=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,ry=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,sy=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ay=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,oy=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ly=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,cy=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,uy=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,hy=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,fy=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dy=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,py=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,my=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,gy=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,vy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,_y=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xy=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,yy=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Sy=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,by=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,My=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ty=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Ey=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,wy=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Ay=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Cy=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ry=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Py=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Dy=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ly=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Uy=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Ny=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Iy=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Fy=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Oy=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ky=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,By=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,zy=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Vy=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Gy=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Hy=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Wy=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,jy=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Xy=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Yy=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,qy=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ky=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Zy=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const $y=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Jy=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Qy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,eS=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,nS=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,iS=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,rS=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,sS=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,aS=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,oS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,lS=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cS=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,uS=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,hS=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,fS=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dS=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,pS=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mS=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,gS=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vS=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,_S=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,xS=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,yS=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,SS=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,bS=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,MS=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,TS=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ES=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,wS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,AS=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,CS=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,RS=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,PS=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Je={alphahash_fragment:J0,alphahash_pars_fragment:Q0,alphamap_fragment:ex,alphamap_pars_fragment:tx,alphatest_fragment:nx,alphatest_pars_fragment:ix,aomap_fragment:rx,aomap_pars_fragment:sx,batching_pars_vertex:ax,batching_vertex:ox,begin_vertex:lx,beginnormal_vertex:cx,bsdfs:ux,iridescence_fragment:hx,bumpmap_pars_fragment:fx,clipping_planes_fragment:dx,clipping_planes_pars_fragment:px,clipping_planes_pars_vertex:mx,clipping_planes_vertex:gx,color_fragment:vx,color_pars_fragment:_x,color_pars_vertex:xx,color_vertex:yx,common:Sx,cube_uv_reflection_fragment:bx,defaultnormal_vertex:Mx,displacementmap_pars_vertex:Tx,displacementmap_vertex:Ex,emissivemap_fragment:wx,emissivemap_pars_fragment:Ax,colorspace_fragment:Cx,colorspace_pars_fragment:Rx,envmap_fragment:Px,envmap_common_pars_fragment:Dx,envmap_pars_fragment:Lx,envmap_pars_vertex:Ux,envmap_physical_pars_fragment:Wx,envmap_vertex:Nx,fog_vertex:Ix,fog_pars_vertex:Fx,fog_fragment:Ox,fog_pars_fragment:kx,gradientmap_pars_fragment:Bx,lightmap_pars_fragment:zx,lights_lambert_fragment:Vx,lights_lambert_pars_fragment:Gx,lights_pars_begin:Hx,lights_toon_fragment:jx,lights_toon_pars_fragment:Xx,lights_phong_fragment:Yx,lights_phong_pars_fragment:qx,lights_physical_fragment:Kx,lights_physical_pars_fragment:Zx,lights_fragment_begin:$x,lights_fragment_maps:Jx,lights_fragment_end:Qx,logdepthbuf_fragment:ey,logdepthbuf_pars_fragment:ty,logdepthbuf_pars_vertex:ny,logdepthbuf_vertex:iy,map_fragment:ry,map_pars_fragment:sy,map_particle_fragment:ay,map_particle_pars_fragment:oy,metalnessmap_fragment:ly,metalnessmap_pars_fragment:cy,morphinstance_vertex:uy,morphcolor_vertex:hy,morphnormal_vertex:fy,morphtarget_pars_vertex:dy,morphtarget_vertex:py,normal_fragment_begin:my,normal_fragment_maps:gy,normal_pars_fragment:vy,normal_pars_vertex:_y,normal_vertex:xy,normalmap_pars_fragment:yy,clearcoat_normal_fragment_begin:Sy,clearcoat_normal_fragment_maps:by,clearcoat_pars_fragment:My,iridescence_pars_fragment:Ty,opaque_fragment:Ey,packing:wy,premultiplied_alpha_fragment:Ay,project_vertex:Cy,dithering_fragment:Ry,dithering_pars_fragment:Py,roughnessmap_fragment:Dy,roughnessmap_pars_fragment:Ly,shadowmap_pars_fragment:Uy,shadowmap_pars_vertex:Ny,shadowmap_vertex:Iy,shadowmask_pars_fragment:Fy,skinbase_vertex:Oy,skinning_pars_vertex:ky,skinning_vertex:By,skinnormal_vertex:zy,specularmap_fragment:Vy,specularmap_pars_fragment:Gy,tonemapping_fragment:Hy,tonemapping_pars_fragment:Wy,transmission_fragment:jy,transmission_pars_fragment:Xy,uv_pars_fragment:Yy,uv_pars_vertex:qy,uv_vertex:Ky,worldpos_vertex:Zy,background_vert:$y,background_frag:Jy,backgroundCube_vert:Qy,backgroundCube_frag:eS,cube_vert:tS,cube_frag:nS,depth_vert:iS,depth_frag:rS,distanceRGBA_vert:sS,distanceRGBA_frag:aS,equirect_vert:oS,equirect_frag:lS,linedashed_vert:cS,linedashed_frag:uS,meshbasic_vert:hS,meshbasic_frag:fS,meshlambert_vert:dS,meshlambert_frag:pS,meshmatcap_vert:mS,meshmatcap_frag:gS,meshnormal_vert:vS,meshnormal_frag:_S,meshphong_vert:xS,meshphong_frag:yS,meshphysical_vert:SS,meshphysical_frag:bS,meshtoon_vert:MS,meshtoon_frag:TS,points_vert:ES,points_frag:wS,shadow_vert:AS,shadow_frag:CS,sprite_vert:RS,sprite_frag:PS},Le={common:{diffuse:{value:new Ke(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ze}},envmap:{envMap:{value:null},envMapRotation:{value:new Ze},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ze}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ze}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ze},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ze},normalScale:{value:new je(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ze},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ze}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ze}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ze}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ke(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ke(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0},uvTransform:{value:new Ze}},sprite:{diffuse:{value:new Ke(16777215)},opacity:{value:1},center:{value:new je(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}}},On={basic:{uniforms:Ht([Le.common,Le.specularmap,Le.envmap,Le.aomap,Le.lightmap,Le.fog]),vertexShader:Je.meshbasic_vert,fragmentShader:Je.meshbasic_frag},lambert:{uniforms:Ht([Le.common,Le.specularmap,Le.envmap,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.fog,Le.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Je.meshlambert_vert,fragmentShader:Je.meshlambert_frag},phong:{uniforms:Ht([Le.common,Le.specularmap,Le.envmap,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.fog,Le.lights,{emissive:{value:new Ke(0)},specular:{value:new Ke(1118481)},shininess:{value:30}}]),vertexShader:Je.meshphong_vert,fragmentShader:Je.meshphong_frag},standard:{uniforms:Ht([Le.common,Le.envmap,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.roughnessmap,Le.metalnessmap,Le.fog,Le.lights,{emissive:{value:new Ke(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Je.meshphysical_vert,fragmentShader:Je.meshphysical_frag},toon:{uniforms:Ht([Le.common,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.gradientmap,Le.fog,Le.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Je.meshtoon_vert,fragmentShader:Je.meshtoon_frag},matcap:{uniforms:Ht([Le.common,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.fog,{matcap:{value:null}}]),vertexShader:Je.meshmatcap_vert,fragmentShader:Je.meshmatcap_frag},points:{uniforms:Ht([Le.points,Le.fog]),vertexShader:Je.points_vert,fragmentShader:Je.points_frag},dashed:{uniforms:Ht([Le.common,Le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Je.linedashed_vert,fragmentShader:Je.linedashed_frag},depth:{uniforms:Ht([Le.common,Le.displacementmap]),vertexShader:Je.depth_vert,fragmentShader:Je.depth_frag},normal:{uniforms:Ht([Le.common,Le.bumpmap,Le.normalmap,Le.displacementmap,{opacity:{value:1}}]),vertexShader:Je.meshnormal_vert,fragmentShader:Je.meshnormal_frag},sprite:{uniforms:Ht([Le.sprite,Le.fog]),vertexShader:Je.sprite_vert,fragmentShader:Je.sprite_frag},background:{uniforms:{uvTransform:{value:new Ze},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Je.background_vert,fragmentShader:Je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ze}},vertexShader:Je.backgroundCube_vert,fragmentShader:Je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Je.cube_vert,fragmentShader:Je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Je.equirect_vert,fragmentShader:Je.equirect_frag},distanceRGBA:{uniforms:Ht([Le.common,Le.displacementmap,{referencePosition:{value:new te},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Je.distanceRGBA_vert,fragmentShader:Je.distanceRGBA_frag},shadow:{uniforms:Ht([Le.lights,Le.fog,{color:{value:new Ke(0)},opacity:{value:1}}]),vertexShader:Je.shadow_vert,fragmentShader:Je.shadow_frag}};On.physical={uniforms:Ht([On.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ze},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ze},clearcoatNormalScale:{value:new je(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ze},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ze},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ze},sheen:{value:0},sheenColor:{value:new Ke(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ze},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ze},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ze},transmissionSamplerSize:{value:new je},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ze},attenuationDistance:{value:0},attenuationColor:{value:new Ke(0)},specularColor:{value:new Ke(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ze},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ze},anisotropyVector:{value:new je},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ze}}]),vertexShader:Je.meshphysical_vert,fragmentShader:Je.meshphysical_frag};const ma={r:0,b:0,g:0},Di=new ii,DS=new ut;function LS(n,e,t,i,r,s,a){const o=new Ke(0);let l=s===!0?0:1,c,u,h=null,f=0,d=null;function g(x){let _=x.isScene===!0?x.background:null;return _&&_.isTexture&&(_=(x.backgroundBlurriness>0?t:e).get(_)),_}function v(x){let _=!1;const S=g(x);S===null?p(o,l):S&&S.isColor&&(p(S,1),_=!0);const T=n.xr.getEnvironmentBlendMode();T==="additive"?i.buffers.color.setClear(0,0,0,1,a):T==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,a),(n.autoClear||_)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(x,_){const S=g(_);S&&(S.isCubeTexture||S.mapping===io)?(u===void 0&&(u=new zt(new Fs(1,1,1),new jt({name:"BackgroundCubeMaterial",uniforms:Fr(On.backgroundCube.uniforms),vertexShader:On.backgroundCube.vertexShader,fragmentShader:On.backgroundCube.fragmentShader,side:qt,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(T,E,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Di.copy(_.backgroundRotation),Di.x*=-1,Di.y*=-1,Di.z*=-1,S.isCubeTexture&&S.isRenderTargetTexture===!1&&(Di.y*=-1,Di.z*=-1),u.material.uniforms.envMap.value=S,u.material.uniforms.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(DS.makeRotationFromEuler(Di)),u.material.toneMapped=st.getTransfer(S.colorSpace)!==at,(h!==S||f!==S.version||d!==n.toneMapping)&&(u.material.needsUpdate=!0,h=S,f=S.version,d=n.toneMapping),u.layers.enableAll(),x.unshift(u,u.geometry,u.material,0,0,null)):S&&S.isTexture&&(c===void 0&&(c=new zt(new $i(2,2),new jt({name:"BackgroundMaterial",uniforms:Fr(On.background.uniforms),vertexShader:On.background.vertexShader,fragmentShader:On.background.fragmentShader,side:Mi,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=S,c.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,c.material.toneMapped=st.getTransfer(S.colorSpace)!==at,S.matrixAutoUpdate===!0&&S.updateMatrix(),c.material.uniforms.uvTransform.value.copy(S.matrix),(h!==S||f!==S.version||d!==n.toneMapping)&&(c.material.needsUpdate=!0,h=S,f=S.version,d=n.toneMapping),c.layers.enableAll(),x.unshift(c,c.geometry,c.material,0,0,null))}function p(x,_){x.getRGB(ma,jp(n)),i.buffers.color.setClear(ma.r,ma.g,ma.b,_,a)}function y(){u!==void 0&&(u.geometry.dispose(),u.material.dispose()),c!==void 0&&(c.geometry.dispose(),c.material.dispose())}return{getClearColor:function(){return o},setClearColor:function(x,_=1){o.set(x),l=_,p(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(x){l=x,p(o,l)},render:v,addToRenderList:m,dispose:y}}function US(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=f(null);let s=r,a=!1;function o(b,L,P,I,F){let K=!1;const G=h(I,P,L);s!==G&&(s=G,c(s.object)),K=d(b,I,P,F),K&&g(b,I,P,F),F!==null&&e.update(F,n.ELEMENT_ARRAY_BUFFER),(K||a)&&(a=!1,_(b,L,P,I),F!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(F).buffer))}function l(){return n.createVertexArray()}function c(b){return n.bindVertexArray(b)}function u(b){return n.deleteVertexArray(b)}function h(b,L,P){const I=P.wireframe===!0;let F=i[b.id];F===void 0&&(F={},i[b.id]=F);let K=F[L.id];K===void 0&&(K={},F[L.id]=K);let G=K[I];return G===void 0&&(G=f(l()),K[I]=G),G}function f(b){const L=[],P=[],I=[];for(let F=0;F<t;F++)L[F]=0,P[F]=0,I[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:P,attributeDivisors:I,object:b,attributes:{},index:null}}function d(b,L,P,I){const F=s.attributes,K=L.attributes;let G=0;const $=P.getAttributes();for(const O in $)if($[O].location>=0){const Y=F[O];let N=K[O];if(N===void 0&&(O==="instanceMatrix"&&b.instanceMatrix&&(N=b.instanceMatrix),O==="instanceColor"&&b.instanceColor&&(N=b.instanceColor)),Y===void 0||Y.attribute!==N||N&&Y.data!==N.data)return!0;G++}return s.attributesNum!==G||s.index!==I}function g(b,L,P,I){const F={},K=L.attributes;let G=0;const $=P.getAttributes();for(const O in $)if($[O].location>=0){let Y=K[O];Y===void 0&&(O==="instanceMatrix"&&b.instanceMatrix&&(Y=b.instanceMatrix),O==="instanceColor"&&b.instanceColor&&(Y=b.instanceColor));const N={};N.attribute=Y,Y&&Y.data&&(N.data=Y.data),F[O]=N,G++}s.attributes=F,s.attributesNum=G,s.index=I}function v(){const b=s.newAttributes;for(let L=0,P=b.length;L<P;L++)b[L]=0}function m(b){p(b,0)}function p(b,L){const P=s.newAttributes,I=s.enabledAttributes,F=s.attributeDivisors;P[b]=1,I[b]===0&&(n.enableVertexAttribArray(b),I[b]=1),F[b]!==L&&(n.vertexAttribDivisor(b,L),F[b]=L)}function y(){const b=s.newAttributes,L=s.enabledAttributes;for(let P=0,I=L.length;P<I;P++)L[P]!==b[P]&&(n.disableVertexAttribArray(P),L[P]=0)}function x(b,L,P,I,F,K,G){G===!0?n.vertexAttribIPointer(b,L,P,F,K):n.vertexAttribPointer(b,L,P,I,F,K)}function _(b,L,P,I){v();const F=I.attributes,K=P.getAttributes(),G=L.defaultAttributeValues;for(const $ in K){const O=K[$];if(O.location>=0){let W=F[$];if(W===void 0&&($==="instanceMatrix"&&b.instanceMatrix&&(W=b.instanceMatrix),$==="instanceColor"&&b.instanceColor&&(W=b.instanceColor)),W!==void 0){const Y=W.normalized,N=W.itemSize,V=e.get(W);if(V===void 0)continue;const ee=V.buffer,z=V.type,j=V.bytesPerElement,ne=z===n.INT||z===n.UNSIGNED_INT||W.gpuType===Kc;if(W.isInterleavedBufferAttribute){const J=W.data,re=J.stride,me=W.offset;if(J.isInstancedInterleavedBuffer){for(let Se=0;Se<O.locationSize;Se++)p(O.location+Se,J.meshPerAttribute);b.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let Se=0;Se<O.locationSize;Se++)m(O.location+Se);n.bindBuffer(n.ARRAY_BUFFER,ee);for(let Se=0;Se<O.locationSize;Se++)x(O.location+Se,N/O.locationSize,z,Y,re*j,(me+N/O.locationSize*Se)*j,ne)}else{if(W.isInstancedBufferAttribute){for(let J=0;J<O.locationSize;J++)p(O.location+J,W.meshPerAttribute);b.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=W.meshPerAttribute*W.count)}else for(let J=0;J<O.locationSize;J++)m(O.location+J);n.bindBuffer(n.ARRAY_BUFFER,ee);for(let J=0;J<O.locationSize;J++)x(O.location+J,N/O.locationSize,z,Y,N*j,N/O.locationSize*J*j,ne)}}else if(G!==void 0){const Y=G[$];if(Y!==void 0)switch(Y.length){case 2:n.vertexAttrib2fv(O.location,Y);break;case 3:n.vertexAttrib3fv(O.location,Y);break;case 4:n.vertexAttrib4fv(O.location,Y);break;default:n.vertexAttrib1fv(O.location,Y)}}}}y()}function S(){A();for(const b in i){const L=i[b];for(const P in L){const I=L[P];for(const F in I)u(I[F].object),delete I[F];delete L[P]}delete i[b]}}function T(b){if(i[b.id]===void 0)return;const L=i[b.id];for(const P in L){const I=L[P];for(const F in I)u(I[F].object),delete I[F];delete L[P]}delete i[b.id]}function E(b){for(const L in i){const P=i[L];if(P[b.id]===void 0)continue;const I=P[b.id];for(const F in I)u(I[F].object),delete I[F];delete P[b.id]}}function A(){M(),a=!0,s!==r&&(s=r,c(s.object))}function M(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:A,resetDefaultState:M,dispose:S,releaseStatesOfGeometry:T,releaseStatesOfProgram:E,initAttributes:v,enableAttribute:m,disableUnusedAttributes:y}}function NS(n,e,t){let i;function r(c){i=c}function s(c,u){n.drawArrays(i,c,u),t.update(u,i,1)}function a(c,u,h){h!==0&&(n.drawArraysInstanced(i,c,u,h),t.update(u,i,h))}function o(c,u,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,u,0,h);let d=0;for(let g=0;g<h;g++)d+=u[g];t.update(d,i,1)}function l(c,u,h,f){if(h===0)return;const d=e.get("WEBGL_multi_draw");if(d===null)for(let g=0;g<c.length;g++)a(c[g],u[g],f[g]);else{d.multiDrawArraysInstancedWEBGL(i,c,0,u,0,f,0,h);let g=0;for(let v=0;v<h;v++)g+=u[v]*f[v];t.update(g,i,1)}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function IS(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const E=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(E){return!(E!==Un&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(E){const A=E===Jn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(E!==ni&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==Bn&&!A)}function l(E){if(E==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const h=t.logarithmicDepthBuffer===!0,f=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control"),d=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),p=n.getParameter(n.MAX_VERTEX_ATTRIBS),y=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),x=n.getParameter(n.MAX_VARYING_VECTORS),_=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),S=g>0,T=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:h,reverseDepthBuffer:f,maxTextures:d,maxVertexTextures:g,maxTextureSize:v,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:y,maxVaryings:x,maxFragmentUniforms:_,vertexTextures:S,maxSamples:T}}function FS(n){const e=this;let t=null,i=0,r=!1,s=!1;const a=new vi,o=new Ze,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,f){const d=h.length!==0||f||i!==0||r;return r=f,i=h.length,d},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,f){t=u(h,f,0)},this.setState=function(h,f,d){const g=h.clippingPlanes,v=h.clipIntersection,m=h.clipShadows,p=n.get(h);if(!r||g===null||g.length===0||s&&!m)s?u(null):c();else{const y=s?0:i,x=y*4;let _=p.clippingState||null;l.value=_,_=u(g,f,x,d);for(let S=0;S!==x;++S)_[S]=t[S];p.clippingState=_,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(h,f,d,g){const v=h!==null?h.length:0;let m=null;if(v!==0){if(m=l.value,g!==!0||m===null){const p=d+v*4,y=f.matrixWorldInverse;o.getNormalMatrix(y),(m===null||m.length<p)&&(m=new Float32Array(p));for(let x=0,_=d;x!==v;++x,_+=4)a.copy(h[x]).applyMatrix4(y,o),a.normal.toArray(m,_),m[_+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,m}}function OS(n){let e=new WeakMap;function t(a,o){return o===kl?a.mapping=Dr:o===Bl&&(a.mapping=Lr),a}function i(a){if(a&&a.isTexture){const o=a.mapping;if(o===kl||o===Bl)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new O0(l.height);return c.fromEquirectangularTexture(n,a),e.set(a,c),a.addEventListener("dispose",r),t(c.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}const yr=4,zh=[.125,.215,.35,.446,.526,.582],Bi=20,Ko=new Qp,Vh=new Ke;let Zo=null,$o=0,Jo=0,Qo=!1;const Fi=(1+Math.sqrt(5))/2,gr=1/Fi,Gh=[new te(-Fi,gr,0),new te(Fi,gr,0),new te(-gr,0,Fi),new te(gr,0,Fi),new te(0,Fi,-gr),new te(0,Fi,gr),new te(-1,1,-1),new te(1,1,-1),new te(-1,1,1),new te(1,1,1)];class Hh{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){Zo=this._renderer.getRenderTarget(),$o=this._renderer.getActiveCubeFace(),Jo=this._renderer.getActiveMipmapLevel(),Qo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Xh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=jh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Zo,$o,Jo),this._renderer.xr.enabled=Qo,e.scissorTest=!1,ga(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Dr||e.mapping===Lr?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Zo=this._renderer.getRenderTarget(),$o=this._renderer.getActiveCubeFace(),Jo=this._renderer.getActiveMipmapLevel(),Qo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Sn,minFilter:Sn,generateMipmaps:!1,type:Jn,format:Un,colorSpace:Ir,depthBuffer:!1},r=Wh(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Wh(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=kS(s)),this._blurMaterial=BS(s,e,t)}return r}_compileMaterial(e){const t=new zt(this._lodPlanes[0],e);this._renderer.compile(t,Ko)}_sceneToCubeUV(e,t,i,r){const o=new yn(90,1,t,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,f=u.toneMapping;u.getClearColor(Vh),u.toneMapping=Si,u.autoClear=!1;const d=new Is({name:"PMREM.Background",side:qt,depthWrite:!1,depthTest:!1}),g=new zt(new Fs,d);let v=!1;const m=e.background;m?m.isColor&&(d.color.copy(m),e.background=null,v=!0):(d.color.copy(Vh),v=!0);for(let p=0;p<6;p++){const y=p%3;y===0?(o.up.set(0,l[p],0),o.lookAt(c[p],0,0)):y===1?(o.up.set(0,0,l[p]),o.lookAt(0,c[p],0)):(o.up.set(0,l[p],0),o.lookAt(0,0,c[p]));const x=this._cubeSize;ga(r,y*x,p>2?x:0,x,x),u.setRenderTarget(r),v&&u.render(g,o),u.render(e,o)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=f,u.autoClear=h,e.background=m}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===Dr||e.mapping===Lr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Xh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=jh());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new zt(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const l=this._cubeSize;ga(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(a,Ko)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=Gh[(r-s-1)%Gh.length];this._blur(e,s-1,s,a,o)}t.autoClear=i}_blur(e,t,i,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,r,"latitudinal",s),this._halfBlur(a,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new zt(this._lodPlanes[r],c),f=c.uniforms,d=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*d):2*Math.PI/(2*Bi-1),v=s/g,m=isFinite(s)?1+Math.floor(u*v):Bi;m>Bi&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Bi}`);const p=[];let y=0;for(let E=0;E<Bi;++E){const A=E/v,M=Math.exp(-A*A/2);p.push(M),E===0?y+=M:E<m&&(y+=2*M)}for(let E=0;E<p.length;E++)p[E]=p[E]/y;f.envMap.value=e.texture,f.samples.value=m,f.weights.value=p,f.latitudinal.value=a==="latitudinal",o&&(f.poleAxis.value=o);const{_lodMax:x}=this;f.dTheta.value=g,f.mipInt.value=x-i;const _=this._sizeLods[r],S=3*_*(r>x-yr?r-x+yr:0),T=4*(this._cubeSize-_);ga(t,S,T,3*_,2*_),l.setRenderTarget(t),l.render(h,Ko)}}function kS(n){const e=[],t=[],i=[];let r=n;const s=n-yr+1+zh.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let l=1/o;a>n-yr?l=zh[a-n+yr-1]:a===0&&(l=0),i.push(l);const c=1/(o-2),u=-c,h=1+c,f=[u,u,h,u,h,h,u,u,h,h,u,h],d=6,g=6,v=3,m=2,p=1,y=new Float32Array(v*g*d),x=new Float32Array(m*g*d),_=new Float32Array(p*g*d);for(let T=0;T<d;T++){const E=T%3*2/3-1,A=T>2?0:-1,M=[E,A,0,E+2/3,A,0,E+2/3,A+1,0,E,A,0,E+2/3,A+1,0,E,A+1,0];y.set(M,v*g*T),x.set(f,m*g*T);const b=[T,T,T,T,T,T];_.set(b,p*g*T)}const S=new dn;S.setAttribute("position",new sn(y,v)),S.setAttribute("uv",new sn(x,m)),S.setAttribute("faceIndex",new sn(_,p)),e.push(S),r>yr&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function Wh(n,e,t){const i=new Nn(n,e,t);return i.texture.mapping=io,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ga(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function BS(n,e,t){const i=new Float32Array(Bi),r=new te(0,1,0);return new jt({name:"SphericalGaussianBlur",defines:{n:Bi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:ru(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:$n,depthTest:!1,depthWrite:!1})}function jh(){return new jt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ru(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:$n,depthTest:!1,depthWrite:!1})}function Xh(){return new jt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ru(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:$n,depthTest:!1,depthWrite:!1})}function ru(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function zS(n){let e=new WeakMap,t=null;function i(o){if(o&&o.isTexture){const l=o.mapping,c=l===kl||l===Bl,u=l===Dr||l===Lr;if(c||u){let h=e.get(o);const f=h!==void 0?h.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==f)return t===null&&(t=new Hh(n)),h=c?t.fromEquirectangular(o,h):t.fromCubemap(o,h),h.texture.pmremVersion=o.pmremVersion,e.set(o,h),h.texture;if(h!==void 0)return h.texture;{const d=o.image;return c&&d&&d.height>0||u&&d&&r(d)?(t===null&&(t=new Hh(n)),h=c?t.fromEquirectangular(o):t.fromCubemap(o),h.texture.pmremVersion=o.pmremVersion,e.set(o,h),o.addEventListener("dispose",s),h.texture):null}}}return o}function r(o){let l=0;const c=6;for(let u=0;u<c;u++)o[u]!==void 0&&l++;return l===c}function s(o){const l=o.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:a}}function VS(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&_r("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function GS(n,e,t,i){const r={},s=new WeakMap;function a(h){const f=h.target;f.index!==null&&e.remove(f.index);for(const g in f.attributes)e.remove(f.attributes[g]);f.removeEventListener("dispose",a),delete r[f.id];const d=s.get(f);d&&(e.remove(d),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function o(h,f){return r[f.id]===!0||(f.addEventListener("dispose",a),r[f.id]=!0,t.memory.geometries++),f}function l(h){const f=h.attributes;for(const d in f)e.update(f[d],n.ARRAY_BUFFER)}function c(h){const f=[],d=h.index,g=h.attributes.position;let v=0;if(d!==null){const y=d.array;v=d.version;for(let x=0,_=y.length;x<_;x+=3){const S=y[x+0],T=y[x+1],E=y[x+2];f.push(S,T,T,E,E,S)}}else if(g!==void 0){const y=g.array;v=g.version;for(let x=0,_=y.length/3-1;x<_;x+=3){const S=x+0,T=x+1,E=x+2;f.push(S,T,T,E,E,S)}}else return;const m=new(Bp(f)?Wp:Hp)(f,1);m.version=v;const p=s.get(h);p&&e.remove(p),s.set(h,m)}function u(h){const f=s.get(h);if(f){const d=h.index;d!==null&&f.version<d.version&&c(h)}else c(h);return s.get(h)}return{get:o,update:l,getWireframeAttribute:u}}function HS(n,e,t){let i;function r(f){i=f}let s,a;function o(f){s=f.type,a=f.bytesPerElement}function l(f,d){n.drawElements(i,d,s,f*a),t.update(d,i,1)}function c(f,d,g){g!==0&&(n.drawElementsInstanced(i,d,s,f*a,g),t.update(d,i,g))}function u(f,d,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,s,f,0,g);let m=0;for(let p=0;p<g;p++)m+=d[p];t.update(m,i,1)}function h(f,d,g,v){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<f.length;p++)c(f[p]/a,d[p],v[p]);else{m.multiDrawElementsInstancedWEBGL(i,d,0,s,f,0,v,0,g);let p=0;for(let y=0;y<g;y++)p+=d[y]*v[y];t.update(p,i,1)}}this.setMode=r,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function WS(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,o){switch(t.calls++,a){case n.TRIANGLES:t.triangles+=o*(s/3);break;case n.LINES:t.lines+=o*(s/2);break;case n.LINE_STRIP:t.lines+=o*(s-1);break;case n.LINE_LOOP:t.lines+=o*s;break;case n.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function jS(n,e,t){const i=new WeakMap,r=new gt;function s(a,o,l){const c=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,h=u!==void 0?u.length:0;let f=i.get(o);if(f===void 0||f.count!==h){let M=function(){E.dispose(),i.delete(o),o.removeEventListener("dispose",M)};f!==void 0&&f.texture.dispose();const d=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],y=o.morphAttributes.color||[];let x=0;d===!0&&(x=1),g===!0&&(x=2),v===!0&&(x=3);let _=o.attributes.position.count*x,S=1;_>e.maxTextureSize&&(S=Math.ceil(_/e.maxTextureSize),_=e.maxTextureSize);const T=new Float32Array(_*S*4*h),E=new Vp(T,_,S,h);E.type=Bn,E.needsUpdate=!0;const A=x*4;for(let b=0;b<h;b++){const L=m[b],P=p[b],I=y[b],F=_*S*4*b;for(let K=0;K<L.count;K++){const G=K*A;d===!0&&(r.fromBufferAttribute(L,K),T[F+G+0]=r.x,T[F+G+1]=r.y,T[F+G+2]=r.z,T[F+G+3]=0),g===!0&&(r.fromBufferAttribute(P,K),T[F+G+4]=r.x,T[F+G+5]=r.y,T[F+G+6]=r.z,T[F+G+7]=0),v===!0&&(r.fromBufferAttribute(I,K),T[F+G+8]=r.x,T[F+G+9]=r.y,T[F+G+10]=r.z,T[F+G+11]=I.itemSize===4?r.w:1)}}f={count:h,texture:E,size:new je(_,S)},i.set(o,f),o.addEventListener("dispose",M)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",a.morphTexture,t);else{let d=0;for(let v=0;v<c.length;v++)d+=c[v];const g=o.morphTargetsRelative?1:1-d;l.getUniforms().setValue(n,"morphTargetBaseInfluence",g),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",f.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",f.size)}return{update:s}}function XS(n,e,t,i){let r=new WeakMap;function s(l){const c=i.render.frame,u=l.geometry,h=e.get(l,u);if(r.get(h)!==c&&(e.update(h),r.set(h,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),r.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const f=l.skeleton;r.get(f)!==c&&(f.update(),r.set(f,c))}return h}function a(){r=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:a}}const tm=new Gt,Yh=new Zp(1,1),nm=new Vp,im=new b0,rm=new Yp,qh=[],Kh=[],Zh=new Float32Array(16),$h=new Float32Array(9),Jh=new Float32Array(4);function zr(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=qh[r];if(s===void 0&&(s=new Float32Array(r),qh[r]=s),e!==0){i.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,n[a].toArray(s,o)}return s}function Et(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function wt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function ao(n,e){let t=Kh[e];t===void 0&&(t=new Int32Array(e),Kh[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function YS(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function qS(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;n.uniform2fv(this.addr,e),wt(t,e)}}function KS(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Et(t,e))return;n.uniform3fv(this.addr,e),wt(t,e)}}function ZS(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;n.uniform4fv(this.addr,e),wt(t,e)}}function $S(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Et(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),wt(t,e)}else{if(Et(t,i))return;Jh.set(i),n.uniformMatrix2fv(this.addr,!1,Jh),wt(t,i)}}function JS(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Et(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),wt(t,e)}else{if(Et(t,i))return;$h.set(i),n.uniformMatrix3fv(this.addr,!1,$h),wt(t,i)}}function QS(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Et(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),wt(t,e)}else{if(Et(t,i))return;Zh.set(i),n.uniformMatrix4fv(this.addr,!1,Zh),wt(t,i)}}function eb(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function tb(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;n.uniform2iv(this.addr,e),wt(t,e)}}function nb(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Et(t,e))return;n.uniform3iv(this.addr,e),wt(t,e)}}function ib(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;n.uniform4iv(this.addr,e),wt(t,e)}}function rb(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function sb(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Et(t,e))return;n.uniform2uiv(this.addr,e),wt(t,e)}}function ab(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Et(t,e))return;n.uniform3uiv(this.addr,e),wt(t,e)}}function ob(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Et(t,e))return;n.uniform4uiv(this.addr,e),wt(t,e)}}function lb(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?(Yh.compareFunction=kp,s=Yh):s=tm,t.setTexture2D(e||s,r)}function cb(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||im,r)}function ub(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||rm,r)}function hb(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||nm,r)}function fb(n){switch(n){case 5126:return YS;case 35664:return qS;case 35665:return KS;case 35666:return ZS;case 35674:return $S;case 35675:return JS;case 35676:return QS;case 5124:case 35670:return eb;case 35667:case 35671:return tb;case 35668:case 35672:return nb;case 35669:case 35673:return ib;case 5125:return rb;case 36294:return sb;case 36295:return ab;case 36296:return ob;case 35678:case 36198:case 36298:case 36306:case 35682:return lb;case 35679:case 36299:case 36307:return cb;case 35680:case 36300:case 36308:case 36293:return ub;case 36289:case 36303:case 36311:case 36292:return hb}}function db(n,e){n.uniform1fv(this.addr,e)}function pb(n,e){const t=zr(e,this.size,2);n.uniform2fv(this.addr,t)}function mb(n,e){const t=zr(e,this.size,3);n.uniform3fv(this.addr,t)}function gb(n,e){const t=zr(e,this.size,4);n.uniform4fv(this.addr,t)}function vb(n,e){const t=zr(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function _b(n,e){const t=zr(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function xb(n,e){const t=zr(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function yb(n,e){n.uniform1iv(this.addr,e)}function Sb(n,e){n.uniform2iv(this.addr,e)}function bb(n,e){n.uniform3iv(this.addr,e)}function Mb(n,e){n.uniform4iv(this.addr,e)}function Tb(n,e){n.uniform1uiv(this.addr,e)}function Eb(n,e){n.uniform2uiv(this.addr,e)}function wb(n,e){n.uniform3uiv(this.addr,e)}function Ab(n,e){n.uniform4uiv(this.addr,e)}function Cb(n,e,t){const i=this.cache,r=e.length,s=ao(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),wt(i,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||tm,s[a])}function Rb(n,e,t){const i=this.cache,r=e.length,s=ao(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),wt(i,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||im,s[a])}function Pb(n,e,t){const i=this.cache,r=e.length,s=ao(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),wt(i,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||rm,s[a])}function Db(n,e,t){const i=this.cache,r=e.length,s=ao(t,r);Et(i,s)||(n.uniform1iv(this.addr,s),wt(i,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||nm,s[a])}function Lb(n){switch(n){case 5126:return db;case 35664:return pb;case 35665:return mb;case 35666:return gb;case 35674:return vb;case 35675:return _b;case 35676:return xb;case 5124:case 35670:return yb;case 35667:case 35671:return Sb;case 35668:case 35672:return bb;case 35669:case 35673:return Mb;case 5125:return Tb;case 36294:return Eb;case 36295:return wb;case 36296:return Ab;case 35678:case 36198:case 36298:case 36306:case 35682:return Cb;case 35679:case 36299:case 36307:return Rb;case 35680:case 36300:case 36308:case 36293:return Pb;case 36289:case 36303:case 36311:case 36292:return Db}}class Ub{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=fb(t.type)}}class Nb{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Lb(t.type)}}class Ib{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],i)}}}const el=/(\w+)(\])?(\[|\.)?/g;function Qh(n,e){n.seq.push(e),n.map[e.id]=e}function Fb(n,e,t){const i=n.name,r=i.length;for(el.lastIndex=0;;){const s=el.exec(i),a=el.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){Qh(t,c===void 0?new Ub(o,n,e):new Nb(o,n,e));break}else{let h=t.map[o];h===void 0&&(h=new Ib(o),Qh(t,h)),t=h}}}class Da{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);Fb(s,a,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&i.push(a)}return i}}function ef(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const Ob=37297;let kb=0;function Bb(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}const tf=new Ze;function zb(n){st._getMatrix(tf,st.workingColorSpace,n);const e=`mat3( ${tf.elements.map(t=>t.toFixed(4))} )`;switch(st.getTransfer(n)){case Va:return[e,"LinearTransferOETF"];case at:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function nf(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=n.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+Bb(n.getShaderSource(e),a)}else return r}function Vb(n,e){const t=zb(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Gb(n,e){let t;switch(e){case X_:t="Linear";break;case Y_:t="Reinhard";break;case q_:t="Cineon";break;case K_:t="ACESFilmic";break;case $_:t="AgX";break;case J_:t="Neutral";break;case Z_:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const va=new te;function Hb(){st.getLuminanceCoefficients(va);const n=va.x.toFixed(4),e=va.y.toFixed(4),t=va.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Wb(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ds).join(`
`)}function jb(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function Xb(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),a=s.name;let o=1;s.type===n.FLOAT_MAT2&&(o=2),s.type===n.FLOAT_MAT3&&(o=3),s.type===n.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:n.getAttribLocation(e,a),locationSize:o}}return t}function ds(n){return n!==""}function rf(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function sf(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Yb=/^[ \t]*#include +<([\w\d./]+)>/gm;function vc(n){return n.replace(Yb,Kb)}const qb=new Map;function Kb(n,e){let t=Je[e];if(t===void 0){const i=qb.get(e);if(i!==void 0)t=Je[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return vc(t)}const Zb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function af(n){return n.replace(Zb,$b)}function $b(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function of(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Jb(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===Ep?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===E_?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===qn&&(e="SHADOWMAP_TYPE_VSM"),e}function Qb(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Dr:case Lr:e="ENVMAP_TYPE_CUBE";break;case io:e="ENVMAP_TYPE_CUBE_UV";break}return e}function eM(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Lr:e="ENVMAP_MODE_REFRACTION";break}return e}function tM(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case wp:e="ENVMAP_BLENDING_MULTIPLY";break;case W_:e="ENVMAP_BLENDING_MIX";break;case j_:e="ENVMAP_BLENDING_ADD";break}return e}function nM(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function iM(n,e,t,i){const r=n.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=Jb(t),c=Qb(t),u=eM(t),h=tM(t),f=nM(t),d=Wb(t),g=jb(s),v=r.createProgram();let m,p,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(ds).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(ds).join(`
`),p.length>0&&(p+=`
`)):(m=[of(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ds).join(`
`),p=[of(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Si?"#define TONE_MAPPING":"",t.toneMapping!==Si?Je.tonemapping_pars_fragment:"",t.toneMapping!==Si?Gb("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Je.colorspace_pars_fragment,Vb("linearToOutputTexel",t.outputColorSpace),Hb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(ds).join(`
`)),a=vc(a),a=rf(a,t),a=sf(a,t),o=vc(o),o=rf(o,t),o=sf(o,t),a=af(a),o=af(o),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===hh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===hh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const x=y+m+a,_=y+p+o,S=ef(r,r.VERTEX_SHADER,x),T=ef(r,r.FRAGMENT_SHADER,_);r.attachShader(v,S),r.attachShader(v,T),t.index0AttributeName!==void 0?r.bindAttribLocation(v,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(v,0,"position"),r.linkProgram(v);function E(L){if(n.debug.checkShaderErrors){const P=r.getProgramInfoLog(v).trim(),I=r.getShaderInfoLog(S).trim(),F=r.getShaderInfoLog(T).trim();let K=!0,G=!0;if(r.getProgramParameter(v,r.LINK_STATUS)===!1)if(K=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,v,S,T);else{const $=nf(r,S,"vertex"),O=nf(r,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(v,r.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+P+`
`+$+`
`+O)}else P!==""?console.warn("THREE.WebGLProgram: Program Info Log:",P):(I===""||F==="")&&(G=!1);G&&(L.diagnostics={runnable:K,programLog:P,vertexShader:{log:I,prefix:m},fragmentShader:{log:F,prefix:p}})}r.deleteShader(S),r.deleteShader(T),A=new Da(r,v),M=Xb(r,v)}let A;this.getUniforms=function(){return A===void 0&&E(this),A};let M;this.getAttributes=function(){return M===void 0&&E(this),M};let b=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return b===!1&&(b=r.getProgramParameter(v,Ob)),b},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(v),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=kb++,this.cacheKey=e,this.usedTimes=1,this.program=v,this.vertexShader=S,this.fragmentShader=T,this}let rM=0;class sM{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new aM(e),t.set(e,i)),i}}class aM{constructor(e){this.id=rM++,this.code=e,this.usedTimes=0}}function oM(n,e,t,i,r,s,a){const o=new nu,l=new sM,c=new Set,u=[],h=r.logarithmicDepthBuffer,f=r.vertexTextures;let d=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(M){return c.add(M),M===0?"uv":`uv${M}`}function m(M,b,L,P,I){const F=P.fog,K=I.geometry,G=M.isMeshStandardMaterial?P.environment:null,$=(M.isMeshStandardMaterial?t:e).get(M.envMap||G),O=$&&$.mapping===io?$.image.height:null,W=g[M.type];M.precision!==null&&(d=r.getMaxPrecision(M.precision),d!==M.precision&&console.warn("THREE.WebGLProgram.getParameters:",M.precision,"not supported, using",d,"instead."));const Y=K.morphAttributes.position||K.morphAttributes.normal||K.morphAttributes.color,N=Y!==void 0?Y.length:0;let V=0;K.morphAttributes.position!==void 0&&(V=1),K.morphAttributes.normal!==void 0&&(V=2),K.morphAttributes.color!==void 0&&(V=3);let ee,z,j,ne;if(W){const He=On[W];ee=He.vertexShader,z=He.fragmentShader}else ee=M.vertexShader,z=M.fragmentShader,l.update(M),j=l.getVertexShaderID(M),ne=l.getFragmentShaderID(M);const J=n.getRenderTarget(),re=n.state.buffers.depth.getReversed(),me=I.isInstancedMesh===!0,Se=I.isBatchedMesh===!0,xe=!!M.map,he=!!M.matcap,Ie=!!$,B=!!M.aoMap,Pe=!!M.lightMap,be=!!M.bumpMap,Ee=!!M.normalMap,se=!!M.displacementMap,Ae=!!M.emissiveMap,de=!!M.metalnessMap,C=!!M.roughnessMap,w=M.anisotropy>0,U=M.clearcoat>0,k=M.dispersion>0,X=M.iridescence>0,Z=M.sheen>0,ue=M.transmission>0,le=w&&!!M.anisotropyMap,fe=U&&!!M.clearcoatMap,De=U&&!!M.clearcoatNormalMap,ve=U&&!!M.clearcoatRoughnessMap,we=X&&!!M.iridescenceMap,Ce=X&&!!M.iridescenceThicknessMap,Re=Z&&!!M.sheenColorMap,ge=Z&&!!M.sheenRoughnessMap,Ve=!!M.specularMap,ke=!!M.specularColorMap,$e=!!M.specularIntensityMap,q=ue&&!!M.transmissionMap,pe=ue&&!!M.thicknessMap,ie=!!M.gradientMap,_e=!!M.alphaMap,Me=M.alphaTest>0,ye=!!M.alphaHash,Be=!!M.extensions;let qe=Si;M.toneMapped&&(J===null||J.isXRRenderTarget===!0)&&(qe=n.toneMapping);const ze={shaderID:W,shaderType:M.type,shaderName:M.name,vertexShader:ee,fragmentShader:z,defines:M.defines,customVertexShaderID:j,customFragmentShaderID:ne,isRawShaderMaterial:M.isRawShaderMaterial===!0,glslVersion:M.glslVersion,precision:d,batching:Se,batchingColor:Se&&I._colorsTexture!==null,instancing:me,instancingColor:me&&I.instanceColor!==null,instancingMorph:me&&I.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:J===null?n.outputColorSpace:J.isXRRenderTarget===!0?J.texture.colorSpace:Ir,alphaToCoverage:!!M.alphaToCoverage,map:xe,matcap:he,envMap:Ie,envMapMode:Ie&&$.mapping,envMapCubeUVHeight:O,aoMap:B,lightMap:Pe,bumpMap:be,normalMap:Ee,displacementMap:f&&se,emissiveMap:Ae,normalMapObjectSpace:Ee&&M.normalMapType===n0,normalMapTangentSpace:Ee&&M.normalMapType===t0,metalnessMap:de,roughnessMap:C,anisotropy:w,anisotropyMap:le,clearcoat:U,clearcoatMap:fe,clearcoatNormalMap:De,clearcoatRoughnessMap:ve,dispersion:k,iridescence:X,iridescenceMap:we,iridescenceThicknessMap:Ce,sheen:Z,sheenColorMap:Re,sheenRoughnessMap:ge,specularMap:Ve,specularColorMap:ke,specularIntensityMap:$e,transmission:ue,transmissionMap:q,thicknessMap:pe,gradientMap:ie,opaque:M.transparent===!1&&M.blending===Er&&M.alphaToCoverage===!1,alphaMap:_e,alphaTest:Me,alphaHash:ye,combine:M.combine,mapUv:xe&&v(M.map.channel),aoMapUv:B&&v(M.aoMap.channel),lightMapUv:Pe&&v(M.lightMap.channel),bumpMapUv:be&&v(M.bumpMap.channel),normalMapUv:Ee&&v(M.normalMap.channel),displacementMapUv:se&&v(M.displacementMap.channel),emissiveMapUv:Ae&&v(M.emissiveMap.channel),metalnessMapUv:de&&v(M.metalnessMap.channel),roughnessMapUv:C&&v(M.roughnessMap.channel),anisotropyMapUv:le&&v(M.anisotropyMap.channel),clearcoatMapUv:fe&&v(M.clearcoatMap.channel),clearcoatNormalMapUv:De&&v(M.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ve&&v(M.clearcoatRoughnessMap.channel),iridescenceMapUv:we&&v(M.iridescenceMap.channel),iridescenceThicknessMapUv:Ce&&v(M.iridescenceThicknessMap.channel),sheenColorMapUv:Re&&v(M.sheenColorMap.channel),sheenRoughnessMapUv:ge&&v(M.sheenRoughnessMap.channel),specularMapUv:Ve&&v(M.specularMap.channel),specularColorMapUv:ke&&v(M.specularColorMap.channel),specularIntensityMapUv:$e&&v(M.specularIntensityMap.channel),transmissionMapUv:q&&v(M.transmissionMap.channel),thicknessMapUv:pe&&v(M.thicknessMap.channel),alphaMapUv:_e&&v(M.alphaMap.channel),vertexTangents:!!K.attributes.tangent&&(Ee||w),vertexColors:M.vertexColors,vertexAlphas:M.vertexColors===!0&&!!K.attributes.color&&K.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!K.attributes.uv&&(xe||_e),fog:!!F,useFog:M.fog===!0,fogExp2:!!F&&F.isFogExp2,flatShading:M.flatShading===!0,sizeAttenuation:M.sizeAttenuation===!0,logarithmicDepthBuffer:h,reverseDepthBuffer:re,skinning:I.isSkinnedMesh===!0,morphTargets:K.morphAttributes.position!==void 0,morphNormals:K.morphAttributes.normal!==void 0,morphColors:K.morphAttributes.color!==void 0,morphTargetsCount:N,morphTextureStride:V,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:M.dithering,shadowMapEnabled:n.shadowMap.enabled&&L.length>0,shadowMapType:n.shadowMap.type,toneMapping:qe,decodeVideoTexture:xe&&M.map.isVideoTexture===!0&&st.getTransfer(M.map.colorSpace)===at,decodeVideoTextureEmissive:Ae&&M.emissiveMap.isVideoTexture===!0&&st.getTransfer(M.emissiveMap.colorSpace)===at,premultipliedAlpha:M.premultipliedAlpha,doubleSided:M.side===kn,flipSided:M.side===qt,useDepthPacking:M.depthPacking>=0,depthPacking:M.depthPacking||0,index0AttributeName:M.index0AttributeName,extensionClipCullDistance:Be&&M.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Be&&M.extensions.multiDraw===!0||Se)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:M.customProgramCacheKey()};return ze.vertexUv1s=c.has(1),ze.vertexUv2s=c.has(2),ze.vertexUv3s=c.has(3),c.clear(),ze}function p(M){const b=[];if(M.shaderID?b.push(M.shaderID):(b.push(M.customVertexShaderID),b.push(M.customFragmentShaderID)),M.defines!==void 0)for(const L in M.defines)b.push(L),b.push(M.defines[L]);return M.isRawShaderMaterial===!1&&(y(b,M),x(b,M),b.push(n.outputColorSpace)),b.push(M.customProgramCacheKey),b.join()}function y(M,b){M.push(b.precision),M.push(b.outputColorSpace),M.push(b.envMapMode),M.push(b.envMapCubeUVHeight),M.push(b.mapUv),M.push(b.alphaMapUv),M.push(b.lightMapUv),M.push(b.aoMapUv),M.push(b.bumpMapUv),M.push(b.normalMapUv),M.push(b.displacementMapUv),M.push(b.emissiveMapUv),M.push(b.metalnessMapUv),M.push(b.roughnessMapUv),M.push(b.anisotropyMapUv),M.push(b.clearcoatMapUv),M.push(b.clearcoatNormalMapUv),M.push(b.clearcoatRoughnessMapUv),M.push(b.iridescenceMapUv),M.push(b.iridescenceThicknessMapUv),M.push(b.sheenColorMapUv),M.push(b.sheenRoughnessMapUv),M.push(b.specularMapUv),M.push(b.specularColorMapUv),M.push(b.specularIntensityMapUv),M.push(b.transmissionMapUv),M.push(b.thicknessMapUv),M.push(b.combine),M.push(b.fogExp2),M.push(b.sizeAttenuation),M.push(b.morphTargetsCount),M.push(b.morphAttributeCount),M.push(b.numDirLights),M.push(b.numPointLights),M.push(b.numSpotLights),M.push(b.numSpotLightMaps),M.push(b.numHemiLights),M.push(b.numRectAreaLights),M.push(b.numDirLightShadows),M.push(b.numPointLightShadows),M.push(b.numSpotLightShadows),M.push(b.numSpotLightShadowsWithMaps),M.push(b.numLightProbes),M.push(b.shadowMapType),M.push(b.toneMapping),M.push(b.numClippingPlanes),M.push(b.numClipIntersection),M.push(b.depthPacking)}function x(M,b){o.disableAll(),b.supportsVertexTextures&&o.enable(0),b.instancing&&o.enable(1),b.instancingColor&&o.enable(2),b.instancingMorph&&o.enable(3),b.matcap&&o.enable(4),b.envMap&&o.enable(5),b.normalMapObjectSpace&&o.enable(6),b.normalMapTangentSpace&&o.enable(7),b.clearcoat&&o.enable(8),b.iridescence&&o.enable(9),b.alphaTest&&o.enable(10),b.vertexColors&&o.enable(11),b.vertexAlphas&&o.enable(12),b.vertexUv1s&&o.enable(13),b.vertexUv2s&&o.enable(14),b.vertexUv3s&&o.enable(15),b.vertexTangents&&o.enable(16),b.anisotropy&&o.enable(17),b.alphaHash&&o.enable(18),b.batching&&o.enable(19),b.dispersion&&o.enable(20),b.batchingColor&&o.enable(21),M.push(o.mask),o.disableAll(),b.fog&&o.enable(0),b.useFog&&o.enable(1),b.flatShading&&o.enable(2),b.logarithmicDepthBuffer&&o.enable(3),b.reverseDepthBuffer&&o.enable(4),b.skinning&&o.enable(5),b.morphTargets&&o.enable(6),b.morphNormals&&o.enable(7),b.morphColors&&o.enable(8),b.premultipliedAlpha&&o.enable(9),b.shadowMapEnabled&&o.enable(10),b.doubleSided&&o.enable(11),b.flipSided&&o.enable(12),b.useDepthPacking&&o.enable(13),b.dithering&&o.enable(14),b.transmission&&o.enable(15),b.sheen&&o.enable(16),b.opaque&&o.enable(17),b.pointsUvs&&o.enable(18),b.decodeVideoTexture&&o.enable(19),b.decodeVideoTextureEmissive&&o.enable(20),b.alphaToCoverage&&o.enable(21),M.push(o.mask)}function _(M){const b=g[M.type];let L;if(b){const P=On[b];L=ws.clone(P.uniforms)}else L=M.uniforms;return L}function S(M,b){let L;for(let P=0,I=u.length;P<I;P++){const F=u[P];if(F.cacheKey===b){L=F,++L.usedTimes;break}}return L===void 0&&(L=new iM(n,b,M,s),u.push(L)),L}function T(M){if(--M.usedTimes===0){const b=u.indexOf(M);u[b]=u[u.length-1],u.pop(),M.destroy()}}function E(M){l.remove(M)}function A(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:_,acquireProgram:S,releaseProgram:T,releaseShaderCache:E,programs:u,dispose:A}}function lM(){let n=new WeakMap;function e(a){return n.has(a)}function t(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function r(a,o,l){n.get(a)[o]=l}function s(){n=new WeakMap}return{has:e,get:t,remove:i,update:r,dispose:s}}function cM(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function lf(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function cf(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function a(h,f,d,g,v,m){let p=n[e];return p===void 0?(p={id:h.id,object:h,geometry:f,material:d,groupOrder:g,renderOrder:h.renderOrder,z:v,group:m},n[e]=p):(p.id=h.id,p.object=h,p.geometry=f,p.material=d,p.groupOrder=g,p.renderOrder=h.renderOrder,p.z=v,p.group=m),e++,p}function o(h,f,d,g,v,m){const p=a(h,f,d,g,v,m);d.transmission>0?i.push(p):d.transparent===!0?r.push(p):t.push(p)}function l(h,f,d,g,v,m){const p=a(h,f,d,g,v,m);d.transmission>0?i.unshift(p):d.transparent===!0?r.unshift(p):t.unshift(p)}function c(h,f){t.length>1&&t.sort(h||cM),i.length>1&&i.sort(f||lf),r.length>1&&r.sort(f||lf)}function u(){for(let h=e,f=n.length;h<f;h++){const d=n[h];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:o,unshift:l,finish:u,sort:c}}function uM(){let n=new WeakMap;function e(i,r){const s=n.get(i);let a;return s===void 0?(a=new cf,n.set(i,[a])):r>=s.length?(a=new cf,s.push(a)):a=s[r],a}function t(){n=new WeakMap}return{get:e,dispose:t}}function hM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new te,color:new Ke};break;case"SpotLight":t={position:new te,direction:new te,color:new Ke,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new te,color:new Ke,distance:0,decay:0};break;case"HemisphereLight":t={direction:new te,skyColor:new Ke,groundColor:new Ke};break;case"RectAreaLight":t={color:new Ke,position:new te,halfWidth:new te,halfHeight:new te};break}return n[e.id]=t,t}}}function fM(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new je};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new je};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new je,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let dM=0;function pM(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function mM(n){const e=new hM,t=fM(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new te);const r=new te,s=new ut,a=new ut;function o(c){let u=0,h=0,f=0;for(let M=0;M<9;M++)i.probe[M].set(0,0,0);let d=0,g=0,v=0,m=0,p=0,y=0,x=0,_=0,S=0,T=0,E=0;c.sort(pM);for(let M=0,b=c.length;M<b;M++){const L=c[M],P=L.color,I=L.intensity,F=L.distance,K=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)u+=P.r*I,h+=P.g*I,f+=P.b*I;else if(L.isLightProbe){for(let G=0;G<9;G++)i.probe[G].addScaledVector(L.sh.coefficients[G],I);E++}else if(L.isDirectionalLight){const G=e.get(L);if(G.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const $=L.shadow,O=t.get(L);O.shadowIntensity=$.intensity,O.shadowBias=$.bias,O.shadowNormalBias=$.normalBias,O.shadowRadius=$.radius,O.shadowMapSize=$.mapSize,i.directionalShadow[d]=O,i.directionalShadowMap[d]=K,i.directionalShadowMatrix[d]=L.shadow.matrix,y++}i.directional[d]=G,d++}else if(L.isSpotLight){const G=e.get(L);G.position.setFromMatrixPosition(L.matrixWorld),G.color.copy(P).multiplyScalar(I),G.distance=F,G.coneCos=Math.cos(L.angle),G.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),G.decay=L.decay,i.spot[v]=G;const $=L.shadow;if(L.map&&(i.spotLightMap[S]=L.map,S++,$.updateMatrices(L),L.castShadow&&T++),i.spotLightMatrix[v]=$.matrix,L.castShadow){const O=t.get(L);O.shadowIntensity=$.intensity,O.shadowBias=$.bias,O.shadowNormalBias=$.normalBias,O.shadowRadius=$.radius,O.shadowMapSize=$.mapSize,i.spotShadow[v]=O,i.spotShadowMap[v]=K,_++}v++}else if(L.isRectAreaLight){const G=e.get(L);G.color.copy(P).multiplyScalar(I),G.halfWidth.set(L.width*.5,0,0),G.halfHeight.set(0,L.height*.5,0),i.rectArea[m]=G,m++}else if(L.isPointLight){const G=e.get(L);if(G.color.copy(L.color).multiplyScalar(L.intensity),G.distance=L.distance,G.decay=L.decay,L.castShadow){const $=L.shadow,O=t.get(L);O.shadowIntensity=$.intensity,O.shadowBias=$.bias,O.shadowNormalBias=$.normalBias,O.shadowRadius=$.radius,O.shadowMapSize=$.mapSize,O.shadowCameraNear=$.camera.near,O.shadowCameraFar=$.camera.far,i.pointShadow[g]=O,i.pointShadowMap[g]=K,i.pointShadowMatrix[g]=L.shadow.matrix,x++}i.point[g]=G,g++}else if(L.isHemisphereLight){const G=e.get(L);G.skyColor.copy(L.color).multiplyScalar(I),G.groundColor.copy(L.groundColor).multiplyScalar(I),i.hemi[p]=G,p++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Le.LTC_FLOAT_1,i.rectAreaLTC2=Le.LTC_FLOAT_2):(i.rectAreaLTC1=Le.LTC_HALF_1,i.rectAreaLTC2=Le.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=h,i.ambient[2]=f;const A=i.hash;(A.directionalLength!==d||A.pointLength!==g||A.spotLength!==v||A.rectAreaLength!==m||A.hemiLength!==p||A.numDirectionalShadows!==y||A.numPointShadows!==x||A.numSpotShadows!==_||A.numSpotMaps!==S||A.numLightProbes!==E)&&(i.directional.length=d,i.spot.length=v,i.rectArea.length=m,i.point.length=g,i.hemi.length=p,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=x,i.pointShadowMap.length=x,i.spotShadow.length=_,i.spotShadowMap.length=_,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=x,i.spotLightMatrix.length=_+S-T,i.spotLightMap.length=S,i.numSpotLightShadowsWithMaps=T,i.numLightProbes=E,A.directionalLength=d,A.pointLength=g,A.spotLength=v,A.rectAreaLength=m,A.hemiLength=p,A.numDirectionalShadows=y,A.numPointShadows=x,A.numSpotShadows=_,A.numSpotMaps=S,A.numLightProbes=E,i.version=dM++)}function l(c,u){let h=0,f=0,d=0,g=0,v=0;const m=u.matrixWorldInverse;for(let p=0,y=c.length;p<y;p++){const x=c[p];if(x.isDirectionalLight){const _=i.directional[h];_.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),_.direction.sub(r),_.direction.transformDirection(m),h++}else if(x.isSpotLight){const _=i.spot[d];_.position.setFromMatrixPosition(x.matrixWorld),_.position.applyMatrix4(m),_.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),_.direction.sub(r),_.direction.transformDirection(m),d++}else if(x.isRectAreaLight){const _=i.rectArea[g];_.position.setFromMatrixPosition(x.matrixWorld),_.position.applyMatrix4(m),a.identity(),s.copy(x.matrixWorld),s.premultiply(m),a.extractRotation(s),_.halfWidth.set(x.width*.5,0,0),_.halfHeight.set(0,x.height*.5,0),_.halfWidth.applyMatrix4(a),_.halfHeight.applyMatrix4(a),g++}else if(x.isPointLight){const _=i.point[f];_.position.setFromMatrixPosition(x.matrixWorld),_.position.applyMatrix4(m),f++}else if(x.isHemisphereLight){const _=i.hemi[v];_.direction.setFromMatrixPosition(x.matrixWorld),_.direction.transformDirection(m),v++}}}return{setup:o,setupView:l,state:i}}function uf(n){const e=new mM(n),t=[],i=[];function r(u){c.camera=u,t.length=0,i.length=0}function s(u){t.push(u)}function a(u){i.push(u)}function o(){e.setup(t)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:o,setupLightsView:l,pushLight:s,pushShadow:a}}function gM(n){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new uf(n),e.set(r,[o])):s>=a.length?(o=new uf(n),a.push(o)):o=a[s],o}function i(){e=new WeakMap}return{get:t,dispose:i}}const vM=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,_M=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function xM(n,e,t){let i=new qp;const r=new je,s=new je,a=new gt,o=new $p({depthPacking:Op}),l=new Jp,c={},u=t.maxTextureSize,h={[Mi]:qt,[qt]:Mi,[kn]:kn},f=new jt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new je},radius:{value:4}},vertexShader:vM,fragmentShader:_M}),d=f.clone();d.defines.HORIZONTAL_PASS=1;const g=new dn;g.setAttribute("position",new sn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new zt(g,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ep;let p=this.type;this.render=function(T,E,A){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;const M=n.getRenderTarget(),b=n.getActiveCubeFace(),L=n.getActiveMipmapLevel(),P=n.state;P.setBlending($n),P.buffers.color.setClear(1,1,1,1),P.buffers.depth.setTest(!0),P.setScissorTest(!1);const I=p!==qn&&this.type===qn,F=p===qn&&this.type!==qn;for(let K=0,G=T.length;K<G;K++){const $=T[K],O=$.shadow;if(O===void 0){console.warn("THREE.WebGLShadowMap:",$,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;r.copy(O.mapSize);const W=O.getFrameExtents();if(r.multiply(W),s.copy(O.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/W.x),r.x=s.x*W.x,O.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/W.y),r.y=s.y*W.y,O.mapSize.y=s.y)),O.map===null||I===!0||F===!0){const N=this.type!==qn?{minFilter:fn,magFilter:fn}:{};O.map!==null&&O.map.dispose(),O.map=new Nn(r.x,r.y,N),O.map.texture.name=$.name+".shadowMap",O.camera.updateProjectionMatrix()}n.setRenderTarget(O.map),n.clear();const Y=O.getViewportCount();for(let N=0;N<Y;N++){const V=O.getViewport(N);a.set(s.x*V.x,s.y*V.y,s.x*V.z,s.y*V.w),P.viewport(a),O.updateMatrices($,N),i=O.getFrustum(),_(E,A,O.camera,$,this.type)}O.isPointLightShadow!==!0&&this.type===qn&&y(O,A),O.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(M,b,L)};function y(T,E){const A=e.update(v);f.defines.VSM_SAMPLES!==T.blurSamples&&(f.defines.VSM_SAMPLES=T.blurSamples,d.defines.VSM_SAMPLES=T.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new Nn(r.x,r.y)),f.uniforms.shadow_pass.value=T.map.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,n.setRenderTarget(T.mapPass),n.clear(),n.renderBufferDirect(E,null,A,f,v,null),d.uniforms.shadow_pass.value=T.mapPass.texture,d.uniforms.resolution.value=T.mapSize,d.uniforms.radius.value=T.radius,n.setRenderTarget(T.map),n.clear(),n.renderBufferDirect(E,null,A,d,v,null)}function x(T,E,A,M){let b=null;const L=A.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(L!==void 0)b=L;else if(b=A.isPointLight===!0?l:o,n.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0){const P=b.uuid,I=E.uuid;let F=c[P];F===void 0&&(F={},c[P]=F);let K=F[I];K===void 0&&(K=b.clone(),F[I]=K,E.addEventListener("dispose",S)),b=K}if(b.visible=E.visible,b.wireframe=E.wireframe,M===qn?b.side=E.shadowSide!==null?E.shadowSide:E.side:b.side=E.shadowSide!==null?E.shadowSide:h[E.side],b.alphaMap=E.alphaMap,b.alphaTest=E.alphaTest,b.map=E.map,b.clipShadows=E.clipShadows,b.clippingPlanes=E.clippingPlanes,b.clipIntersection=E.clipIntersection,b.displacementMap=E.displacementMap,b.displacementScale=E.displacementScale,b.displacementBias=E.displacementBias,b.wireframeLinewidth=E.wireframeLinewidth,b.linewidth=E.linewidth,A.isPointLight===!0&&b.isMeshDistanceMaterial===!0){const P=n.properties.get(b);P.light=A}return b}function _(T,E,A,M,b){if(T.visible===!1)return;if(T.layers.test(E.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&b===qn)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(A.matrixWorldInverse,T.matrixWorld);const I=e.update(T),F=T.material;if(Array.isArray(F)){const K=I.groups;for(let G=0,$=K.length;G<$;G++){const O=K[G],W=F[O.materialIndex];if(W&&W.visible){const Y=x(T,W,M,b);T.onBeforeShadow(n,T,E,A,I,Y,O),n.renderBufferDirect(A,null,I,Y,T,O),T.onAfterShadow(n,T,E,A,I,Y,O)}}}else if(F.visible){const K=x(T,F,M,b);T.onBeforeShadow(n,T,E,A,I,K,null),n.renderBufferDirect(A,null,I,K,T,null),T.onAfterShadow(n,T,E,A,I,K,null)}}const P=T.children;for(let I=0,F=P.length;I<F;I++)_(P[I],E,A,M,b)}function S(T){T.target.removeEventListener("dispose",S);for(const A in c){const M=c[A],b=T.target.uuid;b in M&&(M[b].dispose(),delete M[b])}}}const yM={[Dl]:Ll,[Ul]:Fl,[Nl]:Ol,[Pr]:Il,[Ll]:Dl,[Fl]:Ul,[Ol]:Nl,[Il]:Pr};function SM(n,e){function t(){let q=!1;const pe=new gt;let ie=null;const _e=new gt(0,0,0,0);return{setMask:function(Me){ie!==Me&&!q&&(n.colorMask(Me,Me,Me,Me),ie=Me)},setLocked:function(Me){q=Me},setClear:function(Me,ye,Be,qe,ze){ze===!0&&(Me*=qe,ye*=qe,Be*=qe),pe.set(Me,ye,Be,qe),_e.equals(pe)===!1&&(n.clearColor(Me,ye,Be,qe),_e.copy(pe))},reset:function(){q=!1,ie=null,_e.set(-1,0,0,0)}}}function i(){let q=!1,pe=!1,ie=null,_e=null,Me=null;return{setReversed:function(ye){if(pe!==ye){const Be=e.get("EXT_clip_control");pe?Be.clipControlEXT(Be.LOWER_LEFT_EXT,Be.ZERO_TO_ONE_EXT):Be.clipControlEXT(Be.LOWER_LEFT_EXT,Be.NEGATIVE_ONE_TO_ONE_EXT);const qe=Me;Me=null,this.setClear(qe)}pe=ye},getReversed:function(){return pe},setTest:function(ye){ye?J(n.DEPTH_TEST):re(n.DEPTH_TEST)},setMask:function(ye){ie!==ye&&!q&&(n.depthMask(ye),ie=ye)},setFunc:function(ye){if(pe&&(ye=yM[ye]),_e!==ye){switch(ye){case Dl:n.depthFunc(n.NEVER);break;case Ll:n.depthFunc(n.ALWAYS);break;case Ul:n.depthFunc(n.LESS);break;case Pr:n.depthFunc(n.LEQUAL);break;case Nl:n.depthFunc(n.EQUAL);break;case Il:n.depthFunc(n.GEQUAL);break;case Fl:n.depthFunc(n.GREATER);break;case Ol:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}_e=ye}},setLocked:function(ye){q=ye},setClear:function(ye){Me!==ye&&(pe&&(ye=1-ye),n.clearDepth(ye),Me=ye)},reset:function(){q=!1,ie=null,_e=null,Me=null,pe=!1}}}function r(){let q=!1,pe=null,ie=null,_e=null,Me=null,ye=null,Be=null,qe=null,ze=null;return{setTest:function(He){q||(He?J(n.STENCIL_TEST):re(n.STENCIL_TEST))},setMask:function(He){pe!==He&&!q&&(n.stencilMask(He),pe=He)},setFunc:function(He,lt,ht){(ie!==He||_e!==lt||Me!==ht)&&(n.stencilFunc(He,lt,ht),ie=He,_e=lt,Me=ht)},setOp:function(He,lt,ht){(ye!==He||Be!==lt||qe!==ht)&&(n.stencilOp(He,lt,ht),ye=He,Be=lt,qe=ht)},setLocked:function(He){q=He},setClear:function(He){ze!==He&&(n.clearStencil(He),ze=He)},reset:function(){q=!1,pe=null,ie=null,_e=null,Me=null,ye=null,Be=null,qe=null,ze=null}}}const s=new t,a=new i,o=new r,l=new WeakMap,c=new WeakMap;let u={},h={},f=new WeakMap,d=[],g=null,v=!1,m=null,p=null,y=null,x=null,_=null,S=null,T=null,E=new Ke(0,0,0),A=0,M=!1,b=null,L=null,P=null,I=null,F=null;const K=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let G=!1,$=0;const O=n.getParameter(n.VERSION);O.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(O)[1]),G=$>=1):O.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),G=$>=2);let W=null,Y={};const N=n.getParameter(n.SCISSOR_BOX),V=n.getParameter(n.VIEWPORT),ee=new gt().fromArray(N),z=new gt().fromArray(V);function j(q,pe,ie,_e){const Me=new Uint8Array(4),ye=n.createTexture();n.bindTexture(q,ye),n.texParameteri(q,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(q,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Be=0;Be<ie;Be++)q===n.TEXTURE_3D||q===n.TEXTURE_2D_ARRAY?n.texImage3D(pe,0,n.RGBA,1,1,_e,0,n.RGBA,n.UNSIGNED_BYTE,Me):n.texImage2D(pe+Be,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Me);return ye}const ne={};ne[n.TEXTURE_2D]=j(n.TEXTURE_2D,n.TEXTURE_2D,1),ne[n.TEXTURE_CUBE_MAP]=j(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),ne[n.TEXTURE_2D_ARRAY]=j(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),ne[n.TEXTURE_3D]=j(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),J(n.DEPTH_TEST),a.setFunc(Pr),be(!1),Ee(ah),J(n.CULL_FACE),B($n);function J(q){u[q]!==!0&&(n.enable(q),u[q]=!0)}function re(q){u[q]!==!1&&(n.disable(q),u[q]=!1)}function me(q,pe){return h[q]!==pe?(n.bindFramebuffer(q,pe),h[q]=pe,q===n.DRAW_FRAMEBUFFER&&(h[n.FRAMEBUFFER]=pe),q===n.FRAMEBUFFER&&(h[n.DRAW_FRAMEBUFFER]=pe),!0):!1}function Se(q,pe){let ie=d,_e=!1;if(q){ie=f.get(pe),ie===void 0&&(ie=[],f.set(pe,ie));const Me=q.textures;if(ie.length!==Me.length||ie[0]!==n.COLOR_ATTACHMENT0){for(let ye=0,Be=Me.length;ye<Be;ye++)ie[ye]=n.COLOR_ATTACHMENT0+ye;ie.length=Me.length,_e=!0}}else ie[0]!==n.BACK&&(ie[0]=n.BACK,_e=!0);_e&&n.drawBuffers(ie)}function xe(q){return g!==q?(n.useProgram(q),g=q,!0):!1}const he={[ki]:n.FUNC_ADD,[A_]:n.FUNC_SUBTRACT,[C_]:n.FUNC_REVERSE_SUBTRACT};he[R_]=n.MIN,he[P_]=n.MAX;const Ie={[D_]:n.ZERO,[L_]:n.ONE,[U_]:n.SRC_COLOR,[Rl]:n.SRC_ALPHA,[B_]:n.SRC_ALPHA_SATURATE,[O_]:n.DST_COLOR,[I_]:n.DST_ALPHA,[N_]:n.ONE_MINUS_SRC_COLOR,[Pl]:n.ONE_MINUS_SRC_ALPHA,[k_]:n.ONE_MINUS_DST_COLOR,[F_]:n.ONE_MINUS_DST_ALPHA,[z_]:n.CONSTANT_COLOR,[V_]:n.ONE_MINUS_CONSTANT_COLOR,[G_]:n.CONSTANT_ALPHA,[H_]:n.ONE_MINUS_CONSTANT_ALPHA};function B(q,pe,ie,_e,Me,ye,Be,qe,ze,He){if(q===$n){v===!0&&(re(n.BLEND),v=!1);return}if(v===!1&&(J(n.BLEND),v=!0),q!==w_){if(q!==m||He!==M){if((p!==ki||_!==ki)&&(n.blendEquation(n.FUNC_ADD),p=ki,_=ki),He)switch(q){case Er:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case za:n.blendFunc(n.ONE,n.ONE);break;case oh:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case lh:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",q);break}else switch(q){case Er:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case za:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case oh:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case lh:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",q);break}y=null,x=null,S=null,T=null,E.set(0,0,0),A=0,m=q,M=He}return}Me=Me||pe,ye=ye||ie,Be=Be||_e,(pe!==p||Me!==_)&&(n.blendEquationSeparate(he[pe],he[Me]),p=pe,_=Me),(ie!==y||_e!==x||ye!==S||Be!==T)&&(n.blendFuncSeparate(Ie[ie],Ie[_e],Ie[ye],Ie[Be]),y=ie,x=_e,S=ye,T=Be),(qe.equals(E)===!1||ze!==A)&&(n.blendColor(qe.r,qe.g,qe.b,ze),E.copy(qe),A=ze),m=q,M=!1}function Pe(q,pe){q.side===kn?re(n.CULL_FACE):J(n.CULL_FACE);let ie=q.side===qt;pe&&(ie=!ie),be(ie),q.blending===Er&&q.transparent===!1?B($n):B(q.blending,q.blendEquation,q.blendSrc,q.blendDst,q.blendEquationAlpha,q.blendSrcAlpha,q.blendDstAlpha,q.blendColor,q.blendAlpha,q.premultipliedAlpha),a.setFunc(q.depthFunc),a.setTest(q.depthTest),a.setMask(q.depthWrite),s.setMask(q.colorWrite);const _e=q.stencilWrite;o.setTest(_e),_e&&(o.setMask(q.stencilWriteMask),o.setFunc(q.stencilFunc,q.stencilRef,q.stencilFuncMask),o.setOp(q.stencilFail,q.stencilZFail,q.stencilZPass)),Ae(q.polygonOffset,q.polygonOffsetFactor,q.polygonOffsetUnits),q.alphaToCoverage===!0?J(n.SAMPLE_ALPHA_TO_COVERAGE):re(n.SAMPLE_ALPHA_TO_COVERAGE)}function be(q){b!==q&&(q?n.frontFace(n.CW):n.frontFace(n.CCW),b=q)}function Ee(q){q!==M_?(J(n.CULL_FACE),q!==L&&(q===ah?n.cullFace(n.BACK):q===T_?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):re(n.CULL_FACE),L=q}function se(q){q!==P&&(G&&n.lineWidth(q),P=q)}function Ae(q,pe,ie){q?(J(n.POLYGON_OFFSET_FILL),(I!==pe||F!==ie)&&(n.polygonOffset(pe,ie),I=pe,F=ie)):re(n.POLYGON_OFFSET_FILL)}function de(q){q?J(n.SCISSOR_TEST):re(n.SCISSOR_TEST)}function C(q){q===void 0&&(q=n.TEXTURE0+K-1),W!==q&&(n.activeTexture(q),W=q)}function w(q,pe,ie){ie===void 0&&(W===null?ie=n.TEXTURE0+K-1:ie=W);let _e=Y[ie];_e===void 0&&(_e={type:void 0,texture:void 0},Y[ie]=_e),(_e.type!==q||_e.texture!==pe)&&(W!==ie&&(n.activeTexture(ie),W=ie),n.bindTexture(q,pe||ne[q]),_e.type=q,_e.texture=pe)}function U(){const q=Y[W];q!==void 0&&q.type!==void 0&&(n.bindTexture(q.type,null),q.type=void 0,q.texture=void 0)}function k(){try{n.compressedTexImage2D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function X(){try{n.compressedTexImage3D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Z(){try{n.texSubImage2D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function ue(){try{n.texSubImage3D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function le(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function fe(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function De(){try{n.texStorage2D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function ve(){try{n.texStorage3D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function we(){try{n.texImage2D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Ce(){try{n.texImage3D.apply(n,arguments)}catch(q){console.error("THREE.WebGLState:",q)}}function Re(q){ee.equals(q)===!1&&(n.scissor(q.x,q.y,q.z,q.w),ee.copy(q))}function ge(q){z.equals(q)===!1&&(n.viewport(q.x,q.y,q.z,q.w),z.copy(q))}function Ve(q,pe){let ie=c.get(pe);ie===void 0&&(ie=new WeakMap,c.set(pe,ie));let _e=ie.get(q);_e===void 0&&(_e=n.getUniformBlockIndex(pe,q.name),ie.set(q,_e))}function ke(q,pe){const _e=c.get(pe).get(q);l.get(pe)!==_e&&(n.uniformBlockBinding(pe,_e,q.__bindingPointIndex),l.set(pe,_e))}function $e(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),u={},W=null,Y={},h={},f=new WeakMap,d=[],g=null,v=!1,m=null,p=null,y=null,x=null,_=null,S=null,T=null,E=new Ke(0,0,0),A=0,M=!1,b=null,L=null,P=null,I=null,F=null,ee.set(0,0,n.canvas.width,n.canvas.height),z.set(0,0,n.canvas.width,n.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:J,disable:re,bindFramebuffer:me,drawBuffers:Se,useProgram:xe,setBlending:B,setMaterial:Pe,setFlipSided:be,setCullFace:Ee,setLineWidth:se,setPolygonOffset:Ae,setScissorTest:de,activeTexture:C,bindTexture:w,unbindTexture:U,compressedTexImage2D:k,compressedTexImage3D:X,texImage2D:we,texImage3D:Ce,updateUBOMapping:Ve,uniformBlockBinding:ke,texStorage2D:De,texStorage3D:ve,texSubImage2D:Z,texSubImage3D:ue,compressedTexSubImage2D:le,compressedTexSubImage3D:fe,scissor:Re,viewport:ge,reset:$e}}function bM(n,e,t,i,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new je,u=new WeakMap;let h;const f=new WeakMap;let d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(C,w){return d?new OffscreenCanvas(C,w):Ha("canvas")}function v(C,w,U){let k=1;const X=de(C);if((X.width>U||X.height>U)&&(k=U/Math.max(X.width,X.height)),k<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const Z=Math.floor(k*X.width),ue=Math.floor(k*X.height);h===void 0&&(h=g(Z,ue));const le=w?g(Z,ue):h;return le.width=Z,le.height=ue,le.getContext("2d").drawImage(C,0,0,Z,ue),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+X.width+"x"+X.height+") to ("+Z+"x"+ue+")."),le}else return"data"in C&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+X.width+"x"+X.height+")."),C;return C}function m(C){return C.generateMipmaps}function p(C){n.generateMipmap(C)}function y(C){return C.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?n.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function x(C,w,U,k,X=!1){if(C!==null){if(n[C]!==void 0)return n[C];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let Z=w;if(w===n.RED&&(U===n.FLOAT&&(Z=n.R32F),U===n.HALF_FLOAT&&(Z=n.R16F),U===n.UNSIGNED_BYTE&&(Z=n.R8)),w===n.RED_INTEGER&&(U===n.UNSIGNED_BYTE&&(Z=n.R8UI),U===n.UNSIGNED_SHORT&&(Z=n.R16UI),U===n.UNSIGNED_INT&&(Z=n.R32UI),U===n.BYTE&&(Z=n.R8I),U===n.SHORT&&(Z=n.R16I),U===n.INT&&(Z=n.R32I)),w===n.RG&&(U===n.FLOAT&&(Z=n.RG32F),U===n.HALF_FLOAT&&(Z=n.RG16F),U===n.UNSIGNED_BYTE&&(Z=n.RG8)),w===n.RG_INTEGER&&(U===n.UNSIGNED_BYTE&&(Z=n.RG8UI),U===n.UNSIGNED_SHORT&&(Z=n.RG16UI),U===n.UNSIGNED_INT&&(Z=n.RG32UI),U===n.BYTE&&(Z=n.RG8I),U===n.SHORT&&(Z=n.RG16I),U===n.INT&&(Z=n.RG32I)),w===n.RGB_INTEGER&&(U===n.UNSIGNED_BYTE&&(Z=n.RGB8UI),U===n.UNSIGNED_SHORT&&(Z=n.RGB16UI),U===n.UNSIGNED_INT&&(Z=n.RGB32UI),U===n.BYTE&&(Z=n.RGB8I),U===n.SHORT&&(Z=n.RGB16I),U===n.INT&&(Z=n.RGB32I)),w===n.RGBA_INTEGER&&(U===n.UNSIGNED_BYTE&&(Z=n.RGBA8UI),U===n.UNSIGNED_SHORT&&(Z=n.RGBA16UI),U===n.UNSIGNED_INT&&(Z=n.RGBA32UI),U===n.BYTE&&(Z=n.RGBA8I),U===n.SHORT&&(Z=n.RGBA16I),U===n.INT&&(Z=n.RGBA32I)),w===n.RGB&&U===n.UNSIGNED_INT_5_9_9_9_REV&&(Z=n.RGB9_E5),w===n.RGBA){const ue=X?Va:st.getTransfer(k);U===n.FLOAT&&(Z=n.RGBA32F),U===n.HALF_FLOAT&&(Z=n.RGBA16F),U===n.UNSIGNED_BYTE&&(Z=ue===at?n.SRGB8_ALPHA8:n.RGBA8),U===n.UNSIGNED_SHORT_4_4_4_4&&(Z=n.RGBA4),U===n.UNSIGNED_SHORT_5_5_5_1&&(Z=n.RGB5_A1)}return(Z===n.R16F||Z===n.R32F||Z===n.RG16F||Z===n.RG32F||Z===n.RGBA16F||Z===n.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function _(C,w){let U;return C?w===null||w===Xi||w===Ur?U=n.DEPTH24_STENCIL8:w===Bn?U=n.DEPTH32F_STENCIL8:w===Es&&(U=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):w===null||w===Xi||w===Ur?U=n.DEPTH_COMPONENT24:w===Bn?U=n.DEPTH_COMPONENT32F:w===Es&&(U=n.DEPTH_COMPONENT16),U}function S(C,w){return m(C)===!0||C.isFramebufferTexture&&C.minFilter!==fn&&C.minFilter!==Sn?Math.log2(Math.max(w.width,w.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?w.mipmaps.length:1}function T(C){const w=C.target;w.removeEventListener("dispose",T),A(w),w.isVideoTexture&&u.delete(w)}function E(C){const w=C.target;w.removeEventListener("dispose",E),b(w)}function A(C){const w=i.get(C);if(w.__webglInit===void 0)return;const U=C.source,k=f.get(U);if(k){const X=k[w.__cacheKey];X.usedTimes--,X.usedTimes===0&&M(C),Object.keys(k).length===0&&f.delete(U)}i.remove(C)}function M(C){const w=i.get(C);n.deleteTexture(w.__webglTexture);const U=C.source,k=f.get(U);delete k[w.__cacheKey],a.memory.textures--}function b(C){const w=i.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),i.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let k=0;k<6;k++){if(Array.isArray(w.__webglFramebuffer[k]))for(let X=0;X<w.__webglFramebuffer[k].length;X++)n.deleteFramebuffer(w.__webglFramebuffer[k][X]);else n.deleteFramebuffer(w.__webglFramebuffer[k]);w.__webglDepthbuffer&&n.deleteRenderbuffer(w.__webglDepthbuffer[k])}else{if(Array.isArray(w.__webglFramebuffer))for(let k=0;k<w.__webglFramebuffer.length;k++)n.deleteFramebuffer(w.__webglFramebuffer[k]);else n.deleteFramebuffer(w.__webglFramebuffer);if(w.__webglDepthbuffer&&n.deleteRenderbuffer(w.__webglDepthbuffer),w.__webglMultisampledFramebuffer&&n.deleteFramebuffer(w.__webglMultisampledFramebuffer),w.__webglColorRenderbuffer)for(let k=0;k<w.__webglColorRenderbuffer.length;k++)w.__webglColorRenderbuffer[k]&&n.deleteRenderbuffer(w.__webglColorRenderbuffer[k]);w.__webglDepthRenderbuffer&&n.deleteRenderbuffer(w.__webglDepthRenderbuffer)}const U=C.textures;for(let k=0,X=U.length;k<X;k++){const Z=i.get(U[k]);Z.__webglTexture&&(n.deleteTexture(Z.__webglTexture),a.memory.textures--),i.remove(U[k])}i.remove(C)}let L=0;function P(){L=0}function I(){const C=L;return C>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+r.maxTextures),L+=1,C}function F(C){const w=[];return w.push(C.wrapS),w.push(C.wrapT),w.push(C.wrapR||0),w.push(C.magFilter),w.push(C.minFilter),w.push(C.anisotropy),w.push(C.internalFormat),w.push(C.format),w.push(C.type),w.push(C.generateMipmaps),w.push(C.premultiplyAlpha),w.push(C.flipY),w.push(C.unpackAlignment),w.push(C.colorSpace),w.join()}function K(C,w){const U=i.get(C);if(C.isVideoTexture&&se(C),C.isRenderTargetTexture===!1&&C.version>0&&U.__version!==C.version){const k=C.image;if(k===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(k.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{z(U,C,w);return}}t.bindTexture(n.TEXTURE_2D,U.__webglTexture,n.TEXTURE0+w)}function G(C,w){const U=i.get(C);if(C.version>0&&U.__version!==C.version){z(U,C,w);return}t.bindTexture(n.TEXTURE_2D_ARRAY,U.__webglTexture,n.TEXTURE0+w)}function $(C,w){const U=i.get(C);if(C.version>0&&U.__version!==C.version){z(U,C,w);return}t.bindTexture(n.TEXTURE_3D,U.__webglTexture,n.TEXTURE0+w)}function O(C,w){const U=i.get(C);if(C.version>0&&U.__version!==C.version){j(U,C,w);return}t.bindTexture(n.TEXTURE_CUBE_MAP,U.__webglTexture,n.TEXTURE0+w)}const W={[zl]:n.REPEAT,[zi]:n.CLAMP_TO_EDGE,[Vl]:n.MIRRORED_REPEAT},Y={[fn]:n.NEAREST,[Q_]:n.NEAREST_MIPMAP_NEAREST,[qs]:n.NEAREST_MIPMAP_LINEAR,[Sn]:n.LINEAR,[wo]:n.LINEAR_MIPMAP_NEAREST,[Vi]:n.LINEAR_MIPMAP_LINEAR},N={[i0]:n.NEVER,[c0]:n.ALWAYS,[r0]:n.LESS,[kp]:n.LEQUAL,[s0]:n.EQUAL,[l0]:n.GEQUAL,[a0]:n.GREATER,[o0]:n.NOTEQUAL};function V(C,w){if(w.type===Bn&&e.has("OES_texture_float_linear")===!1&&(w.magFilter===Sn||w.magFilter===wo||w.magFilter===qs||w.magFilter===Vi||w.minFilter===Sn||w.minFilter===wo||w.minFilter===qs||w.minFilter===Vi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(C,n.TEXTURE_WRAP_S,W[w.wrapS]),n.texParameteri(C,n.TEXTURE_WRAP_T,W[w.wrapT]),(C===n.TEXTURE_3D||C===n.TEXTURE_2D_ARRAY)&&n.texParameteri(C,n.TEXTURE_WRAP_R,W[w.wrapR]),n.texParameteri(C,n.TEXTURE_MAG_FILTER,Y[w.magFilter]),n.texParameteri(C,n.TEXTURE_MIN_FILTER,Y[w.minFilter]),w.compareFunction&&(n.texParameteri(C,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(C,n.TEXTURE_COMPARE_FUNC,N[w.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(w.magFilter===fn||w.minFilter!==qs&&w.minFilter!==Vi||w.type===Bn&&e.has("OES_texture_float_linear")===!1)return;if(w.anisotropy>1||i.get(w).__currentAnisotropy){const U=e.get("EXT_texture_filter_anisotropic");n.texParameterf(C,U.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(w.anisotropy,r.getMaxAnisotropy())),i.get(w).__currentAnisotropy=w.anisotropy}}}function ee(C,w){let U=!1;C.__webglInit===void 0&&(C.__webglInit=!0,w.addEventListener("dispose",T));const k=w.source;let X=f.get(k);X===void 0&&(X={},f.set(k,X));const Z=F(w);if(Z!==C.__cacheKey){X[Z]===void 0&&(X[Z]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,U=!0),X[Z].usedTimes++;const ue=X[C.__cacheKey];ue!==void 0&&(X[C.__cacheKey].usedTimes--,ue.usedTimes===0&&M(w)),C.__cacheKey=Z,C.__webglTexture=X[Z].texture}return U}function z(C,w,U){let k=n.TEXTURE_2D;(w.isDataArrayTexture||w.isCompressedArrayTexture)&&(k=n.TEXTURE_2D_ARRAY),w.isData3DTexture&&(k=n.TEXTURE_3D);const X=ee(C,w),Z=w.source;t.bindTexture(k,C.__webglTexture,n.TEXTURE0+U);const ue=i.get(Z);if(Z.version!==ue.__version||X===!0){t.activeTexture(n.TEXTURE0+U);const le=st.getPrimaries(st.workingColorSpace),fe=w.colorSpace===_i?null:st.getPrimaries(w.colorSpace),De=w.colorSpace===_i||le===fe?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,w.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,w.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,De);let ve=v(w.image,!1,r.maxTextureSize);ve=Ae(w,ve);const we=s.convert(w.format,w.colorSpace),Ce=s.convert(w.type);let Re=x(w.internalFormat,we,Ce,w.colorSpace,w.isVideoTexture);V(k,w);let ge;const Ve=w.mipmaps,ke=w.isVideoTexture!==!0,$e=ue.__version===void 0||X===!0,q=Z.dataReady,pe=S(w,ve);if(w.isDepthTexture)Re=_(w.format===Nr,w.type),$e&&(ke?t.texStorage2D(n.TEXTURE_2D,1,Re,ve.width,ve.height):t.texImage2D(n.TEXTURE_2D,0,Re,ve.width,ve.height,0,we,Ce,null));else if(w.isDataTexture)if(Ve.length>0){ke&&$e&&t.texStorage2D(n.TEXTURE_2D,pe,Re,Ve[0].width,Ve[0].height);for(let ie=0,_e=Ve.length;ie<_e;ie++)ge=Ve[ie],ke?q&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,ge.width,ge.height,we,Ce,ge.data):t.texImage2D(n.TEXTURE_2D,ie,Re,ge.width,ge.height,0,we,Ce,ge.data);w.generateMipmaps=!1}else ke?($e&&t.texStorage2D(n.TEXTURE_2D,pe,Re,ve.width,ve.height),q&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ve.width,ve.height,we,Ce,ve.data)):t.texImage2D(n.TEXTURE_2D,0,Re,ve.width,ve.height,0,we,Ce,ve.data);else if(w.isCompressedTexture)if(w.isCompressedArrayTexture){ke&&$e&&t.texStorage3D(n.TEXTURE_2D_ARRAY,pe,Re,Ve[0].width,Ve[0].height,ve.depth);for(let ie=0,_e=Ve.length;ie<_e;ie++)if(ge=Ve[ie],w.format!==Un)if(we!==null)if(ke){if(q)if(w.layerUpdates.size>0){const Me=Bh(ge.width,ge.height,w.format,w.type);for(const ye of w.layerUpdates){const Be=ge.data.subarray(ye*Me/ge.data.BYTES_PER_ELEMENT,(ye+1)*Me/ge.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,ye,ge.width,ge.height,1,we,Be)}w.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,0,ge.width,ge.height,ve.depth,we,ge.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ie,Re,ge.width,ge.height,ve.depth,0,ge.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ke?q&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,ie,0,0,0,ge.width,ge.height,ve.depth,we,Ce,ge.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ie,Re,ge.width,ge.height,ve.depth,0,we,Ce,ge.data)}else{ke&&$e&&t.texStorage2D(n.TEXTURE_2D,pe,Re,Ve[0].width,Ve[0].height);for(let ie=0,_e=Ve.length;ie<_e;ie++)ge=Ve[ie],w.format!==Un?we!==null?ke?q&&t.compressedTexSubImage2D(n.TEXTURE_2D,ie,0,0,ge.width,ge.height,we,ge.data):t.compressedTexImage2D(n.TEXTURE_2D,ie,Re,ge.width,ge.height,0,ge.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ke?q&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,ge.width,ge.height,we,Ce,ge.data):t.texImage2D(n.TEXTURE_2D,ie,Re,ge.width,ge.height,0,we,Ce,ge.data)}else if(w.isDataArrayTexture)if(ke){if($e&&t.texStorage3D(n.TEXTURE_2D_ARRAY,pe,Re,ve.width,ve.height,ve.depth),q)if(w.layerUpdates.size>0){const ie=Bh(ve.width,ve.height,w.format,w.type);for(const _e of w.layerUpdates){const Me=ve.data.subarray(_e*ie/ve.data.BYTES_PER_ELEMENT,(_e+1)*ie/ve.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,_e,ve.width,ve.height,1,we,Ce,Me)}w.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,ve.width,ve.height,ve.depth,we,Ce,ve.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,Re,ve.width,ve.height,ve.depth,0,we,Ce,ve.data);else if(w.isData3DTexture)ke?($e&&t.texStorage3D(n.TEXTURE_3D,pe,Re,ve.width,ve.height,ve.depth),q&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,ve.width,ve.height,ve.depth,we,Ce,ve.data)):t.texImage3D(n.TEXTURE_3D,0,Re,ve.width,ve.height,ve.depth,0,we,Ce,ve.data);else if(w.isFramebufferTexture){if($e)if(ke)t.texStorage2D(n.TEXTURE_2D,pe,Re,ve.width,ve.height);else{let ie=ve.width,_e=ve.height;for(let Me=0;Me<pe;Me++)t.texImage2D(n.TEXTURE_2D,Me,Re,ie,_e,0,we,Ce,null),ie>>=1,_e>>=1}}else if(Ve.length>0){if(ke&&$e){const ie=de(Ve[0]);t.texStorage2D(n.TEXTURE_2D,pe,Re,ie.width,ie.height)}for(let ie=0,_e=Ve.length;ie<_e;ie++)ge=Ve[ie],ke?q&&t.texSubImage2D(n.TEXTURE_2D,ie,0,0,we,Ce,ge):t.texImage2D(n.TEXTURE_2D,ie,Re,we,Ce,ge);w.generateMipmaps=!1}else if(ke){if($e){const ie=de(ve);t.texStorage2D(n.TEXTURE_2D,pe,Re,ie.width,ie.height)}q&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,we,Ce,ve)}else t.texImage2D(n.TEXTURE_2D,0,Re,we,Ce,ve);m(w)&&p(k),ue.__version=Z.version,w.onUpdate&&w.onUpdate(w)}C.__version=w.version}function j(C,w,U){if(w.image.length!==6)return;const k=ee(C,w),X=w.source;t.bindTexture(n.TEXTURE_CUBE_MAP,C.__webglTexture,n.TEXTURE0+U);const Z=i.get(X);if(X.version!==Z.__version||k===!0){t.activeTexture(n.TEXTURE0+U);const ue=st.getPrimaries(st.workingColorSpace),le=w.colorSpace===_i?null:st.getPrimaries(w.colorSpace),fe=w.colorSpace===_i||ue===le?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,w.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,w.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,fe);const De=w.isCompressedTexture||w.image[0].isCompressedTexture,ve=w.image[0]&&w.image[0].isDataTexture,we=[];for(let _e=0;_e<6;_e++)!De&&!ve?we[_e]=v(w.image[_e],!0,r.maxCubemapSize):we[_e]=ve?w.image[_e].image:w.image[_e],we[_e]=Ae(w,we[_e]);const Ce=we[0],Re=s.convert(w.format,w.colorSpace),ge=s.convert(w.type),Ve=x(w.internalFormat,Re,ge,w.colorSpace),ke=w.isVideoTexture!==!0,$e=Z.__version===void 0||k===!0,q=X.dataReady;let pe=S(w,Ce);V(n.TEXTURE_CUBE_MAP,w);let ie;if(De){ke&&$e&&t.texStorage2D(n.TEXTURE_CUBE_MAP,pe,Ve,Ce.width,Ce.height);for(let _e=0;_e<6;_e++){ie=we[_e].mipmaps;for(let Me=0;Me<ie.length;Me++){const ye=ie[Me];w.format!==Un?Re!==null?ke?q&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me,0,0,ye.width,ye.height,Re,ye.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me,Ve,ye.width,ye.height,0,ye.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):ke?q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me,0,0,ye.width,ye.height,Re,ge,ye.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me,Ve,ye.width,ye.height,0,Re,ge,ye.data)}}}else{if(ie=w.mipmaps,ke&&$e){ie.length>0&&pe++;const _e=de(we[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,pe,Ve,_e.width,_e.height)}for(let _e=0;_e<6;_e++)if(ve){ke?q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,0,0,we[_e].width,we[_e].height,Re,ge,we[_e].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,Ve,we[_e].width,we[_e].height,0,Re,ge,we[_e].data);for(let Me=0;Me<ie.length;Me++){const Be=ie[Me].image[_e].image;ke?q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me+1,0,0,Be.width,Be.height,Re,ge,Be.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me+1,Ve,Be.width,Be.height,0,Re,ge,Be.data)}}else{ke?q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,0,0,Re,ge,we[_e]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,Ve,Re,ge,we[_e]);for(let Me=0;Me<ie.length;Me++){const ye=ie[Me];ke?q&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me+1,0,0,Re,ge,ye.image[_e]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Me+1,Ve,Re,ge,ye.image[_e])}}}m(w)&&p(n.TEXTURE_CUBE_MAP),Z.__version=X.version,w.onUpdate&&w.onUpdate(w)}C.__version=w.version}function ne(C,w,U,k,X,Z){const ue=s.convert(U.format,U.colorSpace),le=s.convert(U.type),fe=x(U.internalFormat,ue,le,U.colorSpace),De=i.get(w),ve=i.get(U);if(ve.__renderTarget=w,!De.__hasExternalTextures){const we=Math.max(1,w.width>>Z),Ce=Math.max(1,w.height>>Z);X===n.TEXTURE_3D||X===n.TEXTURE_2D_ARRAY?t.texImage3D(X,Z,fe,we,Ce,w.depth,0,ue,le,null):t.texImage2D(X,Z,fe,we,Ce,0,ue,le,null)}t.bindFramebuffer(n.FRAMEBUFFER,C),Ee(w)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,k,X,ve.__webglTexture,0,be(w)):(X===n.TEXTURE_2D||X>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&X<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,k,X,ve.__webglTexture,Z),t.bindFramebuffer(n.FRAMEBUFFER,null)}function J(C,w,U){if(n.bindRenderbuffer(n.RENDERBUFFER,C),w.depthBuffer){const k=w.depthTexture,X=k&&k.isDepthTexture?k.type:null,Z=_(w.stencilBuffer,X),ue=w.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,le=be(w);Ee(w)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,le,Z,w.width,w.height):U?n.renderbufferStorageMultisample(n.RENDERBUFFER,le,Z,w.width,w.height):n.renderbufferStorage(n.RENDERBUFFER,Z,w.width,w.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,ue,n.RENDERBUFFER,C)}else{const k=w.textures;for(let X=0;X<k.length;X++){const Z=k[X],ue=s.convert(Z.format,Z.colorSpace),le=s.convert(Z.type),fe=x(Z.internalFormat,ue,le,Z.colorSpace),De=be(w);U&&Ee(w)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,De,fe,w.width,w.height):Ee(w)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,De,fe,w.width,w.height):n.renderbufferStorage(n.RENDERBUFFER,fe,w.width,w.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function re(C,w){if(w&&w.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,C),!(w.depthTexture&&w.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const k=i.get(w.depthTexture);k.__renderTarget=w,(!k.__webglTexture||w.depthTexture.image.width!==w.width||w.depthTexture.image.height!==w.height)&&(w.depthTexture.image.width=w.width,w.depthTexture.image.height=w.height,w.depthTexture.needsUpdate=!0),K(w.depthTexture,0);const X=k.__webglTexture,Z=be(w);if(w.depthTexture.format===wr)Ee(w)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,X,0,Z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,X,0);else if(w.depthTexture.format===Nr)Ee(w)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,X,0,Z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,X,0);else throw new Error("Unknown depthTexture format")}function me(C){const w=i.get(C),U=C.isWebGLCubeRenderTarget===!0;if(w.__boundDepthTexture!==C.depthTexture){const k=C.depthTexture;if(w.__depthDisposeCallback&&w.__depthDisposeCallback(),k){const X=()=>{delete w.__boundDepthTexture,delete w.__depthDisposeCallback,k.removeEventListener("dispose",X)};k.addEventListener("dispose",X),w.__depthDisposeCallback=X}w.__boundDepthTexture=k}if(C.depthTexture&&!w.__autoAllocateDepthBuffer){if(U)throw new Error("target.depthTexture not supported in Cube render targets");re(w.__webglFramebuffer,C)}else if(U){w.__webglDepthbuffer=[];for(let k=0;k<6;k++)if(t.bindFramebuffer(n.FRAMEBUFFER,w.__webglFramebuffer[k]),w.__webglDepthbuffer[k]===void 0)w.__webglDepthbuffer[k]=n.createRenderbuffer(),J(w.__webglDepthbuffer[k],C,!1);else{const X=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Z=w.__webglDepthbuffer[k];n.bindRenderbuffer(n.RENDERBUFFER,Z),n.framebufferRenderbuffer(n.FRAMEBUFFER,X,n.RENDERBUFFER,Z)}}else if(t.bindFramebuffer(n.FRAMEBUFFER,w.__webglFramebuffer),w.__webglDepthbuffer===void 0)w.__webglDepthbuffer=n.createRenderbuffer(),J(w.__webglDepthbuffer,C,!1);else{const k=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,X=w.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,X),n.framebufferRenderbuffer(n.FRAMEBUFFER,k,n.RENDERBUFFER,X)}t.bindFramebuffer(n.FRAMEBUFFER,null)}function Se(C,w,U){const k=i.get(C);w!==void 0&&ne(k.__webglFramebuffer,C,C.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),U!==void 0&&me(C)}function xe(C){const w=C.texture,U=i.get(C),k=i.get(w);C.addEventListener("dispose",E);const X=C.textures,Z=C.isWebGLCubeRenderTarget===!0,ue=X.length>1;if(ue||(k.__webglTexture===void 0&&(k.__webglTexture=n.createTexture()),k.__version=w.version,a.memory.textures++),Z){U.__webglFramebuffer=[];for(let le=0;le<6;le++)if(w.mipmaps&&w.mipmaps.length>0){U.__webglFramebuffer[le]=[];for(let fe=0;fe<w.mipmaps.length;fe++)U.__webglFramebuffer[le][fe]=n.createFramebuffer()}else U.__webglFramebuffer[le]=n.createFramebuffer()}else{if(w.mipmaps&&w.mipmaps.length>0){U.__webglFramebuffer=[];for(let le=0;le<w.mipmaps.length;le++)U.__webglFramebuffer[le]=n.createFramebuffer()}else U.__webglFramebuffer=n.createFramebuffer();if(ue)for(let le=0,fe=X.length;le<fe;le++){const De=i.get(X[le]);De.__webglTexture===void 0&&(De.__webglTexture=n.createTexture(),a.memory.textures++)}if(C.samples>0&&Ee(C)===!1){U.__webglMultisampledFramebuffer=n.createFramebuffer(),U.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,U.__webglMultisampledFramebuffer);for(let le=0;le<X.length;le++){const fe=X[le];U.__webglColorRenderbuffer[le]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,U.__webglColorRenderbuffer[le]);const De=s.convert(fe.format,fe.colorSpace),ve=s.convert(fe.type),we=x(fe.internalFormat,De,ve,fe.colorSpace,C.isXRRenderTarget===!0),Ce=be(C);n.renderbufferStorageMultisample(n.RENDERBUFFER,Ce,we,C.width,C.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+le,n.RENDERBUFFER,U.__webglColorRenderbuffer[le])}n.bindRenderbuffer(n.RENDERBUFFER,null),C.depthBuffer&&(U.__webglDepthRenderbuffer=n.createRenderbuffer(),J(U.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Z){t.bindTexture(n.TEXTURE_CUBE_MAP,k.__webglTexture),V(n.TEXTURE_CUBE_MAP,w);for(let le=0;le<6;le++)if(w.mipmaps&&w.mipmaps.length>0)for(let fe=0;fe<w.mipmaps.length;fe++)ne(U.__webglFramebuffer[le][fe],C,w,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+le,fe);else ne(U.__webglFramebuffer[le],C,w,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+le,0);m(w)&&p(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ue){for(let le=0,fe=X.length;le<fe;le++){const De=X[le],ve=i.get(De);t.bindTexture(n.TEXTURE_2D,ve.__webglTexture),V(n.TEXTURE_2D,De),ne(U.__webglFramebuffer,C,De,n.COLOR_ATTACHMENT0+le,n.TEXTURE_2D,0),m(De)&&p(n.TEXTURE_2D)}t.unbindTexture()}else{let le=n.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(le=C.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(le,k.__webglTexture),V(le,w),w.mipmaps&&w.mipmaps.length>0)for(let fe=0;fe<w.mipmaps.length;fe++)ne(U.__webglFramebuffer[fe],C,w,n.COLOR_ATTACHMENT0,le,fe);else ne(U.__webglFramebuffer,C,w,n.COLOR_ATTACHMENT0,le,0);m(w)&&p(le),t.unbindTexture()}C.depthBuffer&&me(C)}function he(C){const w=C.textures;for(let U=0,k=w.length;U<k;U++){const X=w[U];if(m(X)){const Z=y(C),ue=i.get(X).__webglTexture;t.bindTexture(Z,ue),p(Z),t.unbindTexture()}}}const Ie=[],B=[];function Pe(C){if(C.samples>0){if(Ee(C)===!1){const w=C.textures,U=C.width,k=C.height;let X=n.COLOR_BUFFER_BIT;const Z=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ue=i.get(C),le=w.length>1;if(le)for(let fe=0;fe<w.length;fe++)t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ue.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglFramebuffer);for(let fe=0;fe<w.length;fe++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(X|=n.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(X|=n.STENCIL_BUFFER_BIT)),le){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ue.__webglColorRenderbuffer[fe]);const De=i.get(w[fe]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,De,0)}n.blitFramebuffer(0,0,U,k,0,0,U,k,X,n.NEAREST),l===!0&&(Ie.length=0,B.length=0,Ie.push(n.COLOR_ATTACHMENT0+fe),C.depthBuffer&&C.resolveDepthBuffer===!1&&(Ie.push(Z),B.push(Z),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,B)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Ie))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),le)for(let fe=0;fe<w.length;fe++){t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.RENDERBUFFER,ue.__webglColorRenderbuffer[fe]);const De=i.get(w[fe]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+fe,n.TEXTURE_2D,De,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.resolveDepthBuffer===!1&&l){const w=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[w])}}}function be(C){return Math.min(r.maxSamples,C.samples)}function Ee(C){const w=i.get(C);return C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&w.__useRenderToTexture!==!1}function se(C){const w=a.render.frame;u.get(C)!==w&&(u.set(C,w),C.update())}function Ae(C,w){const U=C.colorSpace,k=C.format,X=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||U!==Ir&&U!==_i&&(st.getTransfer(U)===at?(k!==Un||X!==ni)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",U)),w}function de(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(c.width=C.naturalWidth||C.width,c.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(c.width=C.displayWidth,c.height=C.displayHeight):(c.width=C.width,c.height=C.height),c}this.allocateTextureUnit=I,this.resetTextureUnits=P,this.setTexture2D=K,this.setTexture2DArray=G,this.setTexture3D=$,this.setTextureCube=O,this.rebindTextures=Se,this.setupRenderTarget=xe,this.updateRenderTargetMipmap=he,this.updateMultisampleRenderTarget=Pe,this.setupDepthRenderbuffer=me,this.setupFrameBufferTexture=ne,this.useMultisampledRTT=Ee}function MM(n,e){function t(i,r=_i){let s;const a=st.getTransfer(r);if(i===ni)return n.UNSIGNED_BYTE;if(i===Zc)return n.UNSIGNED_SHORT_4_4_4_4;if(i===$c)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Pp)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Cp)return n.BYTE;if(i===Rp)return n.SHORT;if(i===Es)return n.UNSIGNED_SHORT;if(i===Kc)return n.INT;if(i===Xi)return n.UNSIGNED_INT;if(i===Bn)return n.FLOAT;if(i===Jn)return n.HALF_FLOAT;if(i===Dp)return n.ALPHA;if(i===Lp)return n.RGB;if(i===Un)return n.RGBA;if(i===Up)return n.LUMINANCE;if(i===Np)return n.LUMINANCE_ALPHA;if(i===wr)return n.DEPTH_COMPONENT;if(i===Nr)return n.DEPTH_STENCIL;if(i===Jc)return n.RED;if(i===Qc)return n.RED_INTEGER;if(i===Ip)return n.RG;if(i===eu)return n.RG_INTEGER;if(i===tu)return n.RGBA_INTEGER;if(i===Ea||i===wa||i===Aa||i===Ca)if(a===at)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===Ea)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===wa)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Aa)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Ca)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===Ea)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===wa)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Aa)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Ca)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Gl||i===Hl||i===Wl||i===jl)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Gl)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Hl)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Wl)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===jl)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Xl||i===Yl||i===ql)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Xl||i===Yl)return a===at?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===ql)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Kl||i===Zl||i===$l||i===Jl||i===Ql||i===ec||i===tc||i===nc||i===ic||i===rc||i===sc||i===ac||i===oc||i===lc)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Kl)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Zl)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===$l)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Jl)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ql)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===ec)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===tc)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===nc)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===ic)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===rc)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===sc)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===ac)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===oc)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===lc)return a===at?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Ra||i===cc||i===uc)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===Ra)return a===at?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===cc)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===uc)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Fp||i===hc||i===fc||i===dc)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===Ra)return s.COMPRESSED_RED_RGTC1_EXT;if(i===hc)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===fc)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===dc)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Ur?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const TM={type:"move"};class tl{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new xr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new xr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new te,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new te),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new xr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new te,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new te),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const v of e.hand.values()){const m=t.getJointPose(v,i),p=this._getHandJoint(c,v);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const u=c.joints["index-finger-tip"],h=c.joints["thumb-tip"],f=u.position.distanceTo(h.position),d=.02,g=.005;c.inputState.pinching&&f>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&f<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(TM)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new xr;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const EM=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,wM=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class AM{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,i){if(this.texture===null){const r=new Gt,s=e.properties.get(r);s.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new jt({vertexShader:EM,fragmentShader:wM,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new zt(new $i(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class CM extends Ki{constructor(e,t){super();const i=this;let r=null,s=1,a=null,o="local-floor",l=1,c=null,u=null,h=null,f=null,d=null,g=null;const v=new AM,m=t.getContextAttributes();let p=null,y=null;const x=[],_=[],S=new je;let T=null;const E=new yn;E.viewport=new gt;const A=new yn;A.viewport=new gt;const M=[E,A],b=new X0;let L=null,P=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(z){let j=x[z];return j===void 0&&(j=new tl,x[z]=j),j.getTargetRaySpace()},this.getControllerGrip=function(z){let j=x[z];return j===void 0&&(j=new tl,x[z]=j),j.getGripSpace()},this.getHand=function(z){let j=x[z];return j===void 0&&(j=new tl,x[z]=j),j.getHandSpace()};function I(z){const j=_.indexOf(z.inputSource);if(j===-1)return;const ne=x[j];ne!==void 0&&(ne.update(z.inputSource,z.frame,c||a),ne.dispatchEvent({type:z.type,data:z.inputSource}))}function F(){r.removeEventListener("select",I),r.removeEventListener("selectstart",I),r.removeEventListener("selectend",I),r.removeEventListener("squeeze",I),r.removeEventListener("squeezestart",I),r.removeEventListener("squeezeend",I),r.removeEventListener("end",F),r.removeEventListener("inputsourceschange",K);for(let z=0;z<x.length;z++){const j=_[z];j!==null&&(_[z]=null,x[z].disconnect(j))}L=null,P=null,v.reset(),e.setRenderTarget(p),d=null,f=null,h=null,r=null,y=null,ee.stop(),i.isPresenting=!1,e.setPixelRatio(T),e.setSize(S.width,S.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(z){s=z,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(z){o=z,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(z){c=z},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return h},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(z){if(r=z,r!==null){if(p=e.getRenderTarget(),r.addEventListener("select",I),r.addEventListener("selectstart",I),r.addEventListener("selectend",I),r.addEventListener("squeeze",I),r.addEventListener("squeezestart",I),r.addEventListener("squeezeend",I),r.addEventListener("end",F),r.addEventListener("inputsourceschange",K),m.xrCompatible!==!0&&await t.makeXRCompatible(),T=e.getPixelRatio(),e.getSize(S),r.renderState.layers===void 0){const j={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,t,j),r.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),y=new Nn(d.framebufferWidth,d.framebufferHeight,{format:Un,type:ni,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let j=null,ne=null,J=null;m.depth&&(J=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,j=m.stencil?Nr:wr,ne=m.stencil?Ur:Xi);const re={colorFormat:t.RGBA8,depthFormat:J,scaleFactor:s};h=new XRWebGLBinding(r,t),f=h.createProjectionLayer(re),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),y=new Nn(f.textureWidth,f.textureHeight,{format:Un,type:ni,depthTexture:new Zp(f.textureWidth,f.textureHeight,ne,void 0,void 0,void 0,void 0,void 0,void 0,j),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await r.requestReferenceSpace(o),ee.setContext(r),ee.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return v.getDepthTexture()};function K(z){for(let j=0;j<z.removed.length;j++){const ne=z.removed[j],J=_.indexOf(ne);J>=0&&(_[J]=null,x[J].disconnect(ne))}for(let j=0;j<z.added.length;j++){const ne=z.added[j];let J=_.indexOf(ne);if(J===-1){for(let me=0;me<x.length;me++)if(me>=_.length){_.push(ne),J=me;break}else if(_[me]===null){_[me]=ne,J=me;break}if(J===-1)break}const re=x[J];re&&re.connect(ne)}}const G=new te,$=new te;function O(z,j,ne){G.setFromMatrixPosition(j.matrixWorld),$.setFromMatrixPosition(ne.matrixWorld);const J=G.distanceTo($),re=j.projectionMatrix.elements,me=ne.projectionMatrix.elements,Se=re[14]/(re[10]-1),xe=re[14]/(re[10]+1),he=(re[9]+1)/re[5],Ie=(re[9]-1)/re[5],B=(re[8]-1)/re[0],Pe=(me[8]+1)/me[0],be=Se*B,Ee=Se*Pe,se=J/(-B+Pe),Ae=se*-B;if(j.matrixWorld.decompose(z.position,z.quaternion,z.scale),z.translateX(Ae),z.translateZ(se),z.matrixWorld.compose(z.position,z.quaternion,z.scale),z.matrixWorldInverse.copy(z.matrixWorld).invert(),re[10]===-1)z.projectionMatrix.copy(j.projectionMatrix),z.projectionMatrixInverse.copy(j.projectionMatrixInverse);else{const de=Se+se,C=xe+se,w=be-Ae,U=Ee+(J-Ae),k=he*xe/C*de,X=Ie*xe/C*de;z.projectionMatrix.makePerspective(w,U,k,X,de,C),z.projectionMatrixInverse.copy(z.projectionMatrix).invert()}}function W(z,j){j===null?z.matrixWorld.copy(z.matrix):z.matrixWorld.multiplyMatrices(j.matrixWorld,z.matrix),z.matrixWorldInverse.copy(z.matrixWorld).invert()}this.updateCamera=function(z){if(r===null)return;let j=z.near,ne=z.far;v.texture!==null&&(v.depthNear>0&&(j=v.depthNear),v.depthFar>0&&(ne=v.depthFar)),b.near=A.near=E.near=j,b.far=A.far=E.far=ne,(L!==b.near||P!==b.far)&&(r.updateRenderState({depthNear:b.near,depthFar:b.far}),L=b.near,P=b.far),E.layers.mask=z.layers.mask|2,A.layers.mask=z.layers.mask|4,b.layers.mask=E.layers.mask|A.layers.mask;const J=z.parent,re=b.cameras;W(b,J);for(let me=0;me<re.length;me++)W(re[me],J);re.length===2?O(b,E,A):b.projectionMatrix.copy(E.projectionMatrix),Y(z,b,J)};function Y(z,j,ne){ne===null?z.matrix.copy(j.matrixWorld):(z.matrix.copy(ne.matrixWorld),z.matrix.invert(),z.matrix.multiply(j.matrixWorld)),z.matrix.decompose(z.position,z.quaternion,z.scale),z.updateMatrixWorld(!0),z.projectionMatrix.copy(j.projectionMatrix),z.projectionMatrixInverse.copy(j.projectionMatrixInverse),z.isPerspectiveCamera&&(z.fov=pc*2*Math.atan(1/z.projectionMatrix.elements[5]),z.zoom=1)}this.getCamera=function(){return b},this.getFoveation=function(){if(!(f===null&&d===null))return l},this.setFoveation=function(z){l=z,f!==null&&(f.fixedFoveation=z),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=z)},this.hasDepthSensing=function(){return v.texture!==null},this.getDepthSensingMesh=function(){return v.getMesh(b)};let N=null;function V(z,j){if(u=j.getViewerPose(c||a),g=j,u!==null){const ne=u.views;d!==null&&(e.setRenderTargetFramebuffer(y,d.framebuffer),e.setRenderTarget(y));let J=!1;ne.length!==b.cameras.length&&(b.cameras.length=0,J=!0);for(let me=0;me<ne.length;me++){const Se=ne[me];let xe=null;if(d!==null)xe=d.getViewport(Se);else{const Ie=h.getViewSubImage(f,Se);xe=Ie.viewport,me===0&&(e.setRenderTargetTextures(y,Ie.colorTexture,f.ignoreDepthValues?void 0:Ie.depthStencilTexture),e.setRenderTarget(y))}let he=M[me];he===void 0&&(he=new yn,he.layers.enable(me),he.viewport=new gt,M[me]=he),he.matrix.fromArray(Se.transform.matrix),he.matrix.decompose(he.position,he.quaternion,he.scale),he.projectionMatrix.fromArray(Se.projectionMatrix),he.projectionMatrixInverse.copy(he.projectionMatrix).invert(),he.viewport.set(xe.x,xe.y,xe.width,xe.height),me===0&&(b.matrix.copy(he.matrix),b.matrix.decompose(b.position,b.quaternion,b.scale)),J===!0&&b.cameras.push(he)}const re=r.enabledFeatures;if(re&&re.includes("depth-sensing")){const me=h.getDepthInformation(ne[0]);me&&me.isValid&&me.texture&&v.init(e,me,r.renderState)}}for(let ne=0;ne<x.length;ne++){const J=_[ne],re=x[ne];J!==null&&re!==void 0&&re.update(J,j,c||a)}N&&N(z,j),j.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:j}),g=null}const ee=new em;ee.setAnimationLoop(V),this.setAnimationLoop=function(z){N=z},this.dispose=function(){}}}const Li=new ii,RM=new ut;function PM(n,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,jp(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,y,x,_){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),h(m,p)):p.isMeshPhongMaterial?(s(m,p),u(m,p)):p.isMeshStandardMaterial?(s(m,p),f(m,p),p.isMeshPhysicalMaterial&&d(m,p,_)):p.isMeshMatcapMaterial?(s(m,p),g(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),v(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,y,x):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===qt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===qt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const y=e.get(p),x=y.envMap,_=y.envMapRotation;x&&(m.envMap.value=x,Li.copy(_),Li.x*=-1,Li.y*=-1,Li.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Li.y*=-1,Li.z*=-1),m.envMapRotation.value.setFromMatrix4(RM.makeRotationFromEuler(Li)),m.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,y,x){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*y,m.scale.value=x*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function h(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function f(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,y){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===qt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=y.texture,m.transmissionSamplerSize.value.set(y.width,y.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function v(m,p){const y=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(y.matrixWorld),m.nearDistance.value=y.shadow.camera.near,m.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function DM(n,e,t,i){let r={},s={},a=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,x){const _=x.program;i.uniformBlockBinding(y,_)}function c(y,x){let _=r[y.id];_===void 0&&(g(y),_=u(y),r[y.id]=_,y.addEventListener("dispose",m));const S=x.program;i.updateUBOMapping(y,S);const T=e.render.frame;s[y.id]!==T&&(f(y),s[y.id]=T)}function u(y){const x=h();y.__bindingPointIndex=x;const _=n.createBuffer(),S=y.__size,T=y.usage;return n.bindBuffer(n.UNIFORM_BUFFER,_),n.bufferData(n.UNIFORM_BUFFER,S,T),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,x,_),_}function h(){for(let y=0;y<o;y++)if(a.indexOf(y)===-1)return a.push(y),y;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(y){const x=r[y.id],_=y.uniforms,S=y.__cache;n.bindBuffer(n.UNIFORM_BUFFER,x);for(let T=0,E=_.length;T<E;T++){const A=Array.isArray(_[T])?_[T]:[_[T]];for(let M=0,b=A.length;M<b;M++){const L=A[M];if(d(L,T,M,S)===!0){const P=L.__offset,I=Array.isArray(L.value)?L.value:[L.value];let F=0;for(let K=0;K<I.length;K++){const G=I[K],$=v(G);typeof G=="number"||typeof G=="boolean"?(L.__data[0]=G,n.bufferSubData(n.UNIFORM_BUFFER,P+F,L.__data)):G.isMatrix3?(L.__data[0]=G.elements[0],L.__data[1]=G.elements[1],L.__data[2]=G.elements[2],L.__data[3]=0,L.__data[4]=G.elements[3],L.__data[5]=G.elements[4],L.__data[6]=G.elements[5],L.__data[7]=0,L.__data[8]=G.elements[6],L.__data[9]=G.elements[7],L.__data[10]=G.elements[8],L.__data[11]=0):(G.toArray(L.__data,F),F+=$.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,P,L.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function d(y,x,_,S){const T=y.value,E=x+"_"+_;if(S[E]===void 0)return typeof T=="number"||typeof T=="boolean"?S[E]=T:S[E]=T.clone(),!0;{const A=S[E];if(typeof T=="number"||typeof T=="boolean"){if(A!==T)return S[E]=T,!0}else if(A.equals(T)===!1)return A.copy(T),!0}return!1}function g(y){const x=y.uniforms;let _=0;const S=16;for(let E=0,A=x.length;E<A;E++){const M=Array.isArray(x[E])?x[E]:[x[E]];for(let b=0,L=M.length;b<L;b++){const P=M[b],I=Array.isArray(P.value)?P.value:[P.value];for(let F=0,K=I.length;F<K;F++){const G=I[F],$=v(G),O=_%S,W=O%$.boundary,Y=O+W;_+=W,Y!==0&&S-Y<$.storage&&(_+=S-Y),P.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),P.__offset=_,_+=$.storage}}}const T=_%S;return T>0&&(_+=S-T),y.__size=_,y.__cache={},this}function v(y){const x={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(x.boundary=4,x.storage=4):y.isVector2?(x.boundary=8,x.storage=8):y.isVector3||y.isColor?(x.boundary=16,x.storage=12):y.isVector4?(x.boundary=16,x.storage=16):y.isMatrix3?(x.boundary=48,x.storage=48):y.isMatrix4?(x.boundary=64,x.storage=64):y.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",y),x}function m(y){const x=y.target;x.removeEventListener("dispose",m);const _=a.indexOf(x.__bindingPointIndex);a.splice(_,1),n.deleteBuffer(r[x.id]),delete r[x.id],delete s[x.id]}function p(){for(const y in r)n.deleteBuffer(r[y]);a=[],r={},s={}}return{bind:l,update:c,dispose:p}}class LM{constructor(e={}){const{canvas:t=d0(),context:i=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reverseDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let d;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=i.getContextAttributes().alpha}else d=a;const g=new Uint32Array(4),v=new Int32Array(4);let m=null,p=null;const y=[],x=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=_n,this.toneMapping=Si,this.toneMappingExposure=1;const _=this;let S=!1,T=0,E=0,A=null,M=-1,b=null;const L=new gt,P=new gt;let I=null;const F=new Ke(0);let K=0,G=t.width,$=t.height,O=1,W=null,Y=null;const N=new gt(0,0,G,$),V=new gt(0,0,G,$);let ee=!1;const z=new qp;let j=!1,ne=!1;const J=new ut,re=new ut,me=new te,Se=new gt,xe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let he=!1;function Ie(){return A===null?O:1}let B=i;function Pe(R,Q){return t.getContext(R,Q)}try{const R={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${qc}`),t.addEventListener("webglcontextlost",_e,!1),t.addEventListener("webglcontextrestored",Me,!1),t.addEventListener("webglcontextcreationerror",ye,!1),B===null){const Q="webgl2";if(B=Pe(Q,R),B===null)throw Pe(Q)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw console.error("THREE.WebGLRenderer: "+R.message),R}let be,Ee,se,Ae,de,C,w,U,k,X,Z,ue,le,fe,De,ve,we,Ce,Re,ge,Ve,ke,$e,q;function pe(){be=new VS(B),be.init(),ke=new MM(B,be),Ee=new IS(B,be,e,ke),se=new SM(B,be),Ee.reverseDepthBuffer&&f&&se.buffers.depth.setReversed(!0),Ae=new WS(B),de=new lM,C=new bM(B,be,se,de,Ee,ke,Ae),w=new OS(_),U=new zS(_),k=new $0(B),$e=new US(B,k),X=new GS(B,k,Ae,$e),Z=new XS(B,X,k,Ae),Re=new jS(B,Ee,C),ve=new FS(de),ue=new oM(_,w,U,be,Ee,$e,ve),le=new PM(_,de),fe=new uM,De=new gM(be),Ce=new LS(_,w,U,se,Z,d,l),we=new xM(_,Z,Ee),q=new DM(B,Ae,Ee,se),ge=new NS(B,be,Ae),Ve=new HS(B,be,Ae),Ae.programs=ue.programs,_.capabilities=Ee,_.extensions=be,_.properties=de,_.renderLists=fe,_.shadowMap=we,_.state=se,_.info=Ae}pe();const ie=new CM(_,B);this.xr=ie,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){const R=be.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=be.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return O},this.setPixelRatio=function(R){R!==void 0&&(O=R,this.setSize(G,$,!1))},this.getSize=function(R){return R.set(G,$)},this.setSize=function(R,Q,oe=!0){if(ie.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}G=R,$=Q,t.width=Math.floor(R*O),t.height=Math.floor(Q*O),oe===!0&&(t.style.width=R+"px",t.style.height=Q+"px"),this.setViewport(0,0,R,Q)},this.getDrawingBufferSize=function(R){return R.set(G*O,$*O).floor()},this.setDrawingBufferSize=function(R,Q,oe){G=R,$=Q,O=oe,t.width=Math.floor(R*oe),t.height=Math.floor(Q*oe),this.setViewport(0,0,R,Q)},this.getCurrentViewport=function(R){return R.copy(L)},this.getViewport=function(R){return R.copy(N)},this.setViewport=function(R,Q,oe,ce){R.isVector4?N.set(R.x,R.y,R.z,R.w):N.set(R,Q,oe,ce),se.viewport(L.copy(N).multiplyScalar(O).round())},this.getScissor=function(R){return R.copy(V)},this.setScissor=function(R,Q,oe,ce){R.isVector4?V.set(R.x,R.y,R.z,R.w):V.set(R,Q,oe,ce),se.scissor(P.copy(V).multiplyScalar(O).round())},this.getScissorTest=function(){return ee},this.setScissorTest=function(R){se.setScissorTest(ee=R)},this.setOpaqueSort=function(R){W=R},this.setTransparentSort=function(R){Y=R},this.getClearColor=function(R){return R.copy(Ce.getClearColor())},this.setClearColor=function(){Ce.setClearColor.apply(Ce,arguments)},this.getClearAlpha=function(){return Ce.getClearAlpha()},this.setClearAlpha=function(){Ce.setClearAlpha.apply(Ce,arguments)},this.clear=function(R=!0,Q=!0,oe=!0){let ce=0;if(R){let H=!1;if(A!==null){const Te=A.texture.format;H=Te===tu||Te===eu||Te===Qc}if(H){const Te=A.texture.type,Ue=Te===ni||Te===Xi||Te===Es||Te===Ur||Te===Zc||Te===$c,Ne=Ce.getClearColor(),Oe=Ce.getClearAlpha(),Xe=Ne.r,Ye=Ne.g,Ge=Ne.b;Ue?(g[0]=Xe,g[1]=Ye,g[2]=Ge,g[3]=Oe,B.clearBufferuiv(B.COLOR,0,g)):(v[0]=Xe,v[1]=Ye,v[2]=Ge,v[3]=Oe,B.clearBufferiv(B.COLOR,0,v))}else ce|=B.COLOR_BUFFER_BIT}Q&&(ce|=B.DEPTH_BUFFER_BIT),oe&&(ce|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),B.clear(ce)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",_e,!1),t.removeEventListener("webglcontextrestored",Me,!1),t.removeEventListener("webglcontextcreationerror",ye,!1),Ce.dispose(),fe.dispose(),De.dispose(),de.dispose(),w.dispose(),U.dispose(),Z.dispose(),$e.dispose(),q.dispose(),ue.dispose(),ie.dispose(),ie.removeEventListener("sessionstart",_t),ie.removeEventListener("sessionend",Zt),Ot.stop()};function _e(R){R.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),S=!0}function Me(){console.log("THREE.WebGLRenderer: Context Restored."),S=!1;const R=Ae.autoReset,Q=we.enabled,oe=we.autoUpdate,ce=we.needsUpdate,H=we.type;pe(),Ae.autoReset=R,we.enabled=Q,we.autoUpdate=oe,we.needsUpdate=ce,we.type=H}function ye(R){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function Be(R){const Q=R.target;Q.removeEventListener("dispose",Be),qe(Q)}function qe(R){ze(R),de.remove(R)}function ze(R){const Q=de.get(R).programs;Q!==void 0&&(Q.forEach(function(oe){ue.releaseProgram(oe)}),R.isShaderMaterial&&ue.releaseShaderCache(R))}this.renderBufferDirect=function(R,Q,oe,ce,H,Te){Q===null&&(Q=xe);const Ue=H.isMesh&&H.matrixWorld.determinant()<0,Ne=po(R,Q,oe,ce,H);se.setMaterial(ce,Ue);let Oe=oe.index,Xe=1;if(ce.wireframe===!0){if(Oe=X.getWireframeAttribute(oe),Oe===void 0)return;Xe=2}const Ye=oe.drawRange,Ge=oe.attributes.position;let Qe=Ye.start*Xe,rt=(Ye.start+Ye.count)*Xe;Te!==null&&(Qe=Math.max(Qe,Te.start*Xe),rt=Math.min(rt,(Te.start+Te.count)*Xe)),Oe!==null?(Qe=Math.max(Qe,0),rt=Math.min(rt,Oe.count)):Ge!=null&&(Qe=Math.max(Qe,0),rt=Math.min(rt,Ge.count));const ft=rt-Qe;if(ft<0||ft===1/0)return;$e.setup(H,ce,Ne,oe,Oe);let dt,tt=ge;if(Oe!==null&&(dt=k.get(Oe),tt=Ve,tt.setIndex(dt)),H.isMesh)ce.wireframe===!0?(se.setLineWidth(ce.wireframeLinewidth*Ie()),tt.setMode(B.LINES)):tt.setMode(B.TRIANGLES);else if(H.isLine){let We=ce.linewidth;We===void 0&&(We=1),se.setLineWidth(We*Ie()),H.isLineSegments?tt.setMode(B.LINES):H.isLineLoop?tt.setMode(B.LINE_LOOP):tt.setMode(B.LINE_STRIP)}else H.isPoints?tt.setMode(B.POINTS):H.isSprite&&tt.setMode(B.TRIANGLES);if(H.isBatchedMesh)if(H._multiDrawInstances!==null)tt.renderMultiDrawInstances(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount,H._multiDrawInstances);else if(be.get("WEBGL_multi_draw"))tt.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{const We=H._multiDrawStarts,mt=H._multiDrawCounts,it=H._multiDrawCount,Ct=Oe?k.get(Oe).bytesPerElement:1,Fn=de.get(ce).currentProgram.getUniforms();for(let Pt=0;Pt<it;Pt++)Fn.setValue(B,"_gl_DrawID",Pt),tt.render(We[Pt]/Ct,mt[Pt])}else if(H.isInstancedMesh)tt.renderInstances(Qe,ft,H.count);else if(oe.isInstancedBufferGeometry){const We=oe._maxInstanceCount!==void 0?oe._maxInstanceCount:1/0,mt=Math.min(oe.instanceCount,We);tt.renderInstances(Qe,ft,mt)}else tt.render(Qe,ft)};function He(R,Q,oe){R.transparent===!0&&R.side===kn&&R.forceSinglePass===!1?(R.side=qt,R.needsUpdate=!0,pn(R,Q,oe),R.side=Mi,R.needsUpdate=!0,pn(R,Q,oe),R.side=kn):pn(R,Q,oe)}this.compile=function(R,Q,oe=null){oe===null&&(oe=R),p=De.get(oe),p.init(Q),x.push(p),oe.traverseVisible(function(H){H.isLight&&H.layers.test(Q.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),R!==oe&&R.traverseVisible(function(H){H.isLight&&H.layers.test(Q.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),p.setupLights();const ce=new Set;return R.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;const Te=H.material;if(Te)if(Array.isArray(Te))for(let Ue=0;Ue<Te.length;Ue++){const Ne=Te[Ue];He(Ne,oe,H),ce.add(Ne)}else He(Te,oe,H),ce.add(Te)}),x.pop(),p=null,ce},this.compileAsync=function(R,Q,oe=null){const ce=this.compile(R,Q,oe);return new Promise(H=>{function Te(){if(ce.forEach(function(Ue){de.get(Ue).currentProgram.isReady()&&ce.delete(Ue)}),ce.size===0){H(R);return}setTimeout(Te,10)}be.get("KHR_parallel_shader_compile")!==null?Te():setTimeout(Te,10)})};let lt=null;function ht(R){lt&&lt(R)}function _t(){Ot.stop()}function Zt(){Ot.start()}const Ot=new em;Ot.setAnimationLoop(ht),typeof self<"u"&&Ot.setContext(self),this.setAnimationLoop=function(R){lt=R,ie.setAnimationLoop(R),R===null?Ot.stop():Ot.start()},ie.addEventListener("sessionstart",_t),ie.addEventListener("sessionend",Zt),this.render=function(R,Q){if(Q!==void 0&&Q.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(S===!0)return;if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),Q.parent===null&&Q.matrixWorldAutoUpdate===!0&&Q.updateMatrixWorld(),ie.enabled===!0&&ie.isPresenting===!0&&(ie.cameraAutoUpdate===!0&&ie.updateCamera(Q),Q=ie.getCamera()),R.isScene===!0&&R.onBeforeRender(_,R,Q,A),p=De.get(R,x.length),p.init(Q),x.push(p),re.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),z.setFromProjectionMatrix(re),ne=this.localClippingEnabled,j=ve.init(this.clippingPlanes,ne),m=fe.get(R,y.length),m.init(),y.push(m),ie.enabled===!0&&ie.isPresenting===!0){const Te=_.xr.getDepthSensingMesh();Te!==null&&ln(Te,Q,-1/0,_.sortObjects)}ln(R,Q,0,_.sortObjects),m.finish(),_.sortObjects===!0&&m.sort(W,Y),he=ie.enabled===!1||ie.isPresenting===!1||ie.hasDepthSensing()===!1,he&&Ce.addToRenderList(m,R),this.info.render.frame++,j===!0&&ve.beginShadows();const oe=p.state.shadowsArray;we.render(oe,R,Q),j===!0&&ve.endShadows(),this.info.autoReset===!0&&this.info.reset();const ce=m.opaque,H=m.transmissive;if(p.setupLights(),Q.isArrayCamera){const Te=Q.cameras;if(H.length>0)for(let Ue=0,Ne=Te.length;Ue<Ne;Ue++){const Oe=Te[Ue];In(ce,H,R,Oe)}he&&Ce.render(R);for(let Ue=0,Ne=Te.length;Ue<Ne;Ue++){const Oe=Te[Ue];Tn(m,R,Oe,Oe.viewport)}}else H.length>0&&In(ce,H,R,Q),he&&Ce.render(R),Tn(m,R,Q);A!==null&&(C.updateMultisampleRenderTarget(A),C.updateRenderTargetMipmap(A)),R.isScene===!0&&R.onAfterRender(_,R,Q),$e.resetDefaultState(),M=-1,b=null,x.pop(),x.length>0?(p=x[x.length-1],j===!0&&ve.setGlobalState(_.clippingPlanes,p.state.camera)):p=null,y.pop(),y.length>0?m=y[y.length-1]:m=null};function ln(R,Q,oe,ce){if(R.visible===!1)return;if(R.layers.test(Q.layers)){if(R.isGroup)oe=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(Q);else if(R.isLight)p.pushLight(R),R.castShadow&&p.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||z.intersectsSprite(R)){ce&&Se.setFromMatrixPosition(R.matrixWorld).applyMatrix4(re);const Ue=Z.update(R),Ne=R.material;Ne.visible&&m.push(R,Ue,Ne,oe,Se.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||z.intersectsObject(R))){const Ue=Z.update(R),Ne=R.material;if(ce&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),Se.copy(R.boundingSphere.center)):(Ue.boundingSphere===null&&Ue.computeBoundingSphere(),Se.copy(Ue.boundingSphere.center)),Se.applyMatrix4(R.matrixWorld).applyMatrix4(re)),Array.isArray(Ne)){const Oe=Ue.groups;for(let Xe=0,Ye=Oe.length;Xe<Ye;Xe++){const Ge=Oe[Xe],Qe=Ne[Ge.materialIndex];Qe&&Qe.visible&&m.push(R,Ue,Qe,oe,Se.z,Ge)}}else Ne.visible&&m.push(R,Ue,Ne,oe,Se.z,null)}}const Te=R.children;for(let Ue=0,Ne=Te.length;Ue<Ne;Ue++)ln(Te[Ue],Q,oe,ce)}function Tn(R,Q,oe,ce){const H=R.opaque,Te=R.transmissive,Ue=R.transparent;p.setupLightsView(oe),j===!0&&ve.setGlobalState(_.clippingPlanes,oe),ce&&se.viewport(L.copy(ce)),H.length>0&&$t(H,Q,oe),Te.length>0&&$t(Te,Q,oe),Ue.length>0&&$t(Ue,Q,oe),se.buffers.depth.setTest(!0),se.buffers.depth.setMask(!0),se.buffers.color.setMask(!0),se.setPolygonOffset(!1)}function In(R,Q,oe,ce){if((oe.isScene===!0?oe.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[ce.id]===void 0&&(p.state.transmissionRenderTarget[ce.id]=new Nn(1,1,{generateMipmaps:!0,type:be.has("EXT_color_buffer_half_float")||be.has("EXT_color_buffer_float")?Jn:ni,minFilter:Vi,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:st.workingColorSpace}));const Te=p.state.transmissionRenderTarget[ce.id],Ue=ce.viewport||L;Te.setSize(Ue.z,Ue.w);const Ne=_.getRenderTarget();_.setRenderTarget(Te),_.getClearColor(F),K=_.getClearAlpha(),K<1&&_.setClearColor(16777215,.5),_.clear(),he&&Ce.render(oe);const Oe=_.toneMapping;_.toneMapping=Si;const Xe=ce.viewport;if(ce.viewport!==void 0&&(ce.viewport=void 0),p.setupLightsView(ce),j===!0&&ve.setGlobalState(_.clippingPlanes,ce),$t(R,oe,ce),C.updateMultisampleRenderTarget(Te),C.updateRenderTargetMipmap(Te),be.has("WEBGL_multisampled_render_to_texture")===!1){let Ye=!1;for(let Ge=0,Qe=Q.length;Ge<Qe;Ge++){const rt=Q[Ge],ft=rt.object,dt=rt.geometry,tt=rt.material,We=rt.group;if(tt.side===kn&&ft.layers.test(ce.layers)){const mt=tt.side;tt.side=qt,tt.needsUpdate=!0,At(ft,oe,ce,dt,tt,We),tt.side=mt,tt.needsUpdate=!0,Ye=!0}}Ye===!0&&(C.updateMultisampleRenderTarget(Te),C.updateRenderTargetMipmap(Te))}_.setRenderTarget(Ne),_.setClearColor(F,K),Xe!==void 0&&(ce.viewport=Xe),_.toneMapping=Oe}function $t(R,Q,oe){const ce=Q.isScene===!0?Q.overrideMaterial:null;for(let H=0,Te=R.length;H<Te;H++){const Ue=R[H],Ne=Ue.object,Oe=Ue.geometry,Xe=ce===null?Ue.material:ce,Ye=Ue.group;Ne.layers.test(oe.layers)&&At(Ne,Q,oe,Oe,Xe,Ye)}}function At(R,Q,oe,ce,H,Te){R.onBeforeRender(_,Q,oe,ce,H,Te),R.modelViewMatrix.multiplyMatrices(oe.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),H.onBeforeRender(_,Q,oe,ce,R,Te),H.transparent===!0&&H.side===kn&&H.forceSinglePass===!1?(H.side=qt,H.needsUpdate=!0,_.renderBufferDirect(oe,Q,ce,H,R,Te),H.side=Mi,H.needsUpdate=!0,_.renderBufferDirect(oe,Q,ce,H,R,Te),H.side=kn):_.renderBufferDirect(oe,Q,ce,H,R,Te),R.onAfterRender(_,Q,oe,ce,H,Te)}function pn(R,Q,oe){Q.isScene!==!0&&(Q=xe);const ce=de.get(R),H=p.state.lights,Te=p.state.shadowsArray,Ue=H.state.version,Ne=ue.getParameters(R,H.state,Te,Q,oe),Oe=ue.getProgramCacheKey(Ne);let Xe=ce.programs;ce.environment=R.isMeshStandardMaterial?Q.environment:null,ce.fog=Q.fog,ce.envMap=(R.isMeshStandardMaterial?U:w).get(R.envMap||ce.environment),ce.envMapRotation=ce.environment!==null&&R.envMap===null?Q.environmentRotation:R.envMapRotation,Xe===void 0&&(R.addEventListener("dispose",Be),Xe=new Map,ce.programs=Xe);let Ye=Xe.get(Oe);if(Ye!==void 0){if(ce.currentProgram===Ye&&ce.lightsStateVersion===Ue)return Ji(R,Ne),Ye}else Ne.uniforms=ue.getUniforms(R),R.onBeforeCompile(Ne,_),Ye=ue.acquireProgram(Ne,Oe),Xe.set(Oe,Ye),ce.uniforms=Ne.uniforms;const Ge=ce.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Ge.clippingPlanes=ve.uniform),Ji(R,Ne),ce.needsLights=Qi(R),ce.lightsStateVersion=Ue,ce.needsLights&&(Ge.ambientLightColor.value=H.state.ambient,Ge.lightProbe.value=H.state.probe,Ge.directionalLights.value=H.state.directional,Ge.directionalLightShadows.value=H.state.directionalShadow,Ge.spotLights.value=H.state.spot,Ge.spotLightShadows.value=H.state.spotShadow,Ge.rectAreaLights.value=H.state.rectArea,Ge.ltc_1.value=H.state.rectAreaLTC1,Ge.ltc_2.value=H.state.rectAreaLTC2,Ge.pointLights.value=H.state.point,Ge.pointLightShadows.value=H.state.pointShadow,Ge.hemisphereLights.value=H.state.hemi,Ge.directionalShadowMap.value=H.state.directionalShadowMap,Ge.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Ge.spotShadowMap.value=H.state.spotShadowMap,Ge.spotLightMatrix.value=H.state.spotLightMatrix,Ge.spotLightMap.value=H.state.spotLightMap,Ge.pointShadowMap.value=H.state.pointShadowMap,Ge.pointShadowMatrix.value=H.state.pointShadowMatrix),ce.currentProgram=Ye,ce.uniformsList=null,Ye}function jr(R){if(R.uniformsList===null){const Q=R.currentProgram.getUniforms();R.uniformsList=Da.seqWithValue(Q.seq,R.uniforms)}return R.uniformsList}function Ji(R,Q){const oe=de.get(R);oe.outputColorSpace=Q.outputColorSpace,oe.batching=Q.batching,oe.batchingColor=Q.batchingColor,oe.instancing=Q.instancing,oe.instancingColor=Q.instancingColor,oe.instancingMorph=Q.instancingMorph,oe.skinning=Q.skinning,oe.morphTargets=Q.morphTargets,oe.morphNormals=Q.morphNormals,oe.morphColors=Q.morphColors,oe.morphTargetsCount=Q.morphTargetsCount,oe.numClippingPlanes=Q.numClippingPlanes,oe.numIntersection=Q.numClipIntersection,oe.vertexAlphas=Q.vertexAlphas,oe.vertexTangents=Q.vertexTangents,oe.toneMapping=Q.toneMapping}function po(R,Q,oe,ce,H){Q.isScene!==!0&&(Q=xe),C.resetTextureUnits();const Te=Q.fog,Ue=ce.isMeshStandardMaterial?Q.environment:null,Ne=A===null?_.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:Ir,Oe=(ce.isMeshStandardMaterial?U:w).get(ce.envMap||Ue),Xe=ce.vertexColors===!0&&!!oe.attributes.color&&oe.attributes.color.itemSize===4,Ye=!!oe.attributes.tangent&&(!!ce.normalMap||ce.anisotropy>0),Ge=!!oe.morphAttributes.position,Qe=!!oe.morphAttributes.normal,rt=!!oe.morphAttributes.color;let ft=Si;ce.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(ft=_.toneMapping);const dt=oe.morphAttributes.position||oe.morphAttributes.normal||oe.morphAttributes.color,tt=dt!==void 0?dt.length:0,We=de.get(ce),mt=p.state.lights;if(j===!0&&(ne===!0||R!==b)){const yt=R===b&&ce.id===M;ve.setState(ce,R,yt)}let it=!1;ce.version===We.__version?(We.needsLights&&We.lightsStateVersion!==mt.state.version||We.outputColorSpace!==Ne||H.isBatchedMesh&&We.batching===!1||!H.isBatchedMesh&&We.batching===!0||H.isBatchedMesh&&We.batchingColor===!0&&H.colorTexture===null||H.isBatchedMesh&&We.batchingColor===!1&&H.colorTexture!==null||H.isInstancedMesh&&We.instancing===!1||!H.isInstancedMesh&&We.instancing===!0||H.isSkinnedMesh&&We.skinning===!1||!H.isSkinnedMesh&&We.skinning===!0||H.isInstancedMesh&&We.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&We.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&We.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&We.instancingMorph===!1&&H.morphTexture!==null||We.envMap!==Oe||ce.fog===!0&&We.fog!==Te||We.numClippingPlanes!==void 0&&(We.numClippingPlanes!==ve.numPlanes||We.numIntersection!==ve.numIntersection)||We.vertexAlphas!==Xe||We.vertexTangents!==Ye||We.morphTargets!==Ge||We.morphNormals!==Qe||We.morphColors!==rt||We.toneMapping!==ft||We.morphTargetsCount!==tt)&&(it=!0):(it=!0,We.__version=ce.version);let Ct=We.currentProgram;it===!0&&(Ct=pn(ce,Q,H));let Fn=!1,Pt=!1,Gn=!1;const nt=Ct.getUniforms(),Jt=We.uniforms;if(se.useProgram(Ct.program)&&(Fn=!0,Pt=!0,Gn=!0),ce.id!==M&&(M=ce.id,Pt=!0),Fn||b!==R){se.buffers.depth.getReversed()?(J.copy(R.projectionMatrix),m0(J),g0(J),nt.setValue(B,"projectionMatrix",J)):nt.setValue(B,"projectionMatrix",R.projectionMatrix),nt.setValue(B,"viewMatrix",R.matrixWorldInverse);const Lt=nt.map.cameraPosition;Lt!==void 0&&Lt.setValue(B,me.setFromMatrixPosition(R.matrixWorld)),Ee.logarithmicDepthBuffer&&nt.setValue(B,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(ce.isMeshPhongMaterial||ce.isMeshToonMaterial||ce.isMeshLambertMaterial||ce.isMeshBasicMaterial||ce.isMeshStandardMaterial||ce.isShaderMaterial)&&nt.setValue(B,"isOrthographic",R.isOrthographicCamera===!0),b!==R&&(b=R,Pt=!0,Gn=!0)}if(H.isSkinnedMesh){nt.setOptional(B,H,"bindMatrix"),nt.setOptional(B,H,"bindMatrixInverse");const yt=H.skeleton;yt&&(yt.boneTexture===null&&yt.computeBoneTexture(),nt.setValue(B,"boneTexture",yt.boneTexture,C))}H.isBatchedMesh&&(nt.setOptional(B,H,"batchingTexture"),nt.setValue(B,"batchingTexture",H._matricesTexture,C),nt.setOptional(B,H,"batchingIdTexture"),nt.setValue(B,"batchingIdTexture",H._indirectTexture,C),nt.setOptional(B,H,"batchingColorTexture"),H._colorsTexture!==null&&nt.setValue(B,"batchingColorTexture",H._colorsTexture,C));const Dt=oe.morphAttributes;if((Dt.position!==void 0||Dt.normal!==void 0||Dt.color!==void 0)&&Re.update(H,oe,Ct),(Pt||We.receiveShadow!==H.receiveShadow)&&(We.receiveShadow=H.receiveShadow,nt.setValue(B,"receiveShadow",H.receiveShadow)),ce.isMeshGouraudMaterial&&ce.envMap!==null&&(Jt.envMap.value=Oe,Jt.flipEnvMap.value=Oe.isCubeTexture&&Oe.isRenderTargetTexture===!1?-1:1),ce.isMeshStandardMaterial&&ce.envMap===null&&Q.environment!==null&&(Jt.envMapIntensity.value=Q.environmentIntensity),Pt&&(nt.setValue(B,"toneMappingExposure",_.toneMappingExposure),We.needsLights&&Gs(Jt,Gn),Te&&ce.fog===!0&&le.refreshFogUniforms(Jt,Te),le.refreshMaterialUniforms(Jt,ce,O,$,p.state.transmissionRenderTarget[R.id]),Da.upload(B,jr(We),Jt,C)),ce.isShaderMaterial&&ce.uniformsNeedUpdate===!0&&(Da.upload(B,jr(We),Jt,C),ce.uniformsNeedUpdate=!1),ce.isSpriteMaterial&&nt.setValue(B,"center",H.center),nt.setValue(B,"modelViewMatrix",H.modelViewMatrix),nt.setValue(B,"normalMatrix",H.normalMatrix),nt.setValue(B,"modelMatrix",H.matrixWorld),ce.isShaderMaterial||ce.isRawShaderMaterial){const yt=ce.uniformsGroups;for(let Lt=0,oi=yt.length;Lt<oi;Lt++){const mn=yt[Lt];q.update(mn,Ct),q.bind(mn,Ct)}}return Ct}function Gs(R,Q){R.ambientLightColor.needsUpdate=Q,R.lightProbe.needsUpdate=Q,R.directionalLights.needsUpdate=Q,R.directionalLightShadows.needsUpdate=Q,R.pointLights.needsUpdate=Q,R.pointLightShadows.needsUpdate=Q,R.spotLights.needsUpdate=Q,R.spotLightShadows.needsUpdate=Q,R.rectAreaLights.needsUpdate=Q,R.hemisphereLights.needsUpdate=Q}function Qi(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return T},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(R,Q,oe){de.get(R.texture).__webglTexture=Q,de.get(R.depthTexture).__webglTexture=oe;const ce=de.get(R);ce.__hasExternalTextures=!0,ce.__autoAllocateDepthBuffer=oe===void 0,ce.__autoAllocateDepthBuffer||be.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),ce.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(R,Q){const oe=de.get(R);oe.__webglFramebuffer=Q,oe.__useDefaultFramebuffer=Q===void 0},this.setRenderTarget=function(R,Q=0,oe=0){A=R,T=Q,E=oe;let ce=!0,H=null,Te=!1,Ue=!1;if(R){const Oe=de.get(R);if(Oe.__useDefaultFramebuffer!==void 0)se.bindFramebuffer(B.FRAMEBUFFER,null),ce=!1;else if(Oe.__webglFramebuffer===void 0)C.setupRenderTarget(R);else if(Oe.__hasExternalTextures)C.rebindTextures(R,de.get(R.texture).__webglTexture,de.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){const Ge=R.depthTexture;if(Oe.__boundDepthTexture!==Ge){if(Ge!==null&&de.has(Ge)&&(R.width!==Ge.image.width||R.height!==Ge.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");C.setupDepthRenderbuffer(R)}}const Xe=R.texture;(Xe.isData3DTexture||Xe.isDataArrayTexture||Xe.isCompressedArrayTexture)&&(Ue=!0);const Ye=de.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(Ye[Q])?H=Ye[Q][oe]:H=Ye[Q],Te=!0):R.samples>0&&C.useMultisampledRTT(R)===!1?H=de.get(R).__webglMultisampledFramebuffer:Array.isArray(Ye)?H=Ye[oe]:H=Ye,L.copy(R.viewport),P.copy(R.scissor),I=R.scissorTest}else L.copy(N).multiplyScalar(O).floor(),P.copy(V).multiplyScalar(O).floor(),I=ee;if(se.bindFramebuffer(B.FRAMEBUFFER,H)&&ce&&se.drawBuffers(R,H),se.viewport(L),se.scissor(P),se.setScissorTest(I),Te){const Oe=de.get(R.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Oe.__webglTexture,oe)}else if(Ue){const Oe=de.get(R.texture),Xe=Q||0;B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,Oe.__webglTexture,oe||0,Xe)}M=-1},this.readRenderTargetPixels=function(R,Q,oe,ce,H,Te,Ue){if(!(R&&R.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ne=de.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Ue!==void 0&&(Ne=Ne[Ue]),Ne){se.bindFramebuffer(B.FRAMEBUFFER,Ne);try{const Oe=R.texture,Xe=Oe.format,Ye=Oe.type;if(!Ee.textureFormatReadable(Xe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ee.textureTypeReadable(Ye)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Q>=0&&Q<=R.width-ce&&oe>=0&&oe<=R.height-H&&B.readPixels(Q,oe,ce,H,ke.convert(Xe),ke.convert(Ye),Te)}finally{const Oe=A!==null?de.get(A).__webglFramebuffer:null;se.bindFramebuffer(B.FRAMEBUFFER,Oe)}}},this.readRenderTargetPixelsAsync=async function(R,Q,oe,ce,H,Te,Ue){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ne=de.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Ue!==void 0&&(Ne=Ne[Ue]),Ne){const Oe=R.texture,Xe=Oe.format,Ye=Oe.type;if(!Ee.textureFormatReadable(Xe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ee.textureTypeReadable(Ye))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(Q>=0&&Q<=R.width-ce&&oe>=0&&oe<=R.height-H){se.bindFramebuffer(B.FRAMEBUFFER,Ne);const Ge=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,Ge),B.bufferData(B.PIXEL_PACK_BUFFER,Te.byteLength,B.STREAM_READ),B.readPixels(Q,oe,ce,H,ke.convert(Xe),ke.convert(Ye),0);const Qe=A!==null?de.get(A).__webglFramebuffer:null;se.bindFramebuffer(B.FRAMEBUFFER,Qe);const rt=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await p0(B,rt,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,Ge),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,Te),B.deleteBuffer(Ge),B.deleteSync(rt),Te}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(R,Q=null,oe=0){R.isTexture!==!0&&(_r("WebGLRenderer: copyFramebufferToTexture function signature has changed."),Q=arguments[0]||null,R=arguments[1]);const ce=Math.pow(2,-oe),H=Math.floor(R.image.width*ce),Te=Math.floor(R.image.height*ce),Ue=Q!==null?Q.x:0,Ne=Q!==null?Q.y:0;C.setTexture2D(R,0),B.copyTexSubImage2D(B.TEXTURE_2D,oe,0,0,Ue,Ne,H,Te),se.unbindTexture()};const Xr=B.createFramebuffer(),mo=B.createFramebuffer();this.copyTextureToTexture=function(R,Q,oe=null,ce=null,H=0,Te=null){R.isTexture!==!0&&(_r("WebGLRenderer: copyTextureToTexture function signature has changed."),ce=arguments[0]||null,R=arguments[1],Q=arguments[2],Te=arguments[3]||0,oe=null),Te===null&&(H!==0?(_r("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),Te=H,H=0):Te=0);let Ue,Ne,Oe,Xe,Ye,Ge,Qe,rt,ft;const dt=R.isCompressedTexture?R.mipmaps[Te]:R.image;if(oe!==null)Ue=oe.max.x-oe.min.x,Ne=oe.max.y-oe.min.y,Oe=oe.isBox3?oe.max.z-oe.min.z:1,Xe=oe.min.x,Ye=oe.min.y,Ge=oe.isBox3?oe.min.z:0;else{const Dt=Math.pow(2,-H);Ue=Math.floor(dt.width*Dt),Ne=Math.floor(dt.height*Dt),R.isDataArrayTexture?Oe=dt.depth:R.isData3DTexture?Oe=Math.floor(dt.depth*Dt):Oe=1,Xe=0,Ye=0,Ge=0}ce!==null?(Qe=ce.x,rt=ce.y,ft=ce.z):(Qe=0,rt=0,ft=0);const tt=ke.convert(Q.format),We=ke.convert(Q.type);let mt;Q.isData3DTexture?(C.setTexture3D(Q,0),mt=B.TEXTURE_3D):Q.isDataArrayTexture||Q.isCompressedArrayTexture?(C.setTexture2DArray(Q,0),mt=B.TEXTURE_2D_ARRAY):(C.setTexture2D(Q,0),mt=B.TEXTURE_2D),B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,Q.flipY),B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Q.premultiplyAlpha),B.pixelStorei(B.UNPACK_ALIGNMENT,Q.unpackAlignment);const it=B.getParameter(B.UNPACK_ROW_LENGTH),Ct=B.getParameter(B.UNPACK_IMAGE_HEIGHT),Fn=B.getParameter(B.UNPACK_SKIP_PIXELS),Pt=B.getParameter(B.UNPACK_SKIP_ROWS),Gn=B.getParameter(B.UNPACK_SKIP_IMAGES);B.pixelStorei(B.UNPACK_ROW_LENGTH,dt.width),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,dt.height),B.pixelStorei(B.UNPACK_SKIP_PIXELS,Xe),B.pixelStorei(B.UNPACK_SKIP_ROWS,Ye),B.pixelStorei(B.UNPACK_SKIP_IMAGES,Ge);const nt=R.isDataArrayTexture||R.isData3DTexture,Jt=Q.isDataArrayTexture||Q.isData3DTexture;if(R.isDepthTexture){const Dt=de.get(R),yt=de.get(Q),Lt=de.get(Dt.__renderTarget),oi=de.get(yt.__renderTarget);se.bindFramebuffer(B.READ_FRAMEBUFFER,Lt.__webglFramebuffer),se.bindFramebuffer(B.DRAW_FRAMEBUFFER,oi.__webglFramebuffer);for(let mn=0;mn<Oe;mn++)nt&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,de.get(R).__webglTexture,H,Ge+mn),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,de.get(Q).__webglTexture,Te,ft+mn)),B.blitFramebuffer(Xe,Ye,Ue,Ne,Qe,rt,Ue,Ne,B.DEPTH_BUFFER_BIT,B.NEAREST);se.bindFramebuffer(B.READ_FRAMEBUFFER,null),se.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(H!==0||R.isRenderTargetTexture||de.has(R)){const Dt=de.get(R),yt=de.get(Q);se.bindFramebuffer(B.READ_FRAMEBUFFER,Xr),se.bindFramebuffer(B.DRAW_FRAMEBUFFER,mo);for(let Lt=0;Lt<Oe;Lt++)nt?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Dt.__webglTexture,H,Ge+Lt):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Dt.__webglTexture,H),Jt?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,yt.__webglTexture,Te,ft+Lt):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,yt.__webglTexture,Te),H!==0?B.blitFramebuffer(Xe,Ye,Ue,Ne,Qe,rt,Ue,Ne,B.COLOR_BUFFER_BIT,B.NEAREST):Jt?B.copyTexSubImage3D(mt,Te,Qe,rt,ft+Lt,Xe,Ye,Ue,Ne):B.copyTexSubImage2D(mt,Te,Qe,rt,Xe,Ye,Ue,Ne);se.bindFramebuffer(B.READ_FRAMEBUFFER,null),se.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else Jt?R.isDataTexture||R.isData3DTexture?B.texSubImage3D(mt,Te,Qe,rt,ft,Ue,Ne,Oe,tt,We,dt.data):Q.isCompressedArrayTexture?B.compressedTexSubImage3D(mt,Te,Qe,rt,ft,Ue,Ne,Oe,tt,dt.data):B.texSubImage3D(mt,Te,Qe,rt,ft,Ue,Ne,Oe,tt,We,dt):R.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,Te,Qe,rt,Ue,Ne,tt,We,dt.data):R.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,Te,Qe,rt,dt.width,dt.height,tt,dt.data):B.texSubImage2D(B.TEXTURE_2D,Te,Qe,rt,Ue,Ne,tt,We,dt);B.pixelStorei(B.UNPACK_ROW_LENGTH,it),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,Ct),B.pixelStorei(B.UNPACK_SKIP_PIXELS,Fn),B.pixelStorei(B.UNPACK_SKIP_ROWS,Pt),B.pixelStorei(B.UNPACK_SKIP_IMAGES,Gn),Te===0&&Q.generateMipmaps&&B.generateMipmap(mt),se.unbindTexture()},this.copyTextureToTexture3D=function(R,Q,oe=null,ce=null,H=0){return R.isTexture!==!0&&(_r("WebGLRenderer: copyTextureToTexture3D function signature has changed."),oe=arguments[0]||null,ce=arguments[1]||null,R=arguments[2],Q=arguments[3],H=arguments[4]||0),_r('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(R,Q,oe,ce,H)},this.initRenderTarget=function(R){de.get(R).__webglFramebuffer===void 0&&C.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?C.setTextureCube(R,0):R.isData3DTexture?C.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?C.setTexture2DArray(R,0):C.setTexture2D(R,0),se.unbindTexture()},this.resetState=function(){T=0,E=0,A=null,se.reset(),$e.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorspace=st._getDrawingBufferColorSpace(e),t.unpackColorSpace=st._getUnpackColorSpace()}}const hf={type:"change"},su={type:"start"},sm={type:"end"},_a=new ro,ff=new vi,UM=Math.cos(70*f0.DEG2RAD),Mt=new te,nn=2*Math.PI,ot={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},nl=1e-6;class NM extends K0{constructor(e,t=null){super(e,t),this.state=ot.NONE,this.enabled=!0,this.target=new te,this.cursor=new te,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:xn.ROTATE,MIDDLE:xn.DOLLY,RIGHT:xn.PAN},this.touches={ONE:xi.ROTATE,TWO:xi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new te,this._lastQuaternion=new Yi,this._lastTargetPosition=new te,this._quat=new Yi().setFromUnitVectors(e.up,new te(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new kh,this._sphericalDelta=new kh,this._scale=1,this._panOffset=new te,this._rotateStart=new je,this._rotateEnd=new je,this._rotateDelta=new je,this._panStart=new je,this._panEnd=new je,this._panDelta=new je,this._dollyStart=new je,this._dollyEnd=new je,this._dollyDelta=new je,this._dollyDirection=new te,this._mouse=new je,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=FM.bind(this),this._onPointerDown=IM.bind(this),this._onPointerUp=OM.bind(this),this._onContextMenu=WM.bind(this),this._onMouseWheel=zM.bind(this),this._onKeyDown=VM.bind(this),this._onTouchStart=GM.bind(this),this._onTouchMove=HM.bind(this),this._onMouseDown=kM.bind(this),this._onMouseMove=BM.bind(this),this._interceptControlDown=jM.bind(this),this._interceptControlUp=XM.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(hf),this.update(),this.state=ot.NONE}update(e=null){const t=this.object.position;Mt.copy(t).sub(this.target),Mt.applyQuaternion(this._quat),this._spherical.setFromVector3(Mt),this.autoRotate&&this.state===ot.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(i)&&isFinite(r)&&(i<-Math.PI?i+=nn:i>Math.PI&&(i-=nn),r<-Math.PI?r+=nn:r>Math.PI&&(r-=nn),i<=r?this._spherical.theta=Math.max(i,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+r)/2?Math.max(i,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=a!=this._spherical.radius}if(Mt.setFromSpherical(this._spherical),Mt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Mt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){const o=Mt.length();a=this._clampDistance(o*this._scale);const l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),s=!!l}else if(this.object.isOrthographicCamera){const o=new te(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=l!==this.object.zoom;const c=new te(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=Mt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(_a.origin.copy(this.object.position),_a.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(_a.direction))<UM?this.object.lookAt(this.target):(ff.setFromNormalAndCoplanarPoint(this.object.up,this.target),_a.intersectPlane(ff,this.target))))}else if(this.object.isOrthographicCamera){const a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>nl||8*(1-this._lastQuaternion.dot(this.object.quaternion))>nl||this._lastTargetPosition.distanceToSquared(this.target)>nl?(this.dispatchEvent(hf),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?nn/60*this.autoRotateSpeed*e:nn/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Mt.setFromMatrixColumn(t,0),Mt.multiplyScalar(-e),this._panOffset.add(Mt)}_panUp(e,t){this.screenSpacePanning===!0?Mt.setFromMatrixColumn(t,1):(Mt.setFromMatrixColumn(t,0),Mt.crossVectors(this.object.up,Mt)),Mt.multiplyScalar(e),this._panOffset.add(Mt)}_pan(e,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const r=this.object.position;Mt.copy(r).sub(this.target);let s=Mt.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*s/i.clientHeight,this.object.matrix),this._panUp(2*t*s/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),r=e-i.left,s=t-i.top,a=i.width,o=i.height;this._mouse.x=r/a*2-1,this._mouse.y=-(s/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(nn*this._rotateDelta.x/t.clientHeight),this._rotateUp(nn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(nn*this.rotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-nn*this.rotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(nn*this.rotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-nn*this.rotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(i,r)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,s=Math.sqrt(i*i+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const i=this._getSecondPointerPosition(e),r=.5*(e.pageX+i.x),s=.5*(e.pageY+i.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(nn*this._rotateDelta.x/t.clientHeight),this._rotateUp(nn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,s=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new je,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function IM(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n)))}function FM(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function OM(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(sm),this.state=ot.NONE;break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function kM(n){let e;switch(n.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case xn.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=ot.DOLLY;break;case xn.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ot.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ot.ROTATE}break;case xn.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ot.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ot.PAN}break;default:this.state=ot.NONE}this.state!==ot.NONE&&this.dispatchEvent(su)}function BM(n){switch(this.state){case ot.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case ot.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case ot.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function zM(n){this.enabled===!1||this.enableZoom===!1||this.state!==ot.NONE||(n.preventDefault(),this.dispatchEvent(su),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(sm))}function VM(n){this.enabled!==!1&&this._handleKeyDown(n)}function GM(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case xi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=ot.TOUCH_ROTATE;break;case xi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=ot.TOUCH_PAN;break;default:this.state=ot.NONE}break;case 2:switch(this.touches.TWO){case xi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=ot.TOUCH_DOLLY_PAN;break;case xi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=ot.TOUCH_DOLLY_ROTATE;break;default:this.state=ot.NONE}break;default:this.state=ot.NONE}this.state!==ot.NONE&&this.dispatchEvent(su)}function HM(n){switch(this._trackPointer(n),this.state){case ot.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case ot.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case ot.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case ot.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=ot.NONE}}function WM(n){this.enabled!==!1&&n.preventDefault()}function jM(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function XM(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}let ls=null;function YM(){if(ls!==null)return ls;if(typeof document>"u")return!1;try{const n=document.createElement("canvas");ls=!!(n.getContext("webgl2")||n.getContext("webgl"))}catch{ls=!1}return ls}function qM(n){let e;try{e=new LM({canvas:n,antialias:!0,alpha:!0})}catch{return null}e.setPixelRatio(Math.min(window.devicePixelRatio||1,2));const t=new k0,i=new yn(60,1,.1,8e3);return i.position.set(0,0,1200),{renderer:e,scene:t,camera:i,dispose(){e.dispose()}}}function bi(n,e){let t=e;if(typeof window<"u"&&typeof getComputedStyle=="function"){const i=getComputedStyle(document.documentElement).getPropertyValue(n).trim();i&&(t=i)}return KM(t,e)}function KM(n,e){const t=n.match(/rgba?\(([^)]+)\)/i);if(t&&t[1]){const i=t[1].split(",").map(l=>Number.parseFloat(l.trim())),r=i[0]??0,s=i[1]??0,a=i[2]??0,o=i[3];return{color:new Ke(r/255,s/255,a/255),alpha:typeof o=="number"&&Number.isFinite(o)?o:1}}try{return{color:new Ke(n),alpha:1}}catch{return{color:new Ke(e),alpha:1}}}function ZM(n,e,t){var i,r=1;n==null&&(n=0),e==null&&(e=0),t==null&&(t=0);function s(){var a,o=i.length,l,c=0,u=0,h=0;for(a=0;a<o;++a)l=i[a],c+=l.x||0,u+=l.y||0,h+=l.z||0;for(c=(c/o-n)*r,u=(u/o-e)*r,h=(h/o-t)*r,a=0;a<o;++a)l=i[a],c&&(l.x-=c),u&&(l.y-=u),h&&(l.z-=h)}return s.initialize=function(a){i=a},s.x=function(a){return arguments.length?(n=+a,s):n},s.y=function(a){return arguments.length?(e=+a,s):e},s.z=function(a){return arguments.length?(t=+a,s):t},s.strength=function(a){return arguments.length?(r=+a,s):r},s}function $M(n){const e=+this._x.call(null,n);return am(this.cover(e),e,n)}function am(n,e,t){if(isNaN(e))return n;var i,r=n._root,s={data:t},a=n._x0,o=n._x1,l,c,u,h,f;if(!r)return n._root=s,n;for(;r.length;)if((u=e>=(l=(a+o)/2))?a=l:o=l,i=r,!(r=r[h=+u]))return i[h]=s,n;if(c=+n._x.call(null,r.data),e===c)return s.next=r,i?i[h]=s:n._root=s,n;do i=i?i[h]=new Array(2):n._root=new Array(2),(u=e>=(l=(a+o)/2))?a=l:o=l;while((h=+u)==(f=+(c>=l)));return i[f]=r,i[h]=s,n}function JM(n){Array.isArray(n)||(n=Array.from(n));const e=n.length,t=new Float64Array(e);let i=1/0,r=-1/0;for(let s=0,a;s<e;++s)isNaN(a=+this._x.call(null,n[s]))||(t[s]=a,a<i&&(i=a),a>r&&(r=a));if(i>r)return this;this.cover(i).cover(r);for(let s=0;s<e;++s)am(this,t[s],n[s]);return this}function QM(n){if(isNaN(n=+n))return this;var e=this._x0,t=this._x1;if(isNaN(e))t=(e=Math.floor(n))+1;else{for(var i=t-e||1,r=this._root,s,a;e>n||n>=t;)switch(a=+(n<e),s=new Array(2),s[a]=r,r=s,i*=2,a){case 0:t=e+i;break;case 1:e=t-i;break}this._root&&this._root.length&&(this._root=r)}return this._x0=e,this._x1=t,this}function e1(){var n=[];return this.visit(function(e){if(!e.length)do n.push(e.data);while(e=e.next)}),n}function t1(n){return arguments.length?this.cover(+n[0][0]).cover(+n[1][0]):isNaN(this._x0)?void 0:[[this._x0],[this._x1]]}function ei(n,e,t){this.node=n,this.x0=e,this.x1=t}function n1(n,e){var t,i=this._x0,r,s,a=this._x1,o=[],l=this._root,c,u;for(l&&o.push(new ei(l,i,a)),e==null?e=1/0:(i=n-e,a=n+e);c=o.pop();)if(!(!(l=c.node)||(r=c.x0)>a||(s=c.x1)<i))if(l.length){var h=(r+s)/2;o.push(new ei(l[1],h,s),new ei(l[0],r,h)),(u=+(n>=h))&&(c=o[o.length-1],o[o.length-1]=o[o.length-1-u],o[o.length-1-u]=c)}else{var f=Math.abs(n-+this._x.call(null,l.data));f<e&&(e=f,i=n-f,a=n+f,t=l.data)}return t}function i1(n){if(isNaN(l=+this._x.call(null,n)))return this;var e,t=this._root,i,r,s,a=this._x0,o=this._x1,l,c,u,h,f;if(!t)return this;if(t.length)for(;;){if((u=l>=(c=(a+o)/2))?a=c:o=c,e=t,!(t=t[h=+u]))return this;if(!t.length)break;e[h+1&1]&&(i=e,f=h)}for(;t.data!==n;)if(r=t,!(t=t.next))return this;return(s=t.next)&&delete t.next,r?(s?r.next=s:delete r.next,this):e?(s?e[h]=s:delete e[h],(t=e[0]||e[1])&&t===(e[1]||e[0])&&!t.length&&(i?i[f]=t:this._root=t),this):(this._root=s,this)}function r1(n){for(var e=0,t=n.length;e<t;++e)this.remove(n[e]);return this}function s1(){return this._root}function a1(){var n=0;return this.visit(function(e){if(!e.length)do++n;while(e=e.next)}),n}function o1(n){var e=[],t,i=this._root,r,s,a;for(i&&e.push(new ei(i,this._x0,this._x1));t=e.pop();)if(!n(i=t.node,s=t.x0,a=t.x1)&&i.length){var o=(s+a)/2;(r=i[1])&&e.push(new ei(r,o,a)),(r=i[0])&&e.push(new ei(r,s,o))}return this}function l1(n){var e=[],t=[],i;for(this._root&&e.push(new ei(this._root,this._x0,this._x1));i=e.pop();){var r=i.node;if(r.length){var s,a=i.x0,o=i.x1,l=(a+o)/2;(s=r[0])&&e.push(new ei(s,a,l)),(s=r[1])&&e.push(new ei(s,l,o))}t.push(i)}for(;i=t.pop();)n(i.node,i.x0,i.x1);return this}function c1(n){return n[0]}function u1(n){return arguments.length?(this._x=n,this):this._x}function om(n,e){var t=new au(e??c1,NaN,NaN);return n==null?t:t.addAll(n)}function au(n,e,t){this._x=n,this._x0=e,this._x1=t,this._root=void 0}function df(n){for(var e={data:n.data},t=e;n=n.next;)t=t.next={data:n.data};return e}var on=om.prototype=au.prototype;on.copy=function(){var n=new au(this._x,this._x0,this._x1),e=this._root,t,i;if(!e)return n;if(!e.length)return n._root=df(e),n;for(t=[{source:e,target:n._root=new Array(2)}];e=t.pop();)for(var r=0;r<2;++r)(i=e.source[r])&&(i.length?t.push({source:i,target:e.target[r]=new Array(2)}):e.target[r]=df(i));return n};on.add=$M;on.addAll=JM;on.cover=QM;on.data=e1;on.extent=t1;on.find=n1;on.remove=i1;on.removeAll=r1;on.root=s1;on.size=a1;on.visit=o1;on.visitAfter=l1;on.x=u1;function h1(n){const e=+this._x.call(null,n),t=+this._y.call(null,n);return lm(this.cover(e,t),e,t,n)}function lm(n,e,t,i){if(isNaN(e)||isNaN(t))return n;var r,s=n._root,a={data:i},o=n._x0,l=n._y0,c=n._x1,u=n._y1,h,f,d,g,v,m,p,y;if(!s)return n._root=a,n;for(;s.length;)if((v=e>=(h=(o+c)/2))?o=h:c=h,(m=t>=(f=(l+u)/2))?l=f:u=f,r=s,!(s=s[p=m<<1|v]))return r[p]=a,n;if(d=+n._x.call(null,s.data),g=+n._y.call(null,s.data),e===d&&t===g)return a.next=s,r?r[p]=a:n._root=a,n;do r=r?r[p]=new Array(4):n._root=new Array(4),(v=e>=(h=(o+c)/2))?o=h:c=h,(m=t>=(f=(l+u)/2))?l=f:u=f;while((p=m<<1|v)===(y=(g>=f)<<1|d>=h));return r[y]=s,r[p]=a,n}function f1(n){var e,t,i=n.length,r,s,a=new Array(i),o=new Array(i),l=1/0,c=1/0,u=-1/0,h=-1/0;for(t=0;t<i;++t)isNaN(r=+this._x.call(null,e=n[t]))||isNaN(s=+this._y.call(null,e))||(a[t]=r,o[t]=s,r<l&&(l=r),r>u&&(u=r),s<c&&(c=s),s>h&&(h=s));if(l>u||c>h)return this;for(this.cover(l,c).cover(u,h),t=0;t<i;++t)lm(this,a[t],o[t],n[t]);return this}function d1(n,e){if(isNaN(n=+n)||isNaN(e=+e))return this;var t=this._x0,i=this._y0,r=this._x1,s=this._y1;if(isNaN(t))r=(t=Math.floor(n))+1,s=(i=Math.floor(e))+1;else{for(var a=r-t||1,o=this._root,l,c;t>n||n>=r||i>e||e>=s;)switch(c=(e<i)<<1|n<t,l=new Array(4),l[c]=o,o=l,a*=2,c){case 0:r=t+a,s=i+a;break;case 1:t=r-a,s=i+a;break;case 2:r=t+a,i=s-a;break;case 3:t=r-a,i=s-a;break}this._root&&this._root.length&&(this._root=o)}return this._x0=t,this._y0=i,this._x1=r,this._y1=s,this}function p1(){var n=[];return this.visit(function(e){if(!e.length)do n.push(e.data);while(e=e.next)}),n}function m1(n){return arguments.length?this.cover(+n[0][0],+n[0][1]).cover(+n[1][0],+n[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function Wt(n,e,t,i,r){this.node=n,this.x0=e,this.y0=t,this.x1=i,this.y1=r}function g1(n,e,t){var i,r=this._x0,s=this._y0,a,o,l,c,u=this._x1,h=this._y1,f=[],d=this._root,g,v;for(d&&f.push(new Wt(d,r,s,u,h)),t==null?t=1/0:(r=n-t,s=e-t,u=n+t,h=e+t,t*=t);g=f.pop();)if(!(!(d=g.node)||(a=g.x0)>u||(o=g.y0)>h||(l=g.x1)<r||(c=g.y1)<s))if(d.length){var m=(a+l)/2,p=(o+c)/2;f.push(new Wt(d[3],m,p,l,c),new Wt(d[2],a,p,m,c),new Wt(d[1],m,o,l,p),new Wt(d[0],a,o,m,p)),(v=(e>=p)<<1|n>=m)&&(g=f[f.length-1],f[f.length-1]=f[f.length-1-v],f[f.length-1-v]=g)}else{var y=n-+this._x.call(null,d.data),x=e-+this._y.call(null,d.data),_=y*y+x*x;if(_<t){var S=Math.sqrt(t=_);r=n-S,s=e-S,u=n+S,h=e+S,i=d.data}}return i}function v1(n){if(isNaN(u=+this._x.call(null,n))||isNaN(h=+this._y.call(null,n)))return this;var e,t=this._root,i,r,s,a=this._x0,o=this._y0,l=this._x1,c=this._y1,u,h,f,d,g,v,m,p;if(!t)return this;if(t.length)for(;;){if((g=u>=(f=(a+l)/2))?a=f:l=f,(v=h>=(d=(o+c)/2))?o=d:c=d,e=t,!(t=t[m=v<<1|g]))return this;if(!t.length)break;(e[m+1&3]||e[m+2&3]||e[m+3&3])&&(i=e,p=m)}for(;t.data!==n;)if(r=t,!(t=t.next))return this;return(s=t.next)&&delete t.next,r?(s?r.next=s:delete r.next,this):e?(s?e[m]=s:delete e[m],(t=e[0]||e[1]||e[2]||e[3])&&t===(e[3]||e[2]||e[1]||e[0])&&!t.length&&(i?i[p]=t:this._root=t),this):(this._root=s,this)}function _1(n){for(var e=0,t=n.length;e<t;++e)this.remove(n[e]);return this}function x1(){return this._root}function y1(){var n=0;return this.visit(function(e){if(!e.length)do++n;while(e=e.next)}),n}function S1(n){var e=[],t,i=this._root,r,s,a,o,l;for(i&&e.push(new Wt(i,this._x0,this._y0,this._x1,this._y1));t=e.pop();)if(!n(i=t.node,s=t.x0,a=t.y0,o=t.x1,l=t.y1)&&i.length){var c=(s+o)/2,u=(a+l)/2;(r=i[3])&&e.push(new Wt(r,c,u,o,l)),(r=i[2])&&e.push(new Wt(r,s,u,c,l)),(r=i[1])&&e.push(new Wt(r,c,a,o,u)),(r=i[0])&&e.push(new Wt(r,s,a,c,u))}return this}function b1(n){var e=[],t=[],i;for(this._root&&e.push(new Wt(this._root,this._x0,this._y0,this._x1,this._y1));i=e.pop();){var r=i.node;if(r.length){var s,a=i.x0,o=i.y0,l=i.x1,c=i.y1,u=(a+l)/2,h=(o+c)/2;(s=r[0])&&e.push(new Wt(s,a,o,u,h)),(s=r[1])&&e.push(new Wt(s,u,o,l,h)),(s=r[2])&&e.push(new Wt(s,a,h,u,c)),(s=r[3])&&e.push(new Wt(s,u,h,l,c))}t.push(i)}for(;i=t.pop();)n(i.node,i.x0,i.y0,i.x1,i.y1);return this}function M1(n){return n[0]}function T1(n){return arguments.length?(this._x=n,this):this._x}function E1(n){return n[1]}function w1(n){return arguments.length?(this._y=n,this):this._y}function cm(n,e,t){var i=new ou(e??M1,t??E1,NaN,NaN,NaN,NaN);return n==null?i:i.addAll(n)}function ou(n,e,t,i,r,s){this._x=n,this._y=e,this._x0=t,this._y0=i,this._x1=r,this._y1=s,this._root=void 0}function pf(n){for(var e={data:n.data},t=e;n=n.next;)t=t.next={data:n.data};return e}var Kt=cm.prototype=ou.prototype;Kt.copy=function(){var n=new ou(this._x,this._y,this._x0,this._y0,this._x1,this._y1),e=this._root,t,i;if(!e)return n;if(!e.length)return n._root=pf(e),n;for(t=[{source:e,target:n._root=new Array(4)}];e=t.pop();)for(var r=0;r<4;++r)(i=e.source[r])&&(i.length?t.push({source:i,target:e.target[r]=new Array(4)}):e.target[r]=pf(i));return n};Kt.add=h1;Kt.addAll=f1;Kt.cover=d1;Kt.data=p1;Kt.extent=m1;Kt.find=g1;Kt.remove=v1;Kt.removeAll=_1;Kt.root=x1;Kt.size=y1;Kt.visit=S1;Kt.visitAfter=b1;Kt.x=T1;Kt.y=w1;function A1(n){const e=+this._x.call(null,n),t=+this._y.call(null,n),i=+this._z.call(null,n);return um(this.cover(e,t,i),e,t,i,n)}function um(n,e,t,i,r){if(isNaN(e)||isNaN(t)||isNaN(i))return n;var s,a=n._root,o={data:r},l=n._x0,c=n._y0,u=n._z0,h=n._x1,f=n._y1,d=n._z1,g,v,m,p,y,x,_,S,T,E,A;if(!a)return n._root=o,n;for(;a.length;)if((_=e>=(g=(l+h)/2))?l=g:h=g,(S=t>=(v=(c+f)/2))?c=v:f=v,(T=i>=(m=(u+d)/2))?u=m:d=m,s=a,!(a=a[E=T<<2|S<<1|_]))return s[E]=o,n;if(p=+n._x.call(null,a.data),y=+n._y.call(null,a.data),x=+n._z.call(null,a.data),e===p&&t===y&&i===x)return o.next=a,s?s[E]=o:n._root=o,n;do s=s?s[E]=new Array(8):n._root=new Array(8),(_=e>=(g=(l+h)/2))?l=g:h=g,(S=t>=(v=(c+f)/2))?c=v:f=v,(T=i>=(m=(u+d)/2))?u=m:d=m;while((E=T<<2|S<<1|_)===(A=(x>=m)<<2|(y>=v)<<1|p>=g));return s[A]=a,s[E]=o,n}function C1(n){Array.isArray(n)||(n=Array.from(n));const e=n.length,t=new Float64Array(e),i=new Float64Array(e),r=new Float64Array(e);let s=1/0,a=1/0,o=1/0,l=-1/0,c=-1/0,u=-1/0;for(let h=0,f,d,g,v;h<e;++h)isNaN(d=+this._x.call(null,f=n[h]))||isNaN(g=+this._y.call(null,f))||isNaN(v=+this._z.call(null,f))||(t[h]=d,i[h]=g,r[h]=v,d<s&&(s=d),d>l&&(l=d),g<a&&(a=g),g>c&&(c=g),v<o&&(o=v),v>u&&(u=v));if(s>l||a>c||o>u)return this;this.cover(s,a,o).cover(l,c,u);for(let h=0;h<e;++h)um(this,t[h],i[h],r[h],n[h]);return this}function R1(n,e,t){if(isNaN(n=+n)||isNaN(e=+e)||isNaN(t=+t))return this;var i=this._x0,r=this._y0,s=this._z0,a=this._x1,o=this._y1,l=this._z1;if(isNaN(i))a=(i=Math.floor(n))+1,o=(r=Math.floor(e))+1,l=(s=Math.floor(t))+1;else{for(var c=a-i||1,u=this._root,h,f;i>n||n>=a||r>e||e>=o||s>t||t>=l;)switch(f=(t<s)<<2|(e<r)<<1|n<i,h=new Array(8),h[f]=u,u=h,c*=2,f){case 0:a=i+c,o=r+c,l=s+c;break;case 1:i=a-c,o=r+c,l=s+c;break;case 2:a=i+c,r=o-c,l=s+c;break;case 3:i=a-c,r=o-c,l=s+c;break;case 4:a=i+c,o=r+c,s=l-c;break;case 5:i=a-c,o=r+c,s=l-c;break;case 6:a=i+c,r=o-c,s=l-c;break;case 7:i=a-c,r=o-c,s=l-c;break}this._root&&this._root.length&&(this._root=u)}return this._x0=i,this._y0=r,this._z0=s,this._x1=a,this._y1=o,this._z1=l,this}function P1(){var n=[];return this.visit(function(e){if(!e.length)do n.push(e.data);while(e=e.next)}),n}function D1(n){return arguments.length?this.cover(+n[0][0],+n[0][1],+n[0][2]).cover(+n[1][0],+n[1][1],+n[1][2]):isNaN(this._x0)?void 0:[[this._x0,this._y0,this._z0],[this._x1,this._y1,this._z1]]}function ct(n,e,t,i,r,s,a){this.node=n,this.x0=e,this.y0=t,this.z0=i,this.x1=r,this.y1=s,this.z1=a}function L1(n,e,t,i){var r,s=this._x0,a=this._y0,o=this._z0,l,c,u,h,f,d,g=this._x1,v=this._y1,m=this._z1,p=[],y=this._root,x,_;for(y&&p.push(new ct(y,s,a,o,g,v,m)),i==null?i=1/0:(s=n-i,a=e-i,o=t-i,g=n+i,v=e+i,m=t+i,i*=i);x=p.pop();)if(!(!(y=x.node)||(l=x.x0)>g||(c=x.y0)>v||(u=x.z0)>m||(h=x.x1)<s||(f=x.y1)<a||(d=x.z1)<o))if(y.length){var S=(l+h)/2,T=(c+f)/2,E=(u+d)/2;p.push(new ct(y[7],S,T,E,h,f,d),new ct(y[6],l,T,E,S,f,d),new ct(y[5],S,c,E,h,T,d),new ct(y[4],l,c,E,S,T,d),new ct(y[3],S,T,u,h,f,E),new ct(y[2],l,T,u,S,f,E),new ct(y[1],S,c,u,h,T,E),new ct(y[0],l,c,u,S,T,E)),(_=(t>=E)<<2|(e>=T)<<1|n>=S)&&(x=p[p.length-1],p[p.length-1]=p[p.length-1-_],p[p.length-1-_]=x)}else{var A=n-+this._x.call(null,y.data),M=e-+this._y.call(null,y.data),b=t-+this._z.call(null,y.data),L=A*A+M*M+b*b;if(L<i){var P=Math.sqrt(i=L);s=n-P,a=e-P,o=t-P,g=n+P,v=e+P,m=t+P,r=y.data}}return r}const U1=(n,e,t,i,r,s)=>Math.sqrt((n-i)**2+(e-r)**2+(t-s)**2);function N1(n,e,t,i){const r=[],s=n-i,a=e-i,o=t-i,l=n+i,c=e+i,u=t+i;return this.visit((h,f,d,g,v,m,p)=>{if(!h.length)do{const y=h.data;U1(n,e,t,this._x(y),this._y(y),this._z(y))<=i&&r.push(y)}while(h=h.next);return f>l||d>c||g>u||v<s||m<a||p<o}),r}function I1(n){if(isNaN(f=+this._x.call(null,n))||isNaN(d=+this._y.call(null,n))||isNaN(g=+this._z.call(null,n)))return this;var e,t=this._root,i,r,s,a=this._x0,o=this._y0,l=this._z0,c=this._x1,u=this._y1,h=this._z1,f,d,g,v,m,p,y,x,_,S,T;if(!t)return this;if(t.length)for(;;){if((y=f>=(v=(a+c)/2))?a=v:c=v,(x=d>=(m=(o+u)/2))?o=m:u=m,(_=g>=(p=(l+h)/2))?l=p:h=p,e=t,!(t=t[S=_<<2|x<<1|y]))return this;if(!t.length)break;(e[S+1&7]||e[S+2&7]||e[S+3&7]||e[S+4&7]||e[S+5&7]||e[S+6&7]||e[S+7&7])&&(i=e,T=S)}for(;t.data!==n;)if(r=t,!(t=t.next))return this;return(s=t.next)&&delete t.next,r?(s?r.next=s:delete r.next,this):e?(s?e[S]=s:delete e[S],(t=e[0]||e[1]||e[2]||e[3]||e[4]||e[5]||e[6]||e[7])&&t===(e[7]||e[6]||e[5]||e[4]||e[3]||e[2]||e[1]||e[0])&&!t.length&&(i?i[T]=t:this._root=t),this):(this._root=s,this)}function F1(n){for(var e=0,t=n.length;e<t;++e)this.remove(n[e]);return this}function O1(){return this._root}function k1(){var n=0;return this.visit(function(e){if(!e.length)do++n;while(e=e.next)}),n}function B1(n){var e=[],t,i=this._root,r,s,a,o,l,c,u;for(i&&e.push(new ct(i,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));t=e.pop();)if(!n(i=t.node,s=t.x0,a=t.y0,o=t.z0,l=t.x1,c=t.y1,u=t.z1)&&i.length){var h=(s+l)/2,f=(a+c)/2,d=(o+u)/2;(r=i[7])&&e.push(new ct(r,h,f,d,l,c,u)),(r=i[6])&&e.push(new ct(r,s,f,d,h,c,u)),(r=i[5])&&e.push(new ct(r,h,a,d,l,f,u)),(r=i[4])&&e.push(new ct(r,s,a,d,h,f,u)),(r=i[3])&&e.push(new ct(r,h,f,o,l,c,d)),(r=i[2])&&e.push(new ct(r,s,f,o,h,c,d)),(r=i[1])&&e.push(new ct(r,h,a,o,l,f,d)),(r=i[0])&&e.push(new ct(r,s,a,o,h,f,d))}return this}function z1(n){var e=[],t=[],i;for(this._root&&e.push(new ct(this._root,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1));i=e.pop();){var r=i.node;if(r.length){var s,a=i.x0,o=i.y0,l=i.z0,c=i.x1,u=i.y1,h=i.z1,f=(a+c)/2,d=(o+u)/2,g=(l+h)/2;(s=r[0])&&e.push(new ct(s,a,o,l,f,d,g)),(s=r[1])&&e.push(new ct(s,f,o,l,c,d,g)),(s=r[2])&&e.push(new ct(s,a,d,l,f,u,g)),(s=r[3])&&e.push(new ct(s,f,d,l,c,u,g)),(s=r[4])&&e.push(new ct(s,a,o,g,f,d,h)),(s=r[5])&&e.push(new ct(s,f,o,g,c,d,h)),(s=r[6])&&e.push(new ct(s,a,d,g,f,u,h)),(s=r[7])&&e.push(new ct(s,f,d,g,c,u,h))}t.push(i)}for(;i=t.pop();)n(i.node,i.x0,i.y0,i.z0,i.x1,i.y1,i.z1);return this}function V1(n){return n[0]}function G1(n){return arguments.length?(this._x=n,this):this._x}function H1(n){return n[1]}function W1(n){return arguments.length?(this._y=n,this):this._y}function j1(n){return n[2]}function X1(n){return arguments.length?(this._z=n,this):this._z}function hm(n,e,t,i){var r=new lu(e??V1,t??H1,i??j1,NaN,NaN,NaN,NaN,NaN,NaN);return n==null?r:r.addAll(n)}function lu(n,e,t,i,r,s,a,o,l){this._x=n,this._y=e,this._z=t,this._x0=i,this._y0=r,this._z0=s,this._x1=a,this._y1=o,this._z1=l,this._root=void 0}function mf(n){for(var e={data:n.data},t=e;n=n.next;)t=t.next={data:n.data};return e}var Ft=hm.prototype=lu.prototype;Ft.copy=function(){var n=new lu(this._x,this._y,this._z,this._x0,this._y0,this._z0,this._x1,this._y1,this._z1),e=this._root,t,i;if(!e)return n;if(!e.length)return n._root=mf(e),n;for(t=[{source:e,target:n._root=new Array(8)}];e=t.pop();)for(var r=0;r<8;++r)(i=e.source[r])&&(i.length?t.push({source:i,target:e.target[r]=new Array(8)}):e.target[r]=mf(i));return n};Ft.add=A1;Ft.addAll=C1;Ft.cover=R1;Ft.data=P1;Ft.extent=D1;Ft.find=L1;Ft.findAllWithinRadius=N1;Ft.remove=I1;Ft.removeAll=F1;Ft.root=O1;Ft.size=k1;Ft.visit=B1;Ft.visitAfter=z1;Ft.x=G1;Ft.y=W1;Ft.z=X1;function It(n){return function(){return n}}function Kn(n){return(n()-.5)*1e-6}function Y1(n){return n.index}function gf(n,e){var t=n.get(e);if(!t)throw new Error("node not found: "+e);return t}function q1(n){var e=Y1,t=f,i,r=It(30),s,a,o,l,c,u,h=1;n==null&&(n=[]);function f(p){return 1/Math.min(l[p.source.index],l[p.target.index])}function d(p){for(var y=0,x=n.length;y<h;++y)for(var _=0,S,T,E,A=0,M=0,b=0,L,P;_<x;++_)S=n[_],T=S.source,E=S.target,A=E.x+E.vx-T.x-T.vx||Kn(u),o>1&&(M=E.y+E.vy-T.y-T.vy||Kn(u)),o>2&&(b=E.z+E.vz-T.z-T.vz||Kn(u)),L=Math.sqrt(A*A+M*M+b*b),L=(L-s[_])/L*p*i[_],A*=L,M*=L,b*=L,E.vx-=A*(P=c[_]),o>1&&(E.vy-=M*P),o>2&&(E.vz-=b*P),T.vx+=A*(P=1-P),o>1&&(T.vy+=M*P),o>2&&(T.vz+=b*P)}function g(){if(a){var p,y=a.length,x=n.length,_=new Map(a.map((T,E)=>[e(T,E,a),T])),S;for(p=0,l=new Array(y);p<x;++p)S=n[p],S.index=p,typeof S.source!="object"&&(S.source=gf(_,S.source)),typeof S.target!="object"&&(S.target=gf(_,S.target)),l[S.source.index]=(l[S.source.index]||0)+1,l[S.target.index]=(l[S.target.index]||0)+1;for(p=0,c=new Array(x);p<x;++p)S=n[p],c[p]=l[S.source.index]/(l[S.source.index]+l[S.target.index]);i=new Array(x),v(),s=new Array(x),m()}}function v(){if(a)for(var p=0,y=n.length;p<y;++p)i[p]=+t(n[p],p,n)}function m(){if(a)for(var p=0,y=n.length;p<y;++p)s[p]=+r(n[p],p,n)}return d.initialize=function(p,...y){a=p,u=y.find(x=>typeof x=="function")||Math.random,o=y.find(x=>[1,2,3].includes(x))||2,g()},d.links=function(p){return arguments.length?(n=p,g(),d):n},d.id=function(p){return arguments.length?(e=p,d):e},d.iterations=function(p){return arguments.length?(h=+p,d):h},d.strength=function(p){return arguments.length?(t=typeof p=="function"?p:It(+p),v(),d):t},d.distance=function(p){return arguments.length?(r=typeof p=="function"?p:It(+p),m(),d):r},d}var K1={value:()=>{}};function fm(){for(var n=0,e=arguments.length,t={},i;n<e;++n){if(!(i=arguments[n]+"")||i in t||/[\s.]/.test(i))throw new Error("illegal type: "+i);t[i]=[]}return new La(t)}function La(n){this._=n}function Z1(n,e){return n.trim().split(/^|\s+/).map(function(t){var i="",r=t.indexOf(".");if(r>=0&&(i=t.slice(r+1),t=t.slice(0,r)),t&&!e.hasOwnProperty(t))throw new Error("unknown type: "+t);return{type:t,name:i}})}La.prototype=fm.prototype={constructor:La,on:function(n,e){var t=this._,i=Z1(n+"",t),r,s=-1,a=i.length;if(arguments.length<2){for(;++s<a;)if((r=(n=i[s]).type)&&(r=$1(t[r],n.name)))return r;return}if(e!=null&&typeof e!="function")throw new Error("invalid callback: "+e);for(;++s<a;)if(r=(n=i[s]).type)t[r]=vf(t[r],n.name,e);else if(e==null)for(r in t)t[r]=vf(t[r],n.name,null);return this},copy:function(){var n={},e=this._;for(var t in e)n[t]=e[t].slice();return new La(n)},call:function(n,e){if((r=arguments.length-2)>0)for(var t=new Array(r),i=0,r,s;i<r;++i)t[i]=arguments[i+2];if(!this._.hasOwnProperty(n))throw new Error("unknown type: "+n);for(s=this._[n],i=0,r=s.length;i<r;++i)s[i].value.apply(e,t)},apply:function(n,e,t){if(!this._.hasOwnProperty(n))throw new Error("unknown type: "+n);for(var i=this._[n],r=0,s=i.length;r<s;++r)i[r].value.apply(e,t)}};function $1(n,e){for(var t=0,i=n.length,r;t<i;++t)if((r=n[t]).name===e)return r.value}function vf(n,e,t){for(var i=0,r=n.length;i<r;++i)if(n[i].name===e){n[i]=K1,n=n.slice(0,i).concat(n.slice(i+1));break}return t!=null&&n.push({name:e,value:t}),n}var Or=0,ps=0,cs=0,dm=1e3,Xa,ms,Ya=0,qi=0,oo=0,As=typeof performance=="object"&&performance.now?performance:Date,pm=typeof window=="object"&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(n){setTimeout(n,17)};function mm(){return qi||(pm(J1),qi=As.now()+oo)}function J1(){qi=0}function _c(){this._call=this._time=this._next=null}_c.prototype=gm.prototype={constructor:_c,restart:function(n,e,t){if(typeof n!="function")throw new TypeError("callback is not a function");t=(t==null?mm():+t)+(e==null?0:+e),!this._next&&ms!==this&&(ms?ms._next=this:Xa=this,ms=this),this._call=n,this._time=t,xc()},stop:function(){this._call&&(this._call=null,this._time=1/0,xc())}};function gm(n,e,t){var i=new _c;return i.restart(n,e,t),i}function Q1(){mm(),++Or;for(var n=Xa,e;n;)(e=qi-n._time)>=0&&n._call.call(void 0,e),n=n._next;--Or}function _f(){qi=(Ya=As.now())+oo,Or=ps=0;try{Q1()}finally{Or=0,tT(),qi=0}}function eT(){var n=As.now(),e=n-Ya;e>dm&&(oo-=e,Ya=n)}function tT(){for(var n,e=Xa,t,i=1/0;e;)e._call?(i>e._time&&(i=e._time),n=e,e=e._next):(t=e._next,e._next=null,e=n?n._next=t:Xa=t);ms=n,xc(i)}function xc(n){if(!Or){ps&&(ps=clearTimeout(ps));var e=n-qi;e>24?(n<1/0&&(ps=setTimeout(_f,n-As.now()-oo)),cs&&(cs=clearInterval(cs))):(cs||(Ya=As.now(),cs=setInterval(eT,dm)),Or=1,pm(_f))}}const nT=1664525,iT=1013904223,xf=4294967296;function rT(){let n=1;return()=>(n=(nT*n+iT)%xf)/xf}var yf=3;function il(n){return n.x}function Sf(n){return n.y}function sT(n){return n.z}var aT=10,oT=Math.PI*(3-Math.sqrt(5)),lT=Math.PI*20/(9+Math.sqrt(221));function cT(n,e){e=e||2;var t=Math.min(yf,Math.max(1,Math.round(e))),i,r=1,s=.001,a=1-Math.pow(s,1/300),o=0,l=.6,c=new Map,u=gm(d),h=fm("tick","end"),f=rT();n==null&&(n=[]);function d(){g(),h.call("tick",i),r<s&&(u.stop(),h.call("end",i))}function g(p){var y,x=n.length,_;p===void 0&&(p=1);for(var S=0;S<p;++S)for(r+=(o-r)*a,c.forEach(function(T){T(r)}),y=0;y<x;++y)_=n[y],_.fx==null?_.x+=_.vx*=l:(_.x=_.fx,_.vx=0),t>1&&(_.fy==null?_.y+=_.vy*=l:(_.y=_.fy,_.vy=0)),t>2&&(_.fz==null?_.z+=_.vz*=l:(_.z=_.fz,_.vz=0));return i}function v(){for(var p=0,y=n.length,x;p<y;++p){if(x=n[p],x.index=p,x.fx!=null&&(x.x=x.fx),x.fy!=null&&(x.y=x.fy),x.fz!=null&&(x.z=x.fz),isNaN(x.x)||t>1&&isNaN(x.y)||t>2&&isNaN(x.z)){var _=aT*(t>2?Math.cbrt(.5+p):t>1?Math.sqrt(.5+p):p),S=p*oT,T=p*lT;t===1?x.x=_:t===2?(x.x=_*Math.cos(S),x.y=_*Math.sin(S)):(x.x=_*Math.sin(S)*Math.cos(T),x.y=_*Math.cos(S),x.z=_*Math.sin(S)*Math.sin(T))}(isNaN(x.vx)||t>1&&isNaN(x.vy)||t>2&&isNaN(x.vz))&&(x.vx=0,t>1&&(x.vy=0),t>2&&(x.vz=0))}}function m(p){return p.initialize&&p.initialize(n,f,t),p}return v(),i={tick:g,restart:function(){return u.restart(d),i},stop:function(){return u.stop(),i},numDimensions:function(p){return arguments.length?(t=Math.min(yf,Math.max(1,Math.round(p))),c.forEach(m),i):t},nodes:function(p){return arguments.length?(n=p,v(),c.forEach(m),i):n},alpha:function(p){return arguments.length?(r=+p,i):r},alphaMin:function(p){return arguments.length?(s=+p,i):s},alphaDecay:function(p){return arguments.length?(a=+p,i):+a},alphaTarget:function(p){return arguments.length?(o=+p,i):o},velocityDecay:function(p){return arguments.length?(l=1-p,i):1-l},randomSource:function(p){return arguments.length?(f=p,c.forEach(m),i):f},force:function(p,y){return arguments.length>1?(y==null?c.delete(p):c.set(p,m(y)),i):c.get(p)},find:function(){var p=Array.prototype.slice.call(arguments),y=p.shift()||0,x=(t>1?p.shift():null)||0,_=(t>2?p.shift():null)||0,S=p.shift()||1/0,T=0,E=n.length,A,M,b,L,P,I;for(S*=S,T=0;T<E;++T)P=n[T],A=y-P.x,M=x-(P.y||0),b=_-(P.z||0),L=A*A+M*M+b*b,L<S&&(I=P,S=L);return I},on:function(p,y){return arguments.length>1?(h.on(p,y),i):h.on(p)}}}function uT(){var n,e,t,i,r,s=It(-30),a,o=1,l=1/0,c=.81;function u(g){var v,m=n.length,p=(e===1?om(n,il):e===2?cm(n,il,Sf):e===3?hm(n,il,Sf,sT):null).visitAfter(f);for(r=g,v=0;v<m;++v)t=n[v],p.visit(d)}function h(){if(n){var g,v=n.length,m;for(a=new Array(v),g=0;g<v;++g)m=n[g],a[m.index]=+s(m,g,n)}}function f(g){var v=0,m,p,y=0,x,_,S,T,E=g.length;if(E){for(x=_=S=T=0;T<E;++T)(m=g[T])&&(p=Math.abs(m.value))&&(v+=m.value,y+=p,x+=p*(m.x||0),_+=p*(m.y||0),S+=p*(m.z||0));v*=Math.sqrt(4/E),g.x=x/y,e>1&&(g.y=_/y),e>2&&(g.z=S/y)}else{m=g,m.x=m.data.x,e>1&&(m.y=m.data.y),e>2&&(m.z=m.data.z);do v+=a[m.data.index];while(m=m.next)}g.value=v}function d(g,v,m,p,y){if(!g.value)return!0;var x=[m,p,y][e-1],_=g.x-t.x,S=e>1?g.y-t.y:0,T=e>2?g.z-t.z:0,E=x-v,A=_*_+S*S+T*T;if(E*E/c<A)return A<l&&(_===0&&(_=Kn(i),A+=_*_),e>1&&S===0&&(S=Kn(i),A+=S*S),e>2&&T===0&&(T=Kn(i),A+=T*T),A<o&&(A=Math.sqrt(o*A)),t.vx+=_*g.value*r/A,e>1&&(t.vy+=S*g.value*r/A),e>2&&(t.vz+=T*g.value*r/A)),!0;if(g.length||A>=l)return;(g.data!==t||g.next)&&(_===0&&(_=Kn(i),A+=_*_),e>1&&S===0&&(S=Kn(i),A+=S*S),e>2&&T===0&&(T=Kn(i),A+=T*T),A<o&&(A=Math.sqrt(o*A)));do g.data!==t&&(E=a[g.data.index]*r/A,t.vx+=_*E,e>1&&(t.vy+=S*E),e>2&&(t.vz+=T*E));while(g=g.next)}return u.initialize=function(g,...v){n=g,i=v.find(m=>typeof m=="function")||Math.random,e=v.find(m=>[1,2,3].includes(m))||2,h()},u.strength=function(g){return arguments.length?(s=typeof g=="function"?g:It(+g),h(),u):s},u.distanceMin=function(g){return arguments.length?(o=g*g,u):Math.sqrt(o)},u.distanceMax=function(g){return arguments.length?(l=g*g,u):Math.sqrt(l)},u.theta=function(g){return arguments.length?(c=g*g,u):Math.sqrt(c)},u}function bf(n){var e=It(.1),t,i,r;typeof n!="function"&&(n=It(n==null?0:+n));function s(o){for(var l=0,c=t.length,u;l<c;++l)u=t[l],u.vx+=(r[l]-u.x)*i[l]*o}function a(){if(t){var o,l=t.length;for(i=new Array(l),r=new Array(l),o=0;o<l;++o)i[o]=isNaN(r[o]=+n(t[o],o,t))?0:+e(t[o],o,t)}}return s.initialize=function(o){t=o,a()},s.strength=function(o){return arguments.length?(e=typeof o=="function"?o:It(+o),a(),s):e},s.x=function(o){return arguments.length?(n=typeof o=="function"?o:It(+o),a(),s):n},s}function Mf(n){var e=It(.1),t,i,r;typeof n!="function"&&(n=It(n==null?0:+n));function s(o){for(var l=0,c=t.length,u;l<c;++l)u=t[l],u.vy+=(r[l]-u.y)*i[l]*o}function a(){if(t){var o,l=t.length;for(i=new Array(l),r=new Array(l),o=0;o<l;++o)i[o]=isNaN(r[o]=+n(t[o],o,t))?0:+e(t[o],o,t)}}return s.initialize=function(o){t=o,a()},s.strength=function(o){return arguments.length?(e=typeof o=="function"?o:It(+o),a(),s):e},s.y=function(o){return arguments.length?(n=typeof o=="function"?o:It(+o),a(),s):n},s}function Tf(n){var e=It(.1),t,i,r;typeof n!="function"&&(n=It(n==null?0:+n));function s(o){for(var l=0,c=t.length,u;l<c;++l)u=t[l],u.vz+=(r[l]-u.z)*i[l]*o}function a(){if(t){var o,l=t.length;for(i=new Array(l),r=new Array(l),o=0;o<l;++o)i[o]=isNaN(r[o]=+n(t[o],o,t))?0:+e(t[o],o,t)}}return s.initialize=function(o){t=o,a()},s.strength=function(o){return arguments.length?(e=typeof o=="function"?o:It(+o),a(),s):e},s.z=function(o){return arguments.length?(n=typeof o=="function"?o:It(+o),a(),s):n},s}const hT={center:.04,repel:140,linkDistance:120,linkStrength:.4},fT=(n,e,t)=>n<e?e:n>t?t:n;function vm(n,e){const t=n.force("charge");t&&t.strength(-e.repel);const i=n.force("link");i&&i.distance(r=>Math.max(20,e.linkDistance*(1.5-r.relevance))).strength(r=>fT(e.linkStrength*(.3+1.25*r.relevance),.01,2));for(const r of["gx","gy","gz"]){const s=n.force(r);s&&s.strength(e.center)}}const rl=280,dT=.05;function pT(n,e=hT){const t=n.nodes.map(l=>({id:l.id,importance:l.importance,communityId:l.communityId})),i=n.edges.map(l=>({source:l.source,target:l.target,relevance:l.relevance})),r=mT(n),s=(l,c)=>{var u;return l.communityId==null?0:((u=r.get(l.communityId))==null?void 0:u[c])??0},a=l=>l.communityId==null?0:dT,o=cT(t,3).force("charge",uT().distanceMax(900)).force("link",q1(i).id(l=>l.id)).force("center",ZM(0,0,0).strength(.05)).force("cx",bf(l=>s(l,"x")).strength(a)).force("cy",Mf(l=>s(l,"y")).strength(a)).force("cz",Tf(l=>s(l,"z")).strength(a)).force("gx",bf(0)).force("gy",Mf(0)).force("gz",Tf(0)).stop();return vm(o,e),{sim:o,nodes:t,links:i}}function mT(n){const e=[...new Set(n.nodes.map(r=>r.communityId).filter(r=>r!=null))],t=new Map,i=e.length;return e.forEach((r,s)=>{if(i<=1){t.set(r,{x:0,y:0,z:0});return}const a=Math.acos(1-2*(s+.5)/i),o=Math.PI*(1+Math.sqrt(5))*s;t.set(r,{x:rl*Math.sin(a)*Math.cos(o),y:rl*Math.sin(a)*Math.sin(o),z:rl*Math.cos(a)})}),t}const Ef=.35,gT=.25,vT=1.9,_T=1.3,xT=.5,yT=.7,wf=.5,ST=.4;function bT(n){const e=n.nodes.length,t=new so(1,16,16),i=new Is,r=new V0(t,i,Math.max(1,e));r.count=e,r.frustumCulled=!1;const s=n.nodes.map(m=>m.id),a=n.nodes.map(m=>new Ke(m.color)),o=n.nodes.map(m=>m.stale),l=n.nodes.map(m=>d_(m.importance)),c=new Float32Array(e).fill(1);let u=1;const h=bi("--g-ember","rgba(210,68,48,1)").color;a.forEach((m,p)=>r.setColorAt(p,m)),r.instanceColor&&(r.instanceColor.needsUpdate=!0);const f=new ut,d=new Ke;function g(m){for(let p=0;p<e;p++){const y=m[p];if(!y)continue;const x=(l[p]??6)*(c[p]??1)*u;f.makeScale(x,x,x),f.setPosition(y.x??0,y.y??0,y.z??0),r.setMatrixAt(p,f)}r.instanceMatrix.needsUpdate=!0,r.boundingSphere=null}function v(m){const{focusId:p,nearSet:y,highlightSet:x,searchSet:_,hoverNearSet:S}=m;for(let T=0;T<e;T++){const E=s[T];if(E===void 0)continue;const A=a[T]??h;d.copy(A);let M=1;!_||_.has(E)?p?E===p?(d.copy(h),M=vT):y&&y.has(E)||(d.multiplyScalar(Ef),M=wf):S&&!S.has(E)&&(d.multiplyScalar(Ef),M=wf):(d.multiplyScalar(gT),M=ST),x&&x.has(E)&&(d.lerp(h,.6),M=Math.max(M,_T)),o[T]&&(d.multiplyScalar(xT),M*=yT),r.setColorAt(T,d),c[T]=M}r.instanceColor&&(r.instanceColor.needsUpdate=!0)}return{mesh:r,sync:g,setVisualState:v,setSizeScale(m){u=m>0?m:1},nodeIdAt:m=>s[m],dispose(){t.dispose(),i.dispose()}}}const MT=n=>n<0?0:n>1?1:n,TT=.18;function ET(n,e){const t=n.edges,i=Math.max(1,Math.floor(e)),r=i*2,s=t.length*r,a=new Float32Array(s*3),o=new Float32Array(s*3),l=bi("--g-edge","rgba(180,176,170,0.18)").color,c=bi("--g-edge-strong","rgba(180,176,170,0.34)").color,u=bi("--g-ember","rgba(210,68,48,1)").color,h=new Ke;function f(K,G){const $=K*r*3;for(let O=0;O<r;O++)o[$+O*3]=G.r,o[$+O*3+1]=G.g,o[$+O*3+2]=G.b}function d(K){for(let G=0;G<t.length;G++){const $=t[G];if(!$)continue;if(K!=null&&($.source===K||$.target===K)){f(G,u);continue}const W=$.type==="typed"?c:l,Y=.4+.6*MT($.relevance);h.copy(W).multiplyScalar(K!=null?Y*.18:Y),f(G,h)}}d(null);const g=new dn,v=new sn(a,3);v.setUsage(u0),g.setAttribute("position",v);const m=new sn(o,3);g.setAttribute("color",m);const p=new iu({vertexColors:!0,transparent:!0,blending:za,depthWrite:!1}),y=new Kp(g,p);y.frustumCulled=!1;const x=new te,_=new te,S=new te,T=new te,E=new te,A=new te,M=new te,b=new te,L=new te(0,1,0),P=new te(1,0,0);function I(K,G){const $=1-K;G.set(0,0,0).addScaledVector(x,$*$).addScaledVector(A,2*$*K).addScaledVector(_,K*K)}function F(K){for(let G=0;G<t.length;G++){const $=t[G];if(!$)continue;const O=K.get($.source),W=K.get($.target);x.set((O==null?void 0:O.x)??0,(O==null?void 0:O.y)??0,(O==null?void 0:O.z)??0),_.set((W==null?void 0:W.x)??0,(W==null?void 0:W.y)??0,(W==null?void 0:W.z)??0),T.copy(_).sub(x);const Y=T.length(),N=G*r*3;if(Y<1e-6){for(let V=0;V<r;V++)a[N+V*3]=x.x,a[N+V*3+1]=x.y,a[N+V*3+2]=x.z;continue}S.copy(x).add(_).multiplyScalar(.5),E.copy(T).cross(L),E.lengthSq()<1e-6&&E.copy(T).cross(P),E.normalize().multiplyScalar(Y*TT),A.copy(S).add(E);for(let V=0;V<i;V++){I(V/i,M),I((V+1)/i,b);const ee=N+V*6;a[ee]=M.x,a[ee+1]=M.y,a[ee+2]=M.z,a[ee+3]=b.x,a[ee+4]=b.y,a[ee+5]=b.z}}v.needsUpdate=!0}return{lines:y,sync:F,setHighlight(K){d(K),m.needsUpdate=!0},dispose(){g.dispose(),p.dispose()}}}const _m={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class Os{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const wT=new Qp(-1,1,1,-1,0,1);class AT extends dn{constructor(){super(),this.setAttribute("position",new an([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new an([0,2,0,0,2,0],2))}}const CT=new AT;class xm{constructor(e){this._mesh=new zt(CT,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,wT)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class RT extends Os{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof jt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ws.clone(e.uniforms),this.material=new jt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new xm(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class Af extends Os{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),s.buffers.stencil.setClear(o),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}}class PT extends Os{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class DT{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new je);this._width=i.width,this._height=i.height,t=new Nn(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Jn}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new RT(_m),this.copyPass.material.blending=$n,this.clock=new Y0}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let r=0,s=this.passes.length;r<s;r++){const a=this.passes[r];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),a.needsSwap){if(i){const o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}Af!==void 0&&(a instanceof Af?i=!0:a instanceof PT&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new je);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class LT extends Os{constructor(e,t,i=null,r=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ke}render(e,t,i){const r=e.autoClear;e.autoClear=!1;let s,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}}const UT={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ke(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class kr extends Os{constructor(e,t,i,r){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new je(e.x,e.y):new je(256,256),this.clearColor=new Ke(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new Nn(s,a,{type:Jn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const f=new Nn(s,a,{type:Jn});f.texture.name="UnrealBloomPass.h"+h,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const d=new Nn(s,a,{type:Jn});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),s=Math.round(s/2),a=Math.round(a/2)}const o=UT;this.highPassUniforms=ws.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new jt({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];s=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new je(1/s,1/a),s=Math.round(s/2),a=Math.round(a/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new te(1,1,1),new te(1,1,1),new te(1,1,1),new te(1,1,1),new te(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const u=_m;this.copyUniforms=ws.clone(u.uniforms),this.blendMaterial=new jt({uniforms:this.copyUniforms,vertexShader:u.vertexShader,fragmentShader:u.fragmentShader,blending:za,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ke,this.oldClearAlpha=1,this.basic=new Is,this.fsQuad=new xm(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new je(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(e,t,i,r,s){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let o=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[l].uniforms.direction.value=kr.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=kr.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),o=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=a}getSeperableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new jt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new je(.5,.5)},direction:{value:new je(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new jt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}kr.BlurDirectionX=new je(1,0);kr.BlurDirectionY=new je(0,1);const NT=.85,IT=.55,FT=.12;function Cf(n,e,t,i,r){const s=new DT(n);s.addPass(new LT(e,t));const a=new kr(new je(Math.max(1,i),Math.max(1,r)),NT,IT,FT);return s.addPass(a),s.setSize(Math.max(1,i),Math.max(1,r)),{render:()=>s.render(),setSize:(o,l)=>s.setSize(Math.max(1,o),Math.max(1,l)),dispose:()=>{a.dispose(),s.dispose()}}}const OT=`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,kT=`
  precision highp float;
  varying vec3 vDir;
  uniform float uTime;
  uniform vec3 uEmber;
  uniform vec3 uDeep;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float n = fbm(dir * 2.2 + vec3(0.0, uTime * 0.015, uTime * 0.008));
    n = smoothstep(0.32, 0.85, n);
    vec3 col = mix(uDeep, uEmber, n * 0.55);
    float alpha = 0.18 + 0.42 * n;
    gl_FragColor = vec4(col, alpha);
  }
`;function Rf(){const n=bi("--g-ember","rgba(210,68,48,1)").color,e=bi("--v2-bg-sunken","#050403").color,t=new so(3200,48,48),i=new jt({side:qt,transparent:!0,depthWrite:!1,depthTest:!1,uniforms:{uTime:{value:0},uEmber:{value:new Ke().copy(n)},uDeep:{value:new Ke().copy(e)}},vertexShader:OT,fragmentShader:kT}),r=new zt(t,i);return r.frustumCulled=!1,r.renderOrder=-1,{mesh:r,update(s){const a=i.uniforms.uTime;a&&(a.value=s)},dispose(){t.dispose(),i.dispose()}}}const BT={bloom:!1,nebula:!1,threads:!0,motion:!1,labels:!0};function zT(n,e,t){return{bloom:n.bloom,nebula:n.nebula&&e<=3e3,threads:n.threads,labels:n.labels,motion:n.motion&&!t&&e<=3e3}}function VT(n){return n>3e3?1:n>1200?3:6}function GT(){if(typeof window>"u"||typeof window.matchMedia!="function")return!1;try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}}function HT(n){const e=new Map,t=(i,r)=>{const s=e.get(i);s?s.push(r):e.set(i,[r])};for(const i of n)t(i.source,i.target),t(i.target,i.source);return e}function Pf(n,e,t){const i=new Set([e]);let r=[e];for(let s=0;s<t;s++){const a=[];for(const o of r)for(const l of n.get(o)??[])i.has(l)||(i.add(l),a.push(l));if(r=a,r.length===0)break}return i}function WT(n,e,t){return{x:(n-t.left)/t.width*2-1,y:-((e-t.top)/t.height)*2+1}}function jT(n,e){if(n.length===0)return null;let t=0,i=0,r=0;for(const l of n)t+=l.x??0,i+=l.y??0,r+=l.z??0;t/=n.length,i/=n.length,r/=n.length;let s=1;for(const l of n){const c=(l.x??0)-t,u=(l.y??0)-i,h=(l.z??0)-r;s=Math.max(s,Math.hypot(c,u,h))}const a=e*Math.PI/180,o=s*1.3/Math.tan(a/2)+80;return{cx:t,cy:i,cz:r,distance:o}}function XT(){var n=Object.create(null);function e(r,s){var a=r.id,o=r.name,l=r.dependencies;l===void 0&&(l=[]);var c=r.init;c===void 0&&(c=function(){});var u=r.getTransferables;if(u===void 0&&(u=null),!n[a])try{l=l.map(function(f){return f&&f.isWorkerModule&&(e(f,function(d){if(d instanceof Error)throw d}),f=n[f.id].value),f}),c=i("<"+o+">.init",c),u&&(u=i("<"+o+">.getTransferables",u));var h=null;typeof c=="function"?h=c.apply(void 0,l):console.error("worker module init function failed to rehydrate"),n[a]={id:a,value:h,getTransferables:u},s(h)}catch(f){f&&f.noLog||console.error(f),s(f)}}function t(r,s){var a,o=r.id,l=r.args;(!n[o]||typeof n[o].value!="function")&&s(new Error("Worker module "+o+": not found or its 'init' did not return a function"));try{var c=(a=n[o]).value.apply(a,l);c&&typeof c.then=="function"?c.then(u,function(h){return s(h instanceof Error?h:new Error(""+h))}):u(c)}catch(h){s(h)}function u(h){try{var f=n[o].getTransferables&&n[o].getTransferables(h);(!f||!Array.isArray(f)||!f.length)&&(f=void 0),s(h,f)}catch(d){console.error(d),s(d)}}}function i(r,s){var a=void 0;self.troikaDefine=function(l){return a=l};var o=URL.createObjectURL(new Blob(["/** "+r.replace(/\*/g,"")+` **/

troikaDefine(
`+s+`
)`],{type:"application/javascript"}));try{importScripts(o)}catch(l){console.error(l)}return URL.revokeObjectURL(o),delete self.troikaDefine,a}self.addEventListener("message",function(r){var s=r.data,a=s.messageId,o=s.action,l=s.data;try{o==="registerModule"&&e(l,function(c){c instanceof Error?postMessage({messageId:a,success:!1,error:c.message}):postMessage({messageId:a,success:!0,result:{isCallable:typeof c=="function"}})}),o==="callModule"&&t(l,function(c,u){c instanceof Error?postMessage({messageId:a,success:!1,error:c.message}):postMessage({messageId:a,success:!0,result:c},u||void 0)})}catch(c){postMessage({messageId:a,success:!1,error:c.stack})}})}function YT(n){var e=function(){for(var t=[],i=arguments.length;i--;)t[i]=arguments[i];return e._getInitResult().then(function(r){if(typeof r=="function")return r.apply(void 0,t);throw new Error("Worker module function was called but `init` did not return a callable function")})};return e._getInitResult=function(){var t=n.dependencies,i=n.init;t=Array.isArray(t)?t.map(function(s){return s&&(s=s.onMainThread||s,s._getInitResult&&(s=s._getInitResult())),s}):[];var r=Promise.all(t).then(function(s){return i.apply(null,s)});return e._getInitResult=function(){return r},r},e}var ym=function(){var n=!1;if(typeof window<"u"&&typeof window.document<"u")try{var e=new Worker(URL.createObjectURL(new Blob([""],{type:"application/javascript"})));e.terminate(),n=!0}catch(t){console.log("Troika createWorkerModule: web workers not allowed; falling back to main thread execution. Cause: ["+t.message+"]")}return ym=function(){return n},n},qT=0,KT=0,sl=!1,xs=Object.create(null),ys=Object.create(null),yc=Object.create(null);function Vr(n){if((!n||typeof n.init!="function")&&!sl)throw new Error("requires `options.init` function");var e=n.dependencies,t=n.init,i=n.getTransferables,r=n.workerId,s=YT(n);r==null&&(r="#default");var a="workerModule"+ ++qT,o=n.name||a,l=null;e=e&&e.map(function(u){return typeof u=="function"&&!u.workerModuleData&&(sl=!0,u=Vr({workerId:r,name:"<"+o+"> function dependency: "+u.name,init:`function(){return (
`+Ua(u)+`
)}`}),sl=!1),u&&u.workerModuleData&&(u=u.workerModuleData),u});function c(){for(var u=[],h=arguments.length;h--;)u[h]=arguments[h];if(!ym())return s.apply(void 0,u);if(!l){l=Df(r,"registerModule",c.workerModuleData);var f=function(){l=null,ys[r].delete(f)};(ys[r]||(ys[r]=new Set)).add(f)}return l.then(function(d){var g=d.isCallable;if(g)return Df(r,"callModule",{id:a,args:u});throw new Error("Worker module function was called but `init` did not return a callable function")})}return c.workerModuleData={isWorkerModule:!0,id:a,name:o,dependencies:e,init:Ua(t),getTransferables:i&&Ua(i)},c.onMainThread=s,c}function ZT(n){ys[n]&&ys[n].forEach(function(e){e()}),xs[n]&&(xs[n].terminate(),delete xs[n])}function Ua(n){var e=n.toString();return!/^function/.test(e)&&/^\w+\s*\(/.test(e)&&(e="function "+e),e}function $T(n){var e=xs[n];if(!e){var t=Ua(XT);e=xs[n]=new Worker(URL.createObjectURL(new Blob(["/** Worker Module Bootstrap: "+n.replace(/\*/g,"")+` **/

;(`+t+")()"],{type:"application/javascript"}))),e.onmessage=function(i){var r=i.data,s=r.messageId,a=yc[s];if(!a)throw new Error("WorkerModule response with empty or unknown messageId");delete yc[s],a(r)}}return e}function Df(n,e,t){return new Promise(function(i,r){var s=++KT;yc[s]=function(a){a.success?i(a.result):r(new Error("Error in worker "+e+" call: "+a.error))},$T(n).postMessage({messageId:s,action:e,data:t})})}function Sm(){var n=(function(e){function t(W,Y,N,V,ee,z,j,ne){var J=1-j;ne.x=J*J*W+2*J*j*N+j*j*ee,ne.y=J*J*Y+2*J*j*V+j*j*z}function i(W,Y,N,V,ee,z,j,ne,J,re){var me=1-J;re.x=me*me*me*W+3*me*me*J*N+3*me*J*J*ee+J*J*J*j,re.y=me*me*me*Y+3*me*me*J*V+3*me*J*J*z+J*J*J*ne}function r(W,Y){for(var N=/([MLQCZ])([^MLQCZ]*)/g,V,ee,z,j,ne;V=N.exec(W);){var J=V[2].replace(/^\s*|\s*$/g,"").split(/[,\s]+/).map(function(re){return parseFloat(re)});switch(V[1]){case"M":j=ee=J[0],ne=z=J[1];break;case"L":(J[0]!==j||J[1]!==ne)&&Y("L",j,ne,j=J[0],ne=J[1]);break;case"Q":{Y("Q",j,ne,j=J[2],ne=J[3],J[0],J[1]);break}case"C":{Y("C",j,ne,j=J[4],ne=J[5],J[0],J[1],J[2],J[3]);break}case"Z":(j!==ee||ne!==z)&&Y("L",j,ne,ee,z);break}}}function s(W,Y,N){N===void 0&&(N=16);var V={x:0,y:0};r(W,function(ee,z,j,ne,J,re,me,Se,xe){switch(ee){case"L":Y(z,j,ne,J);break;case"Q":{for(var he=z,Ie=j,B=1;B<N;B++)t(z,j,re,me,ne,J,B/(N-1),V),Y(he,Ie,V.x,V.y),he=V.x,Ie=V.y;break}case"C":{for(var Pe=z,be=j,Ee=1;Ee<N;Ee++)i(z,j,re,me,Se,xe,ne,J,Ee/(N-1),V),Y(Pe,be,V.x,V.y),Pe=V.x,be=V.y;break}}})}var a="precision highp float;attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}",o="precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){gl_FragColor=texture2D(tex,vUV);}",l=new WeakMap,c={premultipliedAlpha:!1,preserveDrawingBuffer:!0,antialias:!1,depth:!1};function u(W,Y){var N=W.getContext?W.getContext("webgl",c):W,V=l.get(N);if(!V){let me=function(Pe){var be=z[Pe];if(!be&&(be=z[Pe]=N.getExtension(Pe),!be))throw new Error(Pe+" not supported");return be},Se=function(Pe,be){var Ee=N.createShader(be);return N.shaderSource(Ee,Pe),N.compileShader(Ee),Ee},xe=function(Pe,be,Ee,se){if(!j[Pe]){var Ae={},de={},C=N.createProgram();N.attachShader(C,Se(be,N.VERTEX_SHADER)),N.attachShader(C,Se(Ee,N.FRAGMENT_SHADER)),N.linkProgram(C),j[Pe]={program:C,transaction:function(U){N.useProgram(C),U({setUniform:function(X,Z){for(var ue=[],le=arguments.length-2;le-- >0;)ue[le]=arguments[le+2];var fe=de[Z]||(de[Z]=N.getUniformLocation(C,Z));N["uniform"+X].apply(N,[fe].concat(ue))},setAttribute:function(X,Z,ue,le,fe){var De=Ae[X];De||(De=Ae[X]={buf:N.createBuffer(),loc:N.getAttribLocation(C,X),data:null}),N.bindBuffer(N.ARRAY_BUFFER,De.buf),N.vertexAttribPointer(De.loc,Z,N.FLOAT,!1,0,0),N.enableVertexAttribArray(De.loc),ee?N.vertexAttribDivisor(De.loc,le):me("ANGLE_instanced_arrays").vertexAttribDivisorANGLE(De.loc,le),fe!==De.data&&(N.bufferData(N.ARRAY_BUFFER,fe,ue),De.data=fe)}})}}}j[Pe].transaction(se)},he=function(Pe,be){J++;try{N.activeTexture(N.TEXTURE0+J);var Ee=ne[Pe];Ee||(Ee=ne[Pe]=N.createTexture(),N.bindTexture(N.TEXTURE_2D,Ee),N.texParameteri(N.TEXTURE_2D,N.TEXTURE_MIN_FILTER,N.NEAREST),N.texParameteri(N.TEXTURE_2D,N.TEXTURE_MAG_FILTER,N.NEAREST)),N.bindTexture(N.TEXTURE_2D,Ee),be(Ee,J)}finally{J--}},Ie=function(Pe,be,Ee){var se=N.createFramebuffer();re.push(se),N.bindFramebuffer(N.FRAMEBUFFER,se),N.activeTexture(N.TEXTURE0+be),N.bindTexture(N.TEXTURE_2D,Pe),N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Pe,0);try{Ee(se)}finally{N.deleteFramebuffer(se),N.bindFramebuffer(N.FRAMEBUFFER,re[--re.length-1]||null)}},B=function(){z={},j={},ne={},J=-1,re.length=0};var ee=typeof WebGL2RenderingContext<"u"&&N instanceof WebGL2RenderingContext,z={},j={},ne={},J=-1,re=[];N.canvas.addEventListener("webglcontextlost",function(Pe){B(),Pe.preventDefault()},!1),l.set(N,V={gl:N,isWebGL2:ee,getExtension:me,withProgram:xe,withTexture:he,withTextureFramebuffer:Ie,handleContextLoss:B})}Y(V)}function h(W,Y,N,V,ee,z,j,ne){j===void 0&&(j=15),ne===void 0&&(ne=null),u(W,function(J){var re=J.gl,me=J.withProgram,Se=J.withTexture;Se("copy",function(xe,he){re.texImage2D(re.TEXTURE_2D,0,re.RGBA,ee,z,0,re.RGBA,re.UNSIGNED_BYTE,Y),me("copy",a,o,function(Ie){var B=Ie.setUniform,Pe=Ie.setAttribute;Pe("aUV",2,re.STATIC_DRAW,0,new Float32Array([0,0,2,0,0,2])),B("1i","image",he),re.bindFramebuffer(re.FRAMEBUFFER,ne||null),re.disable(re.BLEND),re.colorMask(j&8,j&4,j&2,j&1),re.viewport(N,V,ee,z),re.scissor(N,V,ee,z),re.drawArrays(re.TRIANGLES,0,3)})})})}function f(W,Y,N){var V=W.width,ee=W.height;u(W,function(z){var j=z.gl,ne=new Uint8Array(V*ee*4);j.readPixels(0,0,V,ee,j.RGBA,j.UNSIGNED_BYTE,ne),W.width=Y,W.height=N,h(j,ne,0,0,V,ee)})}var d=Object.freeze({__proto__:null,withWebGLContext:u,renderImageData:h,resizeWebGLCanvasWithoutClearing:f});function g(W,Y,N,V,ee,z){z===void 0&&(z=1);var j=new Uint8Array(W*Y),ne=V[2]-V[0],J=V[3]-V[1],re=[];s(N,function(Pe,be,Ee,se){re.push({x1:Pe,y1:be,x2:Ee,y2:se,minX:Math.min(Pe,Ee),minY:Math.min(be,se),maxX:Math.max(Pe,Ee),maxY:Math.max(be,se)})}),re.sort(function(Pe,be){return Pe.maxX-be.maxX});for(var me=0;me<W;me++)for(var Se=0;Se<Y;Se++){var xe=Ie(V[0]+ne*(me+.5)/W,V[1]+J*(Se+.5)/Y),he=Math.pow(1-Math.abs(xe)/ee,z)/2;xe<0&&(he=1-he),he=Math.max(0,Math.min(255,Math.round(he*255))),j[Se*W+me]=he}return j;function Ie(Pe,be){for(var Ee=1/0,se=1/0,Ae=re.length;Ae--;){var de=re[Ae];if(de.maxX+se<=Pe)break;if(Pe+se>de.minX&&be-se<de.maxY&&be+se>de.minY){var C=p(Pe,be,de.x1,de.y1,de.x2,de.y2);C<Ee&&(Ee=C,se=Math.sqrt(Ee))}}return B(Pe,be)&&(se=-se),se}function B(Pe,be){for(var Ee=0,se=re.length;se--;){var Ae=re[se];if(Ae.maxX<=Pe)break;var de=Ae.y1>be!=Ae.y2>be&&Pe<(Ae.x2-Ae.x1)*(be-Ae.y1)/(Ae.y2-Ae.y1)+Ae.x1;de&&(Ee+=Ae.y1<Ae.y2?1:-1)}return Ee!==0}}function v(W,Y,N,V,ee,z,j,ne,J,re){z===void 0&&(z=1),ne===void 0&&(ne=0),J===void 0&&(J=0),re===void 0&&(re=0),m(W,Y,N,V,ee,z,j,null,ne,J,re)}function m(W,Y,N,V,ee,z,j,ne,J,re,me){z===void 0&&(z=1),J===void 0&&(J=0),re===void 0&&(re=0),me===void 0&&(me=0);for(var Se=g(W,Y,N,V,ee,z),xe=new Uint8Array(Se.length*4),he=0;he<Se.length;he++)xe[he*4+me]=Se[he];h(j,xe,J,re,W,Y,1<<3-me,ne)}function p(W,Y,N,V,ee,z){var j=ee-N,ne=z-V,J=j*j+ne*ne,re=J?Math.max(0,Math.min(1,((W-N)*j+(Y-V)*ne)/J)):0,me=W-(N+re*j),Se=Y-(V+re*ne);return me*me+Se*Se}var y=Object.freeze({__proto__:null,generate:g,generateIntoCanvas:v,generateIntoFramebuffer:m}),x="precision highp float;uniform vec4 uGlyphBounds;attribute vec2 aUV;attribute vec4 aLineSegment;varying vec4 vLineSegment;varying vec2 vGlyphXY;void main(){vLineSegment=aLineSegment;vGlyphXY=mix(uGlyphBounds.xy,uGlyphBounds.zw,aUV);gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}",_="precision highp float;uniform vec4 uGlyphBounds;uniform float uMaxDistance;uniform float uExponent;varying vec4 vLineSegment;varying vec2 vGlyphXY;float absDistToSegment(vec2 point,vec2 lineA,vec2 lineB){vec2 lineDir=lineB-lineA;float lenSq=dot(lineDir,lineDir);float t=lenSq==0.0 ? 0.0 : clamp(dot(point-lineA,lineDir)/lenSq,0.0,1.0);vec2 linePt=lineA+t*lineDir;return distance(point,linePt);}void main(){vec4 seg=vLineSegment;vec2 p=vGlyphXY;float dist=absDistToSegment(p,seg.xy,seg.zw);float val=pow(1.0-clamp(dist/uMaxDistance,0.0,1.0),uExponent)*0.5;bool crossing=(seg.y>p.y!=seg.w>p.y)&&(p.x<(seg.z-seg.x)*(p.y-seg.y)/(seg.w-seg.y)+seg.x);bool crossingUp=crossing&&vLineSegment.y<vLineSegment.w;gl_FragColor=vec4(crossingUp ? 1.0/255.0 : 0.0,crossing&&!crossingUp ? 1.0/255.0 : 0.0,0.0,val);}",S="precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){vec4 color=texture2D(tex,vUV);bool inside=color.r!=color.g;float val=inside ? 1.0-color.a : color.a;gl_FragColor=vec4(val);}",T=new Float32Array([0,0,2,0,0,2]),E=null,A=!1,M={},b=new WeakMap;function L(W){if(!A&&!K(W))throw new Error("WebGL generation not supported")}function P(W,Y,N,V,ee,z,j){if(z===void 0&&(z=1),j===void 0&&(j=null),!j&&(j=E,!j)){var ne=typeof OffscreenCanvas=="function"?new OffscreenCanvas(1,1):typeof document<"u"?document.createElement("canvas"):null;if(!ne)throw new Error("OffscreenCanvas or DOM canvas not supported");j=E=ne.getContext("webgl",{depth:!1})}L(j);var J=new Uint8Array(W*Y*4);u(j,function(xe){var he=xe.gl,Ie=xe.withTexture,B=xe.withTextureFramebuffer;Ie("readable",function(Pe,be){he.texImage2D(he.TEXTURE_2D,0,he.RGBA,W,Y,0,he.RGBA,he.UNSIGNED_BYTE,null),B(Pe,be,function(Ee){F(W,Y,N,V,ee,z,he,Ee,0,0,0),he.readPixels(0,0,W,Y,he.RGBA,he.UNSIGNED_BYTE,J)})})});for(var re=new Uint8Array(W*Y),me=0,Se=0;me<J.length;me+=4)re[Se++]=J[me];return re}function I(W,Y,N,V,ee,z,j,ne,J,re){z===void 0&&(z=1),ne===void 0&&(ne=0),J===void 0&&(J=0),re===void 0&&(re=0),F(W,Y,N,V,ee,z,j,null,ne,J,re)}function F(W,Y,N,V,ee,z,j,ne,J,re,me){z===void 0&&(z=1),J===void 0&&(J=0),re===void 0&&(re=0),me===void 0&&(me=0),L(j);var Se=[];s(N,function(xe,he,Ie,B){Se.push(xe,he,Ie,B)}),Se=new Float32Array(Se),u(j,function(xe){var he=xe.gl,Ie=xe.isWebGL2,B=xe.getExtension,Pe=xe.withProgram,be=xe.withTexture,Ee=xe.withTextureFramebuffer,se=xe.handleContextLoss;if(be("rawDistances",function(Ae,de){(W!==Ae._lastWidth||Y!==Ae._lastHeight)&&he.texImage2D(he.TEXTURE_2D,0,he.RGBA,Ae._lastWidth=W,Ae._lastHeight=Y,0,he.RGBA,he.UNSIGNED_BYTE,null),Pe("main",x,_,function(C){var w=C.setAttribute,U=C.setUniform,k=!Ie&&B("ANGLE_instanced_arrays"),X=!Ie&&B("EXT_blend_minmax");w("aUV",2,he.STATIC_DRAW,0,T),w("aLineSegment",4,he.DYNAMIC_DRAW,1,Se),U.apply(void 0,["4f","uGlyphBounds"].concat(V)),U("1f","uMaxDistance",ee),U("1f","uExponent",z),Ee(Ae,de,function(Z){he.enable(he.BLEND),he.colorMask(!0,!0,!0,!0),he.viewport(0,0,W,Y),he.scissor(0,0,W,Y),he.blendFunc(he.ONE,he.ONE),he.blendEquationSeparate(he.FUNC_ADD,Ie?he.MAX:X.MAX_EXT),he.clear(he.COLOR_BUFFER_BIT),Ie?he.drawArraysInstanced(he.TRIANGLES,0,3,Se.length/4):k.drawArraysInstancedANGLE(he.TRIANGLES,0,3,Se.length/4)})}),Pe("post",a,S,function(C){C.setAttribute("aUV",2,he.STATIC_DRAW,0,T),C.setUniform("1i","tex",de),he.bindFramebuffer(he.FRAMEBUFFER,ne),he.disable(he.BLEND),he.colorMask(me===0,me===1,me===2,me===3),he.viewport(J,re,W,Y),he.scissor(J,re,W,Y),he.drawArrays(he.TRIANGLES,0,3)})}),he.isContextLost())throw se(),new Error("webgl context lost")})}function K(W){var Y=!W||W===E?M:W.canvas||W,N=b.get(Y);if(N===void 0){A=!0;var V=null;try{var ee=[97,106,97,61,99,137,118,80,80,118,137,99,61,97,106,97],z=P(4,4,"M8,8L16,8L24,24L16,24Z",[0,0,32,32],24,1,W);N=z&&ee.length===z.length&&z.every(function(j,ne){return j===ee[ne]}),N||(V="bad trial run results",console.info(ee,z))}catch(j){N=!1,V=j.message}V&&console.warn("WebGL SDF generation not supported:",V),A=!1,b.set(Y,N)}return N}var G=Object.freeze({__proto__:null,generate:P,generateIntoCanvas:I,generateIntoFramebuffer:F,isSupported:K});function $(W,Y,N,V,ee,z){ee===void 0&&(ee=Math.max(V[2]-V[0],V[3]-V[1])/2),z===void 0&&(z=1);try{return P.apply(G,arguments)}catch(j){return console.info("WebGL SDF generation failed, falling back to JS",j),g.apply(y,arguments)}}function O(W,Y,N,V,ee,z,j,ne,J,re){ee===void 0&&(ee=Math.max(V[2]-V[0],V[3]-V[1])/2),z===void 0&&(z=1),ne===void 0&&(ne=0),J===void 0&&(J=0),re===void 0&&(re=0);try{return I.apply(G,arguments)}catch(me){return console.info("WebGL SDF generation failed, falling back to JS",me),v.apply(y,arguments)}}return e.forEachPathCommand=r,e.generate=$,e.generateIntoCanvas=O,e.javascript=y,e.pathToLineSegments=s,e.webgl=G,e.webglUtils=d,Object.defineProperty(e,"__esModule",{value:!0}),e})({});return n}function JT(){var n=(function(e){var t={R:"13k,1a,2,3,3,2+1j,ch+16,a+1,5+2,2+n,5,a,4,6+16,4+3,h+1b,4mo,179q,2+9,2+11,2i9+7y,2+68,4,3+4,5+13,4+3,2+4k,3+29,8+cf,1t+7z,w+17,3+3m,1t+3z,16o1+5r,8+30,8+mc,29+1r,29+4v,75+73",EN:"1c+9,3d+1,6,187+9,513,4+5,7+9,sf+j,175h+9,qw+q,161f+1d,4xt+a,25i+9",ES:"17,2,6dp+1,f+1,av,16vr,mx+1,4o,2",ET:"z+2,3h+3,b+1,ym,3e+1,2o,p4+1,8,6u,7c,g6,1wc,1n9+4,30+1b,2n,6d,qhx+1,h0m,a+1,49+2,63+1,4+1,6bb+3,12jj",AN:"16o+5,2j+9,2+1,35,ed,1ff2+9,87+u",CS:"18,2+1,b,2u,12k,55v,l,17v0,2,3,53,2+1,b",B:"a,3,f+2,2v,690",S:"9,2,k",WS:"c,k,4f4,1vk+a,u,1j,335",ON:"x+1,4+4,h+5,r+5,r+3,z,5+3,2+1,2+1,5,2+2,3+4,o,w,ci+1,8+d,3+d,6+8,2+g,39+1,9,6+1,2,33,b8,3+1,3c+1,7+1,5r,b,7h+3,sa+5,2,3i+6,jg+3,ur+9,2v,ij+1,9g+9,7+a,8m,4+1,49+x,14u,2+2,c+2,e+2,e+2,e+1,i+n,e+e,2+p,u+2,e+2,36+1,2+3,2+1,b,2+2,6+5,2,2,2,h+1,5+4,6+3,3+f,16+2,5+3l,3+81,1y+p,2+40,q+a,m+13,2r+ch,2+9e,75+hf,3+v,2+2w,6e+5,f+6,75+2a,1a+p,2+2g,d+5x,r+b,6+3,4+o,g,6+1,6+2,2k+1,4,2j,5h+z,1m+1,1e+f,t+2,1f+e,d+3,4o+3,2s+1,w,535+1r,h3l+1i,93+2,2s,b+1,3l+x,2v,4g+3,21+3,kz+1,g5v+1,5a,j+9,n+v,2,3,2+8,2+1,3+2,2,3,46+1,4+4,h+5,r+5,r+a,3h+2,4+6,b+4,78,1r+24,4+c,4,1hb,ey+6,103+j,16j+c,1ux+7,5+g,fsh,jdq+1t,4,57+2e,p1,1m,1m,1m,1m,4kt+1,7j+17,5+2r,d+e,3+e,2+e,2+10,m+4,w,1n+5,1q,4z+5,4b+rb,9+c,4+c,4+37,d+2g,8+b,l+b,5+1j,9+9,7+13,9+t,3+1,27+3c,2+29,2+3q,d+d,3+4,4+2,6+6,a+o,8+6,a+2,e+6,16+42,2+1i",BN:"0+8,6+d,2s+5,2+p,e,4m9,1kt+2,2b+5,5+5,17q9+v,7k,6p+8,6+1,119d+3,440+7,96s+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+75,6p+2rz,1ben+1,1ekf+1,1ekf+1",NSM:"lc+33,7o+6,7c+18,2,2+1,2+1,2,21+a,1d+k,h,2u+6,3+5,3+1,2+3,10,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,g+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+g,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,k1+w,2db+2,3y,2p+v,ff+3,30+1,n9x+3,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,r2,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+5,3+1,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2d+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,f0c+4,1o+6,t5,1s+3,2a,f5l+1,43t+2,i+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,gzhy+6n",AL:"16w,3,2,e+1b,z+2,2+2s,g+1,8+1,b+m,2+t,s+2i,c+e,4h+f,1d+1e,1bwe+dp,3+3z,x+c,2+1,35+3y,2rm+z,5+7,b+5,dt+l,c+u,17nl+27,1t+27,4x+6n,3+d",LRO:"6ct",RLO:"6cu",LRE:"6cq",RLE:"6cr",PDF:"6cs",LRI:"6ee",RLI:"6ef",FSI:"6eg",PDI:"6eh"},i={},r={};i.L=1,r[1]="L",Object.keys(t).forEach(function(se,Ae){i[se]=1<<Ae+1,r[i[se]]=se}),Object.freeze(i);var s=i.LRI|i.RLI|i.FSI,a=i.L|i.R|i.AL,o=i.B|i.S|i.WS|i.ON|i.FSI|i.LRI|i.RLI|i.PDI,l=i.BN|i.RLE|i.LRE|i.RLO|i.LRO|i.PDF,c=i.S|i.WS|i.B|s|i.PDI|l,u=null;function h(){if(!u){u=new Map;var se=function(de){if(t.hasOwnProperty(de)){var C=0;t[de].split(",").forEach(function(w){var U=w.split("+"),k=U[0],X=U[1];k=parseInt(k,36),X=X?parseInt(X,36):0,u.set(C+=k,i[de]);for(var Z=0;Z<X;Z++)u.set(++C,i[de])})}};for(var Ae in t)se(Ae)}}function f(se){return h(),u.get(se.codePointAt(0))||i.L}function d(se){return r[f(se)]}var g={pairs:"14>1,1e>2,u>2,2wt>1,1>1,1ge>1,1wp>1,1j>1,f>1,hm>1,1>1,u>1,u6>1,1>1,+5,28>1,w>1,1>1,+3,b8>1,1>1,+3,1>3,-1>-1,3>1,1>1,+2,1s>1,1>1,x>1,th>1,1>1,+2,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,4q>1,1e>2,u>2,2>1,+1",canonical:"6f1>-6dx,6dy>-6dx,6ec>-6ed,6ee>-6ed,6ww>2jj,-2ji>2jj,14r4>-1e7l,1e7m>-1e7l,1e7m>-1e5c,1e5d>-1e5b,1e5c>-14qx,14qy>-14qx,14vn>-1ecg,1ech>-1ecg,1edu>-1ecg,1eci>-1ecg,1eda>-1ecg,1eci>-1ecg,1eci>-168q,168r>-168q,168s>-14ye,14yf>-14ye"};function v(se,Ae){var de=36,C=0,w=new Map,U=Ae&&new Map,k;return se.split(",").forEach(function X(Z){if(Z.indexOf("+")!==-1)for(var ue=+Z;ue--;)X(k);else{k=Z;var le=Z.split(">"),fe=le[0],De=le[1];fe=String.fromCodePoint(C+=parseInt(fe,de)),De=String.fromCodePoint(C+=parseInt(De,de)),w.set(fe,De),Ae&&U.set(De,fe)}}),{map:w,reverseMap:U}}var m,p,y;function x(){if(!m){var se=v(g.pairs,!0),Ae=se.map,de=se.reverseMap;m=Ae,p=de,y=v(g.canonical,!1).map}}function _(se){return x(),m.get(se)||null}function S(se){return x(),p.get(se)||null}function T(se){return x(),y.get(se)||null}var E=i.L,A=i.R,M=i.EN,b=i.ES,L=i.ET,P=i.AN,I=i.CS,F=i.B,K=i.S,G=i.ON,$=i.BN,O=i.NSM,W=i.AL,Y=i.LRO,N=i.RLO,V=i.LRE,ee=i.RLE,z=i.PDF,j=i.LRI,ne=i.RLI,J=i.FSI,re=i.PDI;function me(se,Ae){for(var de=125,C=new Uint32Array(se.length),w=0;w<se.length;w++)C[w]=f(se[w]);var U=new Map;function k(Qt,wn){var en=C[Qt];C[Qt]=wn,U.set(en,U.get(en)-1),en&o&&U.set(o,U.get(o)-1),U.set(wn,(U.get(wn)||0)+1),wn&o&&U.set(o,(U.get(o)||0)+1)}for(var X=new Uint8Array(se.length),Z=new Map,ue=[],le=null,fe=0;fe<se.length;fe++)le||ue.push(le={start:fe,end:se.length-1,level:Ae==="rtl"?1:Ae==="ltr"?0:eh(fe,!1)}),C[fe]&F&&(le.end=fe,le=null);for(var De=ee|V|N|Y|s|re|z|F,ve=function(Qt){return Qt+(Qt&1?1:2)},we=function(Qt){return Qt+(Qt&1?2:1)},Ce=0;Ce<ue.length;Ce++){le=ue[Ce];var Re=[{_level:le.level,_override:0,_isolate:0}],ge=void 0,Ve=0,ke=0,$e=0;U.clear();for(var q=le.start;q<=le.end;q++){var pe=C[q];if(ge=Re[Re.length-1],U.set(pe,(U.get(pe)||0)+1),pe&o&&U.set(o,(U.get(o)||0)+1),pe&De)if(pe&(ee|V)){X[q]=ge._level;var ie=(pe===ee?we:ve)(ge._level);ie<=de&&!Ve&&!ke?Re.push({_level:ie,_override:0,_isolate:0}):Ve||ke++}else if(pe&(N|Y)){X[q]=ge._level;var _e=(pe===N?we:ve)(ge._level);_e<=de&&!Ve&&!ke?Re.push({_level:_e,_override:pe&N?A:E,_isolate:0}):Ve||ke++}else if(pe&s){pe&J&&(pe=eh(q+1,!0)===1?ne:j),X[q]=ge._level,ge._override&&k(q,ge._override);var Me=(pe===ne?we:ve)(ge._level);Me<=de&&Ve===0&&ke===0?($e++,Re.push({_level:Me,_override:0,_isolate:1,_isolInitIndex:q})):Ve++}else if(pe&re){if(Ve>0)Ve--;else if($e>0){for(ke=0;!Re[Re.length-1]._isolate;)Re.pop();var ye=Re[Re.length-1]._isolInitIndex;ye!=null&&(Z.set(ye,q),Z.set(q,ye)),Re.pop(),$e--}ge=Re[Re.length-1],X[q]=ge._level,ge._override&&k(q,ge._override)}else pe&z?(Ve===0&&(ke>0?ke--:!ge._isolate&&Re.length>1&&(Re.pop(),ge=Re[Re.length-1])),X[q]=ge._level):pe&F&&(X[q]=le.level);else X[q]=ge._level,ge._override&&pe!==$&&k(q,ge._override)}for(var Be=[],qe=null,ze=le.start;ze<=le.end;ze++){var He=C[ze];if(!(He&l)){var lt=X[ze],ht=He&s,_t=He===re;qe&&lt===qe._level?(qe._end=ze,qe._endsWithIsolInit=ht):Be.push(qe={_start:ze,_end:ze,_level:lt,_startsWithPDI:_t,_endsWithIsolInit:ht})}}for(var Zt=[],Ot=0;Ot<Be.length;Ot++){var ln=Be[Ot];if(!ln._startsWithPDI||ln._startsWithPDI&&!Z.has(ln._start)){for(var Tn=[qe=ln],In=void 0;qe&&qe._endsWithIsolInit&&(In=Z.get(qe._end))!=null;)for(var $t=Ot+1;$t<Be.length;$t++)if(Be[$t]._start===In){Tn.push(qe=Be[$t]);break}for(var At=[],pn=0;pn<Tn.length;pn++)for(var jr=Tn[pn],Ji=jr._start;Ji<=jr._end;Ji++)At.push(Ji);for(var po=X[At[0]],Gs=le.level,Qi=At[0]-1;Qi>=0;Qi--)if(!(C[Qi]&l)){Gs=X[Qi];break}var Xr=At[At.length-1],mo=X[Xr],R=le.level;if(!(C[Xr]&s)){for(var Q=Xr+1;Q<=le.end;Q++)if(!(C[Q]&l)){R=X[Q];break}}Zt.push({_seqIndices:At,_sosType:Math.max(Gs,po)%2?A:E,_eosType:Math.max(R,mo)%2?A:E})}}for(var oe=0;oe<Zt.length;oe++){var ce=Zt[oe],H=ce._seqIndices,Te=ce._sosType,Ue=ce._eosType,Ne=X[H[0]]&1?A:E;if(U.get(O))for(var Oe=0;Oe<H.length;Oe++){var Xe=H[Oe];if(C[Xe]&O){for(var Ye=Te,Ge=Oe-1;Ge>=0;Ge--)if(!(C[H[Ge]]&l)){Ye=C[H[Ge]];break}k(Xe,Ye&(s|re)?G:Ye)}}if(U.get(M))for(var Qe=0;Qe<H.length;Qe++){var rt=H[Qe];if(C[rt]&M)for(var ft=Qe-1;ft>=-1;ft--){var dt=ft===-1?Te:C[H[ft]];if(dt&a){dt===W&&k(rt,P);break}}}if(U.get(W))for(var tt=0;tt<H.length;tt++){var We=H[tt];C[We]&W&&k(We,A)}if(U.get(b)||U.get(I))for(var mt=1;mt<H.length-1;mt++){var it=H[mt];if(C[it]&(b|I)){for(var Ct=0,Fn=0,Pt=mt-1;Pt>=0&&(Ct=C[H[Pt]],!!(Ct&l));Pt--);for(var Gn=mt+1;Gn<H.length&&(Fn=C[H[Gn]],!!(Fn&l));Gn++);Ct===Fn&&(C[it]===b?Ct===M:Ct&(M|P))&&k(it,Ct)}}if(U.get(M))for(var nt=0;nt<H.length;nt++){var Jt=H[nt];if(C[Jt]&M){for(var Dt=nt-1;Dt>=0&&C[H[Dt]]&(L|l);Dt--)k(H[Dt],M);for(nt++;nt<H.length&&C[H[nt]]&(L|l|M);nt++)C[H[nt]]!==M&&k(H[nt],M)}}if(U.get(L)||U.get(b)||U.get(I))for(var yt=0;yt<H.length;yt++){var Lt=H[yt];if(C[Lt]&(L|b|I)){k(Lt,G);for(var oi=yt-1;oi>=0&&C[H[oi]]&l;oi--)k(H[oi],G);for(var mn=yt+1;mn<H.length&&C[H[mn]]&l;mn++)k(H[mn],G)}}if(U.get(M))for(var go=0,Gu=Te;go<H.length;go++){var Hu=H[go],vo=C[Hu];vo&M?Gu===E&&k(Hu,E):vo&a&&(Gu=vo)}if(U.get(o)){var Yr=A|M|P,Wu=Yr|E,Hs=[];{for(var er=[],tr=0;tr<H.length;tr++)if(C[H[tr]]&o){var qr=se[H[tr]],ju=void 0;if(_(qr)!==null)if(er.length<63)er.push({char:qr,seqIndex:tr});else break;else if((ju=S(qr))!==null)for(var Kr=er.length-1;Kr>=0;Kr--){var _o=er[Kr].char;if(_o===ju||_o===S(T(qr))||_(T(_o))===qr){Hs.push([er[Kr].seqIndex,tr]),er.length=Kr;break}}}Hs.sort(function(Qt,wn){return Qt[0]-wn[0]})}for(var xo=0;xo<Hs.length;xo++){for(var Xu=Hs[xo],Ws=Xu[0],yo=Xu[1],Yu=!1,En=0,So=Ws+1;So<yo;So++){var qu=H[So];if(C[qu]&Wu){Yu=!0;var Ku=C[qu]&Yr?A:E;if(Ku===Ne){En=Ku;break}}}if(Yu&&!En){En=Te;for(var bo=Ws-1;bo>=0;bo--){var Zu=H[bo];if(C[Zu]&Wu){var $u=C[Zu]&Yr?A:E;$u!==Ne?En=$u:En=Ne;break}}}if(En){if(C[H[Ws]]=C[H[yo]]=En,En!==Ne){for(var Zr=Ws+1;Zr<H.length;Zr++)if(!(C[H[Zr]]&l)){f(se[H[Zr]])&O&&(C[H[Zr]]=En);break}}if(En!==Ne){for(var $r=yo+1;$r<H.length;$r++)if(!(C[H[$r]]&l)){f(se[H[$r]])&O&&(C[H[$r]]=En);break}}}}for(var li=0;li<H.length;li++)if(C[H[li]]&o){for(var Ju=li,Mo=li,To=Te,Jr=li-1;Jr>=0;Jr--)if(C[H[Jr]]&l)Ju=Jr;else{To=C[H[Jr]]&Yr?A:E;break}for(var Qu=Ue,Qr=li+1;Qr<H.length;Qr++)if(C[H[Qr]]&(o|l))Mo=Qr;else{Qu=C[H[Qr]]&Yr?A:E;break}for(var Eo=Ju;Eo<=Mo;Eo++)C[H[Eo]]=To===Qu?To:Ne;li=Mo}}}for(var cn=le.start;cn<=le.end;cn++){var mv=X[cn],js=C[cn];if(mv&1?js&(E|M|P)&&X[cn]++:js&A?X[cn]++:js&(P|M)&&(X[cn]+=2),js&l&&(X[cn]=cn===0?le.level:X[cn-1]),cn===le.end||f(se[cn])&(K|F))for(var Xs=cn;Xs>=0&&f(se[Xs])&c;Xs--)X[Xs]=le.level}}return{levels:X,paragraphs:ue};function eh(Qt,wn){for(var en=Qt;en<se.length;en++){var ci=C[en];if(ci&(A|W))return 1;if(ci&(F|E)||wn&&ci===re)return 0;if(ci&s){var th=gv(en);en=th===-1?se.length:th}}return 0}function gv(Qt){for(var wn=1,en=Qt+1;en<se.length;en++){var ci=C[en];if(ci&F)break;if(ci&re){if(--wn===0)return en}else ci&s&&wn++}return-1}}var Se="14>1,j>2,t>2,u>2,1a>g,2v3>1,1>1,1ge>1,1wd>1,b>1,1j>1,f>1,ai>3,-2>3,+1,8>1k0,-1jq>1y7,-1y6>1hf,-1he>1h6,-1h5>1ha,-1h8>1qi,-1pu>1,6>3u,-3s>7,6>1,1>1,f>1,1>1,+2,3>1,1>1,+13,4>1,1>1,6>1eo,-1ee>1,3>1mg,-1me>1mk,-1mj>1mi,-1mg>1mi,-1md>1,1>1,+2,1>10k,-103>1,1>1,4>1,5>1,1>1,+10,3>1,1>8,-7>8,+1,-6>7,+1,a>1,1>1,u>1,u6>1,1>1,+5,26>1,1>1,2>1,2>2,8>1,7>1,4>1,1>1,+5,b8>1,1>1,+3,1>3,-2>1,2>1,1>1,+2,c>1,3>1,1>1,+2,h>1,3>1,a>1,1>1,2>1,3>1,1>1,d>1,f>1,3>1,1a>1,1>1,6>1,7>1,13>1,k>1,1>1,+19,4>1,1>1,+2,2>1,1>1,+18,m>1,a>1,1>1,lk>1,1>1,4>1,2>1,f>1,3>1,1>1,+3,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,6>1,4j>1,j>2,t>2,u>2,2>1,+1",xe;function he(){if(!xe){var se=v(Se,!0),Ae=se.map,de=se.reverseMap;de.forEach(function(C,w){Ae.set(w,C)}),xe=Ae}}function Ie(se){return he(),xe.get(se)||null}function B(se,Ae,de,C){var w=se.length;de=Math.max(0,de==null?0:+de),C=Math.min(w-1,C==null?w-1:+C);for(var U=new Map,k=de;k<=C;k++)if(Ae[k]&1){var X=Ie(se[k]);X!==null&&U.set(k,X)}return U}function Pe(se,Ae,de,C){var w=se.length;de=Math.max(0,de==null?0:+de),C=Math.min(w-1,C==null?w-1:+C);var U=[];return Ae.paragraphs.forEach(function(k){var X=Math.max(de,k.start),Z=Math.min(C,k.end);if(X<Z){for(var ue=Ae.levels.slice(X,Z+1),le=Z;le>=X&&f(se[le])&c;le--)ue[le]=k.level;for(var fe=k.level,De=1/0,ve=0;ve<ue.length;ve++){var we=ue[ve];we>fe&&(fe=we),we<De&&(De=we|1)}for(var Ce=fe;Ce>=De;Ce--)for(var Re=0;Re<ue.length;Re++)if(ue[Re]>=Ce){for(var ge=Re;Re+1<ue.length&&ue[Re+1]>=Ce;)Re++;Re>ge&&U.push([ge+X,Re+X])}}}),U}function be(se,Ae,de,C){var w=Ee(se,Ae,de,C),U=[].concat(se);return w.forEach(function(k,X){U[X]=(Ae.levels[k]&1?Ie(se[k]):null)||se[k]}),U.join("")}function Ee(se,Ae,de,C){for(var w=Pe(se,Ae,de,C),U=[],k=0;k<se.length;k++)U[k]=k;return w.forEach(function(X){for(var Z=X[0],ue=X[1],le=U.slice(Z,ue+1),fe=le.length;fe--;)U[ue-fe]=le[fe]}),U}return e.closingToOpeningBracket=S,e.getBidiCharType=f,e.getBidiCharTypeName=d,e.getCanonicalBracket=T,e.getEmbeddingLevels=me,e.getMirroredCharacter=Ie,e.getMirroredCharactersMap=B,e.getReorderSegments=Pe,e.getReorderedIndices=Ee,e.getReorderedString=be,e.openingToClosingBracket=_,Object.defineProperty(e,"__esModule",{value:!0}),e})({});return n}const bm=/\bvoid\s+main\s*\(\s*\)\s*{/g;function Sc(n){const e=/^[ \t]*#include +<([\w\d./]+)>/gm;function t(i,r){let s=Je[r];return s?Sc(s):i}return n.replace(e,t)}const Ut=[];for(let n=0;n<256;n++)Ut[n]=(n<16?"0":"")+n.toString(16);function QT(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Ut[n&255]+Ut[n>>8&255]+Ut[n>>16&255]+Ut[n>>24&255]+"-"+Ut[e&255]+Ut[e>>8&255]+"-"+Ut[e>>16&15|64]+Ut[e>>24&255]+"-"+Ut[t&63|128]+Ut[t>>8&255]+"-"+Ut[t>>16&255]+Ut[t>>24&255]+Ut[i&255]+Ut[i>>8&255]+Ut[i>>16&255]+Ut[i>>24&255]).toUpperCase()}const Ui=Object.assign||function(){let n=arguments[0];for(let e=1,t=arguments.length;e<t;e++){let i=arguments[e];if(i)for(let r in i)Object.prototype.hasOwnProperty.call(i,r)&&(n[r]=i[r])}return n},eE=Date.now(),Lf=new WeakMap,Uf=new Map;let tE=1e10;function bc(n,e){const t=sE(e);let i=Lf.get(n);if(i||Lf.set(n,i=Object.create(null)),i[t])return new i[t];const r=`_onBeforeCompile${t}`,s=function(c,u){n.onBeforeCompile.call(this,c,u);const h=this.customProgramCacheKey()+"|"+c.vertexShader+"|"+c.fragmentShader;let f=Uf[h];if(!f){const d=nE(this,c,e,t);f=Uf[h]=d}c.vertexShader=f.vertexShader,c.fragmentShader=f.fragmentShader,Ui(c.uniforms,this.uniforms),e.timeUniform&&(c.uniforms[e.timeUniform]={get value(){return Date.now()-eE}}),this[r]&&this[r](c)},a=function(){return o(e.chained?n:n.clone())},o=function(c){const u=Object.create(c,l);return Object.defineProperty(u,"baseMaterial",{value:n}),Object.defineProperty(u,"id",{value:tE++}),u.uuid=QT(),u.uniforms=Ui({},c.uniforms,e.uniforms),u.defines=Ui({},c.defines,e.defines),u.defines[`TROIKA_DERIVED_MATERIAL_${t}`]="",u.extensions=Ui({},c.extensions,e.extensions),u._listeners=void 0,u},l={constructor:{value:a},isDerivedMaterial:{value:!0},type:{get:()=>n.type,set:c=>{n.type=c}},isDerivedFrom:{writable:!0,configurable:!0,value:function(c){const u=this.baseMaterial;return c===u||u.isDerivedMaterial&&u.isDerivedFrom(c)||!1}},customProgramCacheKey:{writable:!0,configurable:!0,value:function(){return n.customProgramCacheKey()+"|"+t}},onBeforeCompile:{get(){return s},set(c){this[r]=c}},copy:{writable:!0,configurable:!0,value:function(c){return n.copy.call(this,c),!n.isShaderMaterial&&!n.isDerivedMaterial&&(Ui(this.extensions,c.extensions),Ui(this.defines,c.defines),Ui(this.uniforms,ws.clone(c.uniforms))),this}},clone:{writable:!0,configurable:!0,value:function(){const c=new n.constructor;return o(c).copy(this)}},getDepthMaterial:{writable:!0,configurable:!0,value:function(){let c=this._depthMaterial;return c||(c=this._depthMaterial=bc(n.isDerivedMaterial?n.getDepthMaterial():new $p({depthPacking:Op}),e),c.defines.IS_DEPTH_MATERIAL="",c.uniforms=this.uniforms),c}},getDistanceMaterial:{writable:!0,configurable:!0,value:function(){let c=this._distanceMaterial;return c||(c=this._distanceMaterial=bc(n.isDerivedMaterial?n.getDistanceMaterial():new Jp,e),c.defines.IS_DISTANCE_MATERIAL="",c.uniforms=this.uniforms),c}},dispose:{writable:!0,configurable:!0,value(){const{_depthMaterial:c,_distanceMaterial:u}=this;c&&c.dispose(),u&&u.dispose(),n.dispose.call(this)}}};return i[t]=a,new a}function nE(n,{vertexShader:e,fragmentShader:t},i,r){let{vertexDefs:s,vertexMainIntro:a,vertexMainOutro:o,vertexTransform:l,fragmentDefs:c,fragmentMainIntro:u,fragmentMainOutro:h,fragmentColorTransform:f,customRewriter:d,timeUniform:g}=i;if(s=s||"",a=a||"",o=o||"",c=c||"",u=u||"",h=h||"",(l||d)&&(e=Sc(e)),(f||d)&&(t=t.replace(/^[ \t]*#include <((?:tonemapping|encodings|colorspace|fog|premultiplied_alpha|dithering)_fragment)>/gm,`
//!BEGIN_POST_CHUNK $1
$&
//!END_POST_CHUNK
`),t=Sc(t)),d){let v=d({vertexShader:e,fragmentShader:t});e=v.vertexShader,t=v.fragmentShader}if(f){let v=[];t=t.replace(/^\/\/!BEGIN_POST_CHUNK[^]+?^\/\/!END_POST_CHUNK/gm,m=>(v.push(m),"")),h=`${f}
${v.join(`
`)}
${h}`}if(g){const v=`
uniform float ${g};
`;s=v+s,c=v+c}return l&&(e=`vec3 troika_position_${r};
vec3 troika_normal_${r};
vec2 troika_uv_${r};
${e}
`,s=`${s}
void troikaVertexTransform${r}(inout vec3 position, inout vec3 normal, inout vec2 uv) {
  ${l}
}
`,a=`
troika_position_${r} = vec3(position);
troika_normal_${r} = vec3(normal);
troika_uv_${r} = vec2(uv);
troikaVertexTransform${r}(troika_position_${r}, troika_normal_${r}, troika_uv_${r});
${a}
`,e=e.replace(/\b(position|normal|uv)\b/g,(v,m,p,y)=>/\battribute\s+vec[23]\s+$/.test(y.substr(0,p))?m:`troika_${m}_${r}`),n.map&&n.map.channel>0||(e=e.replace(/\bMAP_UV\b/g,`troika_uv_${r}`))),e=Nf(e,r,s,a,o),t=Nf(t,r,c,u,h),{vertexShader:e,fragmentShader:t}}function Nf(n,e,t,i,r){return(i||r||t)&&(n=n.replace(bm,`
${t}
void troikaOrigMain${e}() {`),n+=`
void main() {
  ${i}
  troikaOrigMain${e}();
  ${r}
}`),n}function iE(n,e){return n==="uniforms"?void 0:typeof e=="function"?e.toString():e}let rE=0;const If=new Map;function sE(n){const e=JSON.stringify(n,iE);let t=If.get(e);return t==null&&If.set(e,t=++rE),t}/*!
Custom build of Typr.ts (https://github.com/fredli74/Typr.ts) for use in Troika text rendering.
Original MIT license applies: https://github.com/fredli74/Typr.ts/blob/master/LICENSE
*/function aE(){return typeof window>"u"&&(self.window=self),(function(n){var e={parse:function(r){var s=e._bin,a=new Uint8Array(r);if(s.readASCII(a,0,4)=="ttcf"){var o=4;s.readUshort(a,o),o+=2,s.readUshort(a,o),o+=2;var l=s.readUint(a,o);o+=4;for(var c=[],u=0;u<l;u++){var h=s.readUint(a,o);o+=4,c.push(e._readFont(a,h))}return c}return[e._readFont(a,0)]},_readFont:function(r,s){var a=e._bin,o=s;a.readFixed(r,s),s+=4;var l=a.readUshort(r,s);s+=2,a.readUshort(r,s),s+=2,a.readUshort(r,s),s+=2,a.readUshort(r,s),s+=2;for(var c=["cmap","head","hhea","maxp","hmtx","name","OS/2","post","loca","glyf","kern","CFF ","GDEF","GPOS","GSUB","SVG "],u={_data:r,_offset:o},h={},f=0;f<l;f++){var d=a.readASCII(r,s,4);s+=4,a.readUint(r,s),s+=4;var g=a.readUint(r,s);s+=4;var v=a.readUint(r,s);s+=4,h[d]={offset:g,length:v}}for(f=0;f<c.length;f++){var m=c[f];h[m]&&(u[m.trim()]=e[m.trim()].parse(r,h[m].offset,h[m].length,u))}return u},_tabOffset:function(r,s,a){for(var o=e._bin,l=o.readUshort(r,a+4),c=a+12,u=0;u<l;u++){var h=o.readASCII(r,c,4);c+=4,o.readUint(r,c),c+=4;var f=o.readUint(r,c);if(c+=4,o.readUint(r,c),c+=4,h==s)return f}return 0}};e._bin={readFixed:function(r,s){return(r[s]<<8|r[s+1])+(r[s+2]<<8|r[s+3])/65540},readF2dot14:function(r,s){return e._bin.readShort(r,s)/16384},readInt:function(r,s){return e._bin._view(r).getInt32(s)},readInt8:function(r,s){return e._bin._view(r).getInt8(s)},readShort:function(r,s){return e._bin._view(r).getInt16(s)},readUshort:function(r,s){return e._bin._view(r).getUint16(s)},readUshorts:function(r,s,a){for(var o=[],l=0;l<a;l++)o.push(e._bin.readUshort(r,s+2*l));return o},readUint:function(r,s){return e._bin._view(r).getUint32(s)},readUint64:function(r,s){return 4294967296*e._bin.readUint(r,s)+e._bin.readUint(r,s+4)},readASCII:function(r,s,a){for(var o="",l=0;l<a;l++)o+=String.fromCharCode(r[s+l]);return o},readUnicode:function(r,s,a){for(var o="",l=0;l<a;l++){var c=r[s++]<<8|r[s++];o+=String.fromCharCode(c)}return o},_tdec:typeof window<"u"&&window.TextDecoder?new window.TextDecoder:null,readUTF8:function(r,s,a){var o=e._bin._tdec;return o&&s==0&&a==r.length?o.decode(r):e._bin.readASCII(r,s,a)},readBytes:function(r,s,a){for(var o=[],l=0;l<a;l++)o.push(r[s+l]);return o},readASCIIArray:function(r,s,a){for(var o=[],l=0;l<a;l++)o.push(String.fromCharCode(r[s+l]));return o},_view:function(r){return r._dataView||(r._dataView=r.buffer?new DataView(r.buffer,r.byteOffset,r.byteLength):new DataView(new Uint8Array(r).buffer))}},e._lctf={},e._lctf.parse=function(r,s,a,o,l){var c=e._bin,u={},h=s;c.readFixed(r,s),s+=4;var f=c.readUshort(r,s);s+=2;var d=c.readUshort(r,s);s+=2;var g=c.readUshort(r,s);return s+=2,u.scriptList=e._lctf.readScriptList(r,h+f),u.featureList=e._lctf.readFeatureList(r,h+d),u.lookupList=e._lctf.readLookupList(r,h+g,l),u},e._lctf.readLookupList=function(r,s,a){var o=e._bin,l=s,c=[],u=o.readUshort(r,s);s+=2;for(var h=0;h<u;h++){var f=o.readUshort(r,s);s+=2;var d=e._lctf.readLookupTable(r,l+f,a);c.push(d)}return c},e._lctf.readLookupTable=function(r,s,a){var o=e._bin,l=s,c={tabs:[]};c.ltype=o.readUshort(r,s),s+=2,c.flag=o.readUshort(r,s),s+=2;var u=o.readUshort(r,s);s+=2;for(var h=c.ltype,f=0;f<u;f++){var d=o.readUshort(r,s);s+=2;var g=a(r,h,l+d,c);c.tabs.push(g)}return c},e._lctf.numOfOnes=function(r){for(var s=0,a=0;a<32;a++)(r>>>a&1)!=0&&s++;return s},e._lctf.readClassDef=function(r,s){var a=e._bin,o=[],l=a.readUshort(r,s);if(s+=2,l==1){var c=a.readUshort(r,s);s+=2;var u=a.readUshort(r,s);s+=2;for(var h=0;h<u;h++)o.push(c+h),o.push(c+h),o.push(a.readUshort(r,s)),s+=2}if(l==2){var f=a.readUshort(r,s);for(s+=2,h=0;h<f;h++)o.push(a.readUshort(r,s)),s+=2,o.push(a.readUshort(r,s)),s+=2,o.push(a.readUshort(r,s)),s+=2}return o},e._lctf.getInterval=function(r,s){for(var a=0;a<r.length;a+=3){var o=r[a],l=r[a+1];if(r[a+2],o<=s&&s<=l)return a}return-1},e._lctf.readCoverage=function(r,s){var a=e._bin,o={};o.fmt=a.readUshort(r,s),s+=2;var l=a.readUshort(r,s);return s+=2,o.fmt==1&&(o.tab=a.readUshorts(r,s,l)),o.fmt==2&&(o.tab=a.readUshorts(r,s,3*l)),o},e._lctf.coverageIndex=function(r,s){var a=r.tab;if(r.fmt==1)return a.indexOf(s);if(r.fmt==2){var o=e._lctf.getInterval(a,s);if(o!=-1)return a[o+2]+(s-a[o])}return-1},e._lctf.readFeatureList=function(r,s){var a=e._bin,o=s,l=[],c=a.readUshort(r,s);s+=2;for(var u=0;u<c;u++){var h=a.readASCII(r,s,4);s+=4;var f=a.readUshort(r,s);s+=2;var d=e._lctf.readFeatureTable(r,o+f);d.tag=h.trim(),l.push(d)}return l},e._lctf.readFeatureTable=function(r,s){var a=e._bin,o=s,l={},c=a.readUshort(r,s);s+=2,c>0&&(l.featureParams=o+c);var u=a.readUshort(r,s);s+=2,l.tab=[];for(var h=0;h<u;h++)l.tab.push(a.readUshort(r,s+2*h));return l},e._lctf.readScriptList=function(r,s){var a=e._bin,o=s,l={},c=a.readUshort(r,s);s+=2;for(var u=0;u<c;u++){var h=a.readASCII(r,s,4);s+=4;var f=a.readUshort(r,s);s+=2,l[h.trim()]=e._lctf.readScriptTable(r,o+f)}return l},e._lctf.readScriptTable=function(r,s){var a=e._bin,o=s,l={},c=a.readUshort(r,s);s+=2,c>0&&(l.default=e._lctf.readLangSysTable(r,o+c));var u=a.readUshort(r,s);s+=2;for(var h=0;h<u;h++){var f=a.readASCII(r,s,4);s+=4;var d=a.readUshort(r,s);s+=2,l[f.trim()]=e._lctf.readLangSysTable(r,o+d)}return l},e._lctf.readLangSysTable=function(r,s){var a=e._bin,o={};a.readUshort(r,s),s+=2,o.reqFeature=a.readUshort(r,s),s+=2;var l=a.readUshort(r,s);return s+=2,o.features=a.readUshorts(r,s,l),o},e.CFF={},e.CFF.parse=function(r,s,a){var o=e._bin;(r=new Uint8Array(r.buffer,s,a))[s=0],r[++s],r[++s],r[++s],s++;var l=[];s=e.CFF.readIndex(r,s,l);for(var c=[],u=0;u<l.length-1;u++)c.push(o.readASCII(r,s+l[u],l[u+1]-l[u]));s+=l[l.length-1];var h=[];s=e.CFF.readIndex(r,s,h);var f=[];for(u=0;u<h.length-1;u++)f.push(e.CFF.readDict(r,s+h[u],s+h[u+1]));s+=h[h.length-1];var d=f[0],g=[];s=e.CFF.readIndex(r,s,g);var v=[];for(u=0;u<g.length-1;u++)v.push(o.readASCII(r,s+g[u],g[u+1]-g[u]));if(s+=g[g.length-1],e.CFF.readSubrs(r,s,d),d.CharStrings){s=d.CharStrings,g=[],s=e.CFF.readIndex(r,s,g);var m=[];for(u=0;u<g.length-1;u++)m.push(o.readBytes(r,s+g[u],g[u+1]-g[u]));d.CharStrings=m}if(d.ROS){s=d.FDArray;var p=[];for(s=e.CFF.readIndex(r,s,p),d.FDArray=[],u=0;u<p.length-1;u++){var y=e.CFF.readDict(r,s+p[u],s+p[u+1]);e.CFF._readFDict(r,y,v),d.FDArray.push(y)}s+=p[p.length-1],s=d.FDSelect,d.FDSelect=[];var x=r[s];if(s++,x!=3)throw x;var _=o.readUshort(r,s);for(s+=2,u=0;u<_+1;u++)d.FDSelect.push(o.readUshort(r,s),r[s+2]),s+=3}return d.Encoding&&(d.Encoding=e.CFF.readEncoding(r,d.Encoding,d.CharStrings.length)),d.charset&&(d.charset=e.CFF.readCharset(r,d.charset,d.CharStrings.length)),e.CFF._readFDict(r,d,v),d},e.CFF._readFDict=function(r,s,a){var o;for(var l in s.Private&&(o=s.Private[1],s.Private=e.CFF.readDict(r,o,o+s.Private[0]),s.Private.Subrs&&e.CFF.readSubrs(r,o+s.Private.Subrs,s.Private)),s)["FamilyName","FontName","FullName","Notice","version","Copyright"].indexOf(l)!=-1&&(s[l]=a[s[l]-426+35])},e.CFF.readSubrs=function(r,s,a){var o=e._bin,l=[];s=e.CFF.readIndex(r,s,l);var c,u=l.length;c=u<1240?107:u<33900?1131:32768,a.Bias=c,a.Subrs=[];for(var h=0;h<l.length-1;h++)a.Subrs.push(o.readBytes(r,s+l[h],l[h+1]-l[h]))},e.CFF.tableSE=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,0,111,112,113,114,0,115,116,117,118,119,120,121,122,0,123,0,124,125,126,127,128,129,130,131,0,132,133,0,134,135,136,137,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,138,0,139,0,0,0,0,140,141,142,143,0,0,0,0,0,144,0,0,0,145,0,0,146,147,148,149,0,0,0,0],e.CFF.glyphByUnicode=function(r,s){for(var a=0;a<r.charset.length;a++)if(r.charset[a]==s)return a;return-1},e.CFF.glyphBySE=function(r,s){return s<0||s>255?-1:e.CFF.glyphByUnicode(r,e.CFF.tableSE[s])},e.CFF.readEncoding=function(r,s,a){e._bin;var o=[".notdef"],l=r[s];if(s++,l!=0)throw"error: unknown encoding format: "+l;var c=r[s];s++;for(var u=0;u<c;u++)o.push(r[s+u]);return o},e.CFF.readCharset=function(r,s,a){var o=e._bin,l=[".notdef"],c=r[s];if(s++,c==0)for(var u=0;u<a;u++){var h=o.readUshort(r,s);s+=2,l.push(h)}else{if(c!=1&&c!=2)throw"error: format: "+c;for(;l.length<a;){h=o.readUshort(r,s),s+=2;var f=0;for(c==1?(f=r[s],s++):(f=o.readUshort(r,s),s+=2),u=0;u<=f;u++)l.push(h),h++}}return l},e.CFF.readIndex=function(r,s,a){var o=e._bin,l=o.readUshort(r,s)+1,c=r[s+=2];if(s++,c==1)for(var u=0;u<l;u++)a.push(r[s+u]);else if(c==2)for(u=0;u<l;u++)a.push(o.readUshort(r,s+2*u));else if(c==3)for(u=0;u<l;u++)a.push(16777215&o.readUint(r,s+3*u-1));else if(l!=1)throw"unsupported offset size: "+c+", count: "+l;return(s+=l*c)-1},e.CFF.getCharString=function(r,s,a){var o=e._bin,l=r[s],c=r[s+1];r[s+2],r[s+3],r[s+4];var u=1,h=null,f=null;l<=20&&(h=l,u=1),l==12&&(h=100*l+c,u=2),21<=l&&l<=27&&(h=l,u=1),l==28&&(f=o.readShort(r,s+1),u=3),29<=l&&l<=31&&(h=l,u=1),32<=l&&l<=246&&(f=l-139,u=1),247<=l&&l<=250&&(f=256*(l-247)+c+108,u=2),251<=l&&l<=254&&(f=256*-(l-251)-c-108,u=2),l==255&&(f=o.readInt(r,s+1)/65535,u=5),a.val=f??"o"+h,a.size=u},e.CFF.readCharString=function(r,s,a){for(var o=s+a,l=e._bin,c=[];s<o;){var u=r[s],h=r[s+1];r[s+2],r[s+3],r[s+4];var f=1,d=null,g=null;u<=20&&(d=u,f=1),u==12&&(d=100*u+h,f=2),u!=19&&u!=20||(d=u,f=2),21<=u&&u<=27&&(d=u,f=1),u==28&&(g=l.readShort(r,s+1),f=3),29<=u&&u<=31&&(d=u,f=1),32<=u&&u<=246&&(g=u-139,f=1),247<=u&&u<=250&&(g=256*(u-247)+h+108,f=2),251<=u&&u<=254&&(g=256*-(u-251)-h-108,f=2),u==255&&(g=l.readInt(r,s+1)/65535,f=5),c.push(g??"o"+d),s+=f}return c},e.CFF.readDict=function(r,s,a){for(var o=e._bin,l={},c=[];s<a;){var u=r[s],h=r[s+1];r[s+2],r[s+3],r[s+4];var f=1,d=null,g=null;if(u==28&&(g=o.readShort(r,s+1),f=3),u==29&&(g=o.readInt(r,s+1),f=5),32<=u&&u<=246&&(g=u-139,f=1),247<=u&&u<=250&&(g=256*(u-247)+h+108,f=2),251<=u&&u<=254&&(g=256*-(u-251)-h-108,f=2),u==255)throw g=o.readInt(r,s+1)/65535,f=5,"unknown number";if(u==30){var v=[];for(f=1;;){var m=r[s+f];f++;var p=m>>4,y=15&m;if(p!=15&&v.push(p),y!=15&&v.push(y),y==15)break}for(var x="",_=[0,1,2,3,4,5,6,7,8,9,".","e","e-","reserved","-","endOfNumber"],S=0;S<v.length;S++)x+=_[v[S]];g=parseFloat(x)}u<=21&&(d=["version","Notice","FullName","FamilyName","Weight","FontBBox","BlueValues","OtherBlues","FamilyBlues","FamilyOtherBlues","StdHW","StdVW","escape","UniqueID","XUID","charset","Encoding","CharStrings","Private","Subrs","defaultWidthX","nominalWidthX"][u],f=1,u==12&&(d=["Copyright","isFixedPitch","ItalicAngle","UnderlinePosition","UnderlineThickness","PaintType","CharstringType","FontMatrix","StrokeWidth","BlueScale","BlueShift","BlueFuzz","StemSnapH","StemSnapV","ForceBold",0,0,"LanguageGroup","ExpansionFactor","initialRandomSeed","SyntheticBase","PostScript","BaseFontName","BaseFontBlend",0,0,0,0,0,0,"ROS","CIDFontVersion","CIDFontRevision","CIDFontType","CIDCount","UIDBase","FDArray","FDSelect","FontName"][h],f=2)),d!=null?(l[d]=c.length==1?c[0]:c,c=[]):c.push(g),s+=f}return l},e.cmap={},e.cmap.parse=function(r,s,a){r=new Uint8Array(r.buffer,s,a),s=0;var o=e._bin,l={};o.readUshort(r,s),s+=2;var c=o.readUshort(r,s);s+=2;var u=[];l.tables=[];for(var h=0;h<c;h++){var f=o.readUshort(r,s);s+=2;var d=o.readUshort(r,s);s+=2;var g=o.readUint(r,s);s+=4;var v="p"+f+"e"+d,m=u.indexOf(g);if(m==-1){var p;m=l.tables.length,u.push(g);var y=o.readUshort(r,g);y==0?p=e.cmap.parse0(r,g):y==4?p=e.cmap.parse4(r,g):y==6?p=e.cmap.parse6(r,g):y==12?p=e.cmap.parse12(r,g):console.debug("unknown format: "+y,f,d,g),l.tables.push(p)}if(l[v]!=null)throw"multiple tables for one platform+encoding";l[v]=m}return l},e.cmap.parse0=function(r,s){var a=e._bin,o={};o.format=a.readUshort(r,s),s+=2;var l=a.readUshort(r,s);s+=2,a.readUshort(r,s),s+=2,o.map=[];for(var c=0;c<l-6;c++)o.map.push(r[s+c]);return o},e.cmap.parse4=function(r,s){var a=e._bin,o=s,l={};l.format=a.readUshort(r,s),s+=2;var c=a.readUshort(r,s);s+=2,a.readUshort(r,s),s+=2;var u=a.readUshort(r,s);s+=2;var h=u/2;l.searchRange=a.readUshort(r,s),s+=2,l.entrySelector=a.readUshort(r,s),s+=2,l.rangeShift=a.readUshort(r,s),s+=2,l.endCount=a.readUshorts(r,s,h),s+=2*h,s+=2,l.startCount=a.readUshorts(r,s,h),s+=2*h,l.idDelta=[];for(var f=0;f<h;f++)l.idDelta.push(a.readShort(r,s)),s+=2;for(l.idRangeOffset=a.readUshorts(r,s,h),s+=2*h,l.glyphIdArray=[];s<o+c;)l.glyphIdArray.push(a.readUshort(r,s)),s+=2;return l},e.cmap.parse6=function(r,s){var a=e._bin,o={};o.format=a.readUshort(r,s),s+=2,a.readUshort(r,s),s+=2,a.readUshort(r,s),s+=2,o.firstCode=a.readUshort(r,s),s+=2;var l=a.readUshort(r,s);s+=2,o.glyphIdArray=[];for(var c=0;c<l;c++)o.glyphIdArray.push(a.readUshort(r,s)),s+=2;return o},e.cmap.parse12=function(r,s){var a=e._bin,o={};o.format=a.readUshort(r,s),s+=2,s+=2,a.readUint(r,s),s+=4,a.readUint(r,s),s+=4;var l=a.readUint(r,s);s+=4,o.groups=[];for(var c=0;c<l;c++){var u=s+12*c,h=a.readUint(r,u+0),f=a.readUint(r,u+4),d=a.readUint(r,u+8);o.groups.push([h,f,d])}return o},e.glyf={},e.glyf.parse=function(r,s,a,o){for(var l=[],c=0;c<o.maxp.numGlyphs;c++)l.push(null);return l},e.glyf._parseGlyf=function(r,s){var a=e._bin,o=r._data,l=e._tabOffset(o,"glyf",r._offset)+r.loca[s];if(r.loca[s]==r.loca[s+1])return null;var c={};if(c.noc=a.readShort(o,l),l+=2,c.xMin=a.readShort(o,l),l+=2,c.yMin=a.readShort(o,l),l+=2,c.xMax=a.readShort(o,l),l+=2,c.yMax=a.readShort(o,l),l+=2,c.xMin>=c.xMax||c.yMin>=c.yMax)return null;if(c.noc>0){c.endPts=[];for(var u=0;u<c.noc;u++)c.endPts.push(a.readUshort(o,l)),l+=2;var h=a.readUshort(o,l);if(l+=2,o.length-l<h)return null;c.instructions=a.readBytes(o,l,h),l+=h;var f=c.endPts[c.noc-1]+1;for(c.flags=[],u=0;u<f;u++){var d=o[l];if(l++,c.flags.push(d),(8&d)!=0){var g=o[l];l++;for(var v=0;v<g;v++)c.flags.push(d),u++}}for(c.xs=[],u=0;u<f;u++){var m=(2&c.flags[u])!=0,p=(16&c.flags[u])!=0;m?(c.xs.push(p?o[l]:-o[l]),l++):p?c.xs.push(0):(c.xs.push(a.readShort(o,l)),l+=2)}for(c.ys=[],u=0;u<f;u++)m=(4&c.flags[u])!=0,p=(32&c.flags[u])!=0,m?(c.ys.push(p?o[l]:-o[l]),l++):p?c.ys.push(0):(c.ys.push(a.readShort(o,l)),l+=2);var y=0,x=0;for(u=0;u<f;u++)y+=c.xs[u],x+=c.ys[u],c.xs[u]=y,c.ys[u]=x}else{var _;c.parts=[];do{_=a.readUshort(o,l),l+=2;var S={m:{a:1,b:0,c:0,d:1,tx:0,ty:0},p1:-1,p2:-1};if(c.parts.push(S),S.glyphIndex=a.readUshort(o,l),l+=2,1&_){var T=a.readShort(o,l);l+=2;var E=a.readShort(o,l);l+=2}else T=a.readInt8(o,l),l++,E=a.readInt8(o,l),l++;2&_?(S.m.tx=T,S.m.ty=E):(S.p1=T,S.p2=E),8&_?(S.m.a=S.m.d=a.readF2dot14(o,l),l+=2):64&_?(S.m.a=a.readF2dot14(o,l),l+=2,S.m.d=a.readF2dot14(o,l),l+=2):128&_&&(S.m.a=a.readF2dot14(o,l),l+=2,S.m.b=a.readF2dot14(o,l),l+=2,S.m.c=a.readF2dot14(o,l),l+=2,S.m.d=a.readF2dot14(o,l),l+=2)}while(32&_);if(256&_){var A=a.readUshort(o,l);for(l+=2,c.instr=[],u=0;u<A;u++)c.instr.push(o[l]),l++}}return c},e.GDEF={},e.GDEF.parse=function(r,s,a,o){var l=s;s+=4;var c=e._bin.readUshort(r,s);return{glyphClassDef:c===0?null:e._lctf.readClassDef(r,l+c)}},e.GPOS={},e.GPOS.parse=function(r,s,a,o){return e._lctf.parse(r,s,a,o,e.GPOS.subt)},e.GPOS.subt=function(r,s,a,o){var l=e._bin,c=a,u={};if(u.fmt=l.readUshort(r,a),a+=2,s==1||s==2||s==3||s==7||s==8&&u.fmt<=2){var h=l.readUshort(r,a);a+=2,u.coverage=e._lctf.readCoverage(r,h+c)}if(s==1&&u.fmt==1){var f=l.readUshort(r,a);a+=2,f!=0&&(u.pos=e.GPOS.readValueRecord(r,a,f))}else if(s==2&&u.fmt>=1&&u.fmt<=2){f=l.readUshort(r,a),a+=2;var d=l.readUshort(r,a);a+=2;var g=e._lctf.numOfOnes(f),v=e._lctf.numOfOnes(d);if(u.fmt==1){u.pairsets=[];var m=l.readUshort(r,a);a+=2;for(var p=0;p<m;p++){var y=c+l.readUshort(r,a);a+=2;var x=l.readUshort(r,y);y+=2;for(var _=[],S=0;S<x;S++){var T=l.readUshort(r,y);y+=2,f!=0&&(P=e.GPOS.readValueRecord(r,y,f),y+=2*g),d!=0&&(I=e.GPOS.readValueRecord(r,y,d),y+=2*v),_.push({gid2:T,val1:P,val2:I})}u.pairsets.push(_)}}if(u.fmt==2){var E=l.readUshort(r,a);a+=2;var A=l.readUshort(r,a);a+=2;var M=l.readUshort(r,a);a+=2;var b=l.readUshort(r,a);for(a+=2,u.classDef1=e._lctf.readClassDef(r,c+E),u.classDef2=e._lctf.readClassDef(r,c+A),u.matrix=[],p=0;p<M;p++){var L=[];for(S=0;S<b;S++){var P=null,I=null;f!=0&&(P=e.GPOS.readValueRecord(r,a,f),a+=2*g),d!=0&&(I=e.GPOS.readValueRecord(r,a,d),a+=2*v),L.push({val1:P,val2:I})}u.matrix.push(L)}}}else if(s==4&&u.fmt==1)u.markCoverage=e._lctf.readCoverage(r,l.readUshort(r,a)+c),u.baseCoverage=e._lctf.readCoverage(r,l.readUshort(r,a+2)+c),u.markClassCount=l.readUshort(r,a+4),u.markArray=e.GPOS.readMarkArray(r,l.readUshort(r,a+6)+c),u.baseArray=e.GPOS.readBaseArray(r,l.readUshort(r,a+8)+c,u.markClassCount);else if(s==6&&u.fmt==1)u.mark1Coverage=e._lctf.readCoverage(r,l.readUshort(r,a)+c),u.mark2Coverage=e._lctf.readCoverage(r,l.readUshort(r,a+2)+c),u.markClassCount=l.readUshort(r,a+4),u.mark1Array=e.GPOS.readMarkArray(r,l.readUshort(r,a+6)+c),u.mark2Array=e.GPOS.readBaseArray(r,l.readUshort(r,a+8)+c,u.markClassCount);else{if(s==9&&u.fmt==1){var F=l.readUshort(r,a);a+=2;var K=l.readUint(r,a);if(a+=4,o.ltype==9)o.ltype=F;else if(o.ltype!=F)throw"invalid extension substitution";return e.GPOS.subt(r,o.ltype,c+K)}console.debug("unsupported GPOS table LookupType",s,"format",u.fmt)}return u},e.GPOS.readValueRecord=function(r,s,a){var o=e._bin,l=[];return l.push(1&a?o.readShort(r,s):0),s+=1&a?2:0,l.push(2&a?o.readShort(r,s):0),s+=2&a?2:0,l.push(4&a?o.readShort(r,s):0),s+=4&a?2:0,l.push(8&a?o.readShort(r,s):0),s+=8&a?2:0,l},e.GPOS.readBaseArray=function(r,s,a){var o=e._bin,l=[],c=s,u=o.readUshort(r,s);s+=2;for(var h=0;h<u;h++){for(var f=[],d=0;d<a;d++)f.push(e.GPOS.readAnchorRecord(r,c+o.readUshort(r,s))),s+=2;l.push(f)}return l},e.GPOS.readMarkArray=function(r,s){var a=e._bin,o=[],l=s,c=a.readUshort(r,s);s+=2;for(var u=0;u<c;u++){var h=e.GPOS.readAnchorRecord(r,a.readUshort(r,s+2)+l);h.markClass=a.readUshort(r,s),o.push(h),s+=4}return o},e.GPOS.readAnchorRecord=function(r,s){var a=e._bin,o={};return o.fmt=a.readUshort(r,s),o.x=a.readShort(r,s+2),o.y=a.readShort(r,s+4),o},e.GSUB={},e.GSUB.parse=function(r,s,a,o){return e._lctf.parse(r,s,a,o,e.GSUB.subt)},e.GSUB.subt=function(r,s,a,o){var l=e._bin,c=a,u={};if(u.fmt=l.readUshort(r,a),a+=2,s!=1&&s!=2&&s!=4&&s!=5&&s!=6)return null;if(s==1||s==2||s==4||s==5&&u.fmt<=2||s==6&&u.fmt<=2){var h=l.readUshort(r,a);a+=2,u.coverage=e._lctf.readCoverage(r,c+h)}if(s==1&&u.fmt>=1&&u.fmt<=2){if(u.fmt==1)u.delta=l.readShort(r,a),a+=2;else if(u.fmt==2){var f=l.readUshort(r,a);a+=2,u.newg=l.readUshorts(r,a,f),a+=2*u.newg.length}}else if(s==2&&u.fmt==1){f=l.readUshort(r,a),a+=2,u.seqs=[];for(var d=0;d<f;d++){var g=l.readUshort(r,a)+c;a+=2;var v=l.readUshort(r,g);u.seqs.push(l.readUshorts(r,g+2,v))}}else if(s==4)for(u.vals=[],f=l.readUshort(r,a),a+=2,d=0;d<f;d++){var m=l.readUshort(r,a);a+=2,u.vals.push(e.GSUB.readLigatureSet(r,c+m))}else if(s==5&&u.fmt==2){if(u.fmt==2){var p=l.readUshort(r,a);a+=2,u.cDef=e._lctf.readClassDef(r,c+p),u.scset=[];var y=l.readUshort(r,a);for(a+=2,d=0;d<y;d++){var x=l.readUshort(r,a);a+=2,u.scset.push(x==0?null:e.GSUB.readSubClassSet(r,c+x))}}}else if(s==6&&u.fmt==3){if(u.fmt==3){for(d=0;d<3;d++){f=l.readUshort(r,a),a+=2;for(var _=[],S=0;S<f;S++)_.push(e._lctf.readCoverage(r,c+l.readUshort(r,a+2*S)));a+=2*f,d==0&&(u.backCvg=_),d==1&&(u.inptCvg=_),d==2&&(u.ahedCvg=_)}f=l.readUshort(r,a),a+=2,u.lookupRec=e.GSUB.readSubstLookupRecords(r,a,f)}}else{if(s==7&&u.fmt==1){var T=l.readUshort(r,a);a+=2;var E=l.readUint(r,a);if(a+=4,o.ltype==9)o.ltype=T;else if(o.ltype!=T)throw"invalid extension substitution";return e.GSUB.subt(r,o.ltype,c+E)}console.debug("unsupported GSUB table LookupType",s,"format",u.fmt)}return u},e.GSUB.readSubClassSet=function(r,s){var a=e._bin.readUshort,o=s,l=[],c=a(r,s);s+=2;for(var u=0;u<c;u++){var h=a(r,s);s+=2,l.push(e.GSUB.readSubClassRule(r,o+h))}return l},e.GSUB.readSubClassRule=function(r,s){var a=e._bin.readUshort,o={},l=a(r,s),c=a(r,s+=2);s+=2,o.input=[];for(var u=0;u<l-1;u++)o.input.push(a(r,s)),s+=2;return o.substLookupRecords=e.GSUB.readSubstLookupRecords(r,s,c),o},e.GSUB.readSubstLookupRecords=function(r,s,a){for(var o=e._bin.readUshort,l=[],c=0;c<a;c++)l.push(o(r,s),o(r,s+2)),s+=4;return l},e.GSUB.readChainSubClassSet=function(r,s){var a=e._bin,o=s,l=[],c=a.readUshort(r,s);s+=2;for(var u=0;u<c;u++){var h=a.readUshort(r,s);s+=2,l.push(e.GSUB.readChainSubClassRule(r,o+h))}return l},e.GSUB.readChainSubClassRule=function(r,s){for(var a=e._bin,o={},l=["backtrack","input","lookahead"],c=0;c<l.length;c++){var u=a.readUshort(r,s);s+=2,c==1&&u--,o[l[c]]=a.readUshorts(r,s,u),s+=2*o[l[c]].length}return u=a.readUshort(r,s),s+=2,o.subst=a.readUshorts(r,s,2*u),s+=2*o.subst.length,o},e.GSUB.readLigatureSet=function(r,s){var a=e._bin,o=s,l=[],c=a.readUshort(r,s);s+=2;for(var u=0;u<c;u++){var h=a.readUshort(r,s);s+=2,l.push(e.GSUB.readLigature(r,o+h))}return l},e.GSUB.readLigature=function(r,s){var a=e._bin,o={chain:[]};o.nglyph=a.readUshort(r,s),s+=2;var l=a.readUshort(r,s);s+=2;for(var c=0;c<l-1;c++)o.chain.push(a.readUshort(r,s)),s+=2;return o},e.head={},e.head.parse=function(r,s,a){var o=e._bin,l={};return o.readFixed(r,s),s+=4,l.fontRevision=o.readFixed(r,s),s+=4,o.readUint(r,s),s+=4,o.readUint(r,s),s+=4,l.flags=o.readUshort(r,s),s+=2,l.unitsPerEm=o.readUshort(r,s),s+=2,l.created=o.readUint64(r,s),s+=8,l.modified=o.readUint64(r,s),s+=8,l.xMin=o.readShort(r,s),s+=2,l.yMin=o.readShort(r,s),s+=2,l.xMax=o.readShort(r,s),s+=2,l.yMax=o.readShort(r,s),s+=2,l.macStyle=o.readUshort(r,s),s+=2,l.lowestRecPPEM=o.readUshort(r,s),s+=2,l.fontDirectionHint=o.readShort(r,s),s+=2,l.indexToLocFormat=o.readShort(r,s),s+=2,l.glyphDataFormat=o.readShort(r,s),s+=2,l},e.hhea={},e.hhea.parse=function(r,s,a){var o=e._bin,l={};return o.readFixed(r,s),s+=4,l.ascender=o.readShort(r,s),s+=2,l.descender=o.readShort(r,s),s+=2,l.lineGap=o.readShort(r,s),s+=2,l.advanceWidthMax=o.readUshort(r,s),s+=2,l.minLeftSideBearing=o.readShort(r,s),s+=2,l.minRightSideBearing=o.readShort(r,s),s+=2,l.xMaxExtent=o.readShort(r,s),s+=2,l.caretSlopeRise=o.readShort(r,s),s+=2,l.caretSlopeRun=o.readShort(r,s),s+=2,l.caretOffset=o.readShort(r,s),s+=2,s+=8,l.metricDataFormat=o.readShort(r,s),s+=2,l.numberOfHMetrics=o.readUshort(r,s),s+=2,l},e.hmtx={},e.hmtx.parse=function(r,s,a,o){for(var l=e._bin,c={aWidth:[],lsBearing:[]},u=0,h=0,f=0;f<o.maxp.numGlyphs;f++)f<o.hhea.numberOfHMetrics&&(u=l.readUshort(r,s),s+=2,h=l.readShort(r,s),s+=2),c.aWidth.push(u),c.lsBearing.push(h);return c},e.kern={},e.kern.parse=function(r,s,a,o){var l=e._bin,c=l.readUshort(r,s);if(s+=2,c==1)return e.kern.parseV1(r,s-2,a,o);var u=l.readUshort(r,s);s+=2;for(var h={glyph1:[],rval:[]},f=0;f<u;f++){s+=2,a=l.readUshort(r,s),s+=2;var d=l.readUshort(r,s);s+=2;var g=d>>>8;if((g&=15)!=0)throw"unknown kern table format: "+g;s=e.kern.readFormat0(r,s,h)}return h},e.kern.parseV1=function(r,s,a,o){var l=e._bin;l.readFixed(r,s),s+=4;var c=l.readUint(r,s);s+=4;for(var u={glyph1:[],rval:[]},h=0;h<c;h++){l.readUint(r,s),s+=4;var f=l.readUshort(r,s);s+=2,l.readUshort(r,s),s+=2;var d=f>>>8;if((d&=15)!=0)throw"unknown kern table format: "+d;s=e.kern.readFormat0(r,s,u)}return u},e.kern.readFormat0=function(r,s,a){var o=e._bin,l=-1,c=o.readUshort(r,s);s+=2,o.readUshort(r,s),s+=2,o.readUshort(r,s),s+=2,o.readUshort(r,s),s+=2;for(var u=0;u<c;u++){var h=o.readUshort(r,s);s+=2;var f=o.readUshort(r,s);s+=2;var d=o.readShort(r,s);s+=2,h!=l&&(a.glyph1.push(h),a.rval.push({glyph2:[],vals:[]}));var g=a.rval[a.rval.length-1];g.glyph2.push(f),g.vals.push(d),l=h}return s},e.loca={},e.loca.parse=function(r,s,a,o){var l=e._bin,c=[],u=o.head.indexToLocFormat,h=o.maxp.numGlyphs+1;if(u==0)for(var f=0;f<h;f++)c.push(l.readUshort(r,s+(f<<1))<<1);if(u==1)for(f=0;f<h;f++)c.push(l.readUint(r,s+(f<<2)));return c},e.maxp={},e.maxp.parse=function(r,s,a){var o=e._bin,l={},c=o.readUint(r,s);return s+=4,l.numGlyphs=o.readUshort(r,s),s+=2,c==65536&&(l.maxPoints=o.readUshort(r,s),s+=2,l.maxContours=o.readUshort(r,s),s+=2,l.maxCompositePoints=o.readUshort(r,s),s+=2,l.maxCompositeContours=o.readUshort(r,s),s+=2,l.maxZones=o.readUshort(r,s),s+=2,l.maxTwilightPoints=o.readUshort(r,s),s+=2,l.maxStorage=o.readUshort(r,s),s+=2,l.maxFunctionDefs=o.readUshort(r,s),s+=2,l.maxInstructionDefs=o.readUshort(r,s),s+=2,l.maxStackElements=o.readUshort(r,s),s+=2,l.maxSizeOfInstructions=o.readUshort(r,s),s+=2,l.maxComponentElements=o.readUshort(r,s),s+=2,l.maxComponentDepth=o.readUshort(r,s),s+=2),l},e.name={},e.name.parse=function(r,s,a){var o=e._bin,l={};o.readUshort(r,s),s+=2;var c=o.readUshort(r,s);s+=2,o.readUshort(r,s);for(var u,h=["copyright","fontFamily","fontSubfamily","ID","fullName","version","postScriptName","trademark","manufacturer","designer","description","urlVendor","urlDesigner","licence","licenceURL","---","typoFamilyName","typoSubfamilyName","compatibleFull","sampleText","postScriptCID","wwsFamilyName","wwsSubfamilyName","lightPalette","darkPalette"],f=s+=2,d=0;d<c;d++){var g=o.readUshort(r,s);s+=2;var v=o.readUshort(r,s);s+=2;var m=o.readUshort(r,s);s+=2;var p=o.readUshort(r,s);s+=2;var y=o.readUshort(r,s);s+=2;var x=o.readUshort(r,s);s+=2;var _,S=h[p],T=f+12*c+x;if(g==0)_=o.readUnicode(r,T,y/2);else if(g==3&&v==0)_=o.readUnicode(r,T,y/2);else if(v==0)_=o.readASCII(r,T,y);else if(v==1)_=o.readUnicode(r,T,y/2);else if(v==3)_=o.readUnicode(r,T,y/2);else{if(g!=1)throw"unknown encoding "+v+", platformID: "+g;_=o.readASCII(r,T,y),console.debug("reading unknown MAC encoding "+v+" as ASCII")}var E="p"+g+","+m.toString(16);l[E]==null&&(l[E]={}),l[E][S!==void 0?S:p]=_,l[E]._lang=m}for(var A in l)if(l[A].postScriptName!=null&&l[A]._lang==1033)return l[A];for(var A in l)if(l[A].postScriptName!=null&&l[A]._lang==0)return l[A];for(var A in l)if(l[A].postScriptName!=null&&l[A]._lang==3084)return l[A];for(var A in l)if(l[A].postScriptName!=null)return l[A];for(var A in l){u=A;break}return console.debug("returning name table with languageID "+l[u]._lang),l[u]},e["OS/2"]={},e["OS/2"].parse=function(r,s,a){var o=e._bin.readUshort(r,s);s+=2;var l={};if(o==0)e["OS/2"].version0(r,s,l);else if(o==1)e["OS/2"].version1(r,s,l);else if(o==2||o==3||o==4)e["OS/2"].version2(r,s,l);else{if(o!=5)throw"unknown OS/2 table version: "+o;e["OS/2"].version5(r,s,l)}return l},e["OS/2"].version0=function(r,s,a){var o=e._bin;return a.xAvgCharWidth=o.readShort(r,s),s+=2,a.usWeightClass=o.readUshort(r,s),s+=2,a.usWidthClass=o.readUshort(r,s),s+=2,a.fsType=o.readUshort(r,s),s+=2,a.ySubscriptXSize=o.readShort(r,s),s+=2,a.ySubscriptYSize=o.readShort(r,s),s+=2,a.ySubscriptXOffset=o.readShort(r,s),s+=2,a.ySubscriptYOffset=o.readShort(r,s),s+=2,a.ySuperscriptXSize=o.readShort(r,s),s+=2,a.ySuperscriptYSize=o.readShort(r,s),s+=2,a.ySuperscriptXOffset=o.readShort(r,s),s+=2,a.ySuperscriptYOffset=o.readShort(r,s),s+=2,a.yStrikeoutSize=o.readShort(r,s),s+=2,a.yStrikeoutPosition=o.readShort(r,s),s+=2,a.sFamilyClass=o.readShort(r,s),s+=2,a.panose=o.readBytes(r,s,10),s+=10,a.ulUnicodeRange1=o.readUint(r,s),s+=4,a.ulUnicodeRange2=o.readUint(r,s),s+=4,a.ulUnicodeRange3=o.readUint(r,s),s+=4,a.ulUnicodeRange4=o.readUint(r,s),s+=4,a.achVendID=[o.readInt8(r,s),o.readInt8(r,s+1),o.readInt8(r,s+2),o.readInt8(r,s+3)],s+=4,a.fsSelection=o.readUshort(r,s),s+=2,a.usFirstCharIndex=o.readUshort(r,s),s+=2,a.usLastCharIndex=o.readUshort(r,s),s+=2,a.sTypoAscender=o.readShort(r,s),s+=2,a.sTypoDescender=o.readShort(r,s),s+=2,a.sTypoLineGap=o.readShort(r,s),s+=2,a.usWinAscent=o.readUshort(r,s),s+=2,a.usWinDescent=o.readUshort(r,s),s+=2},e["OS/2"].version1=function(r,s,a){var o=e._bin;return s=e["OS/2"].version0(r,s,a),a.ulCodePageRange1=o.readUint(r,s),s+=4,a.ulCodePageRange2=o.readUint(r,s),s+=4},e["OS/2"].version2=function(r,s,a){var o=e._bin;return s=e["OS/2"].version1(r,s,a),a.sxHeight=o.readShort(r,s),s+=2,a.sCapHeight=o.readShort(r,s),s+=2,a.usDefault=o.readUshort(r,s),s+=2,a.usBreak=o.readUshort(r,s),s+=2,a.usMaxContext=o.readUshort(r,s),s+=2},e["OS/2"].version5=function(r,s,a){var o=e._bin;return s=e["OS/2"].version2(r,s,a),a.usLowerOpticalPointSize=o.readUshort(r,s),s+=2,a.usUpperOpticalPointSize=o.readUshort(r,s),s+=2},e.post={},e.post.parse=function(r,s,a){var o=e._bin,l={};return l.version=o.readFixed(r,s),s+=4,l.italicAngle=o.readFixed(r,s),s+=4,l.underlinePosition=o.readShort(r,s),s+=2,l.underlineThickness=o.readShort(r,s),s+=2,l},e==null&&(e={}),e.U==null&&(e.U={}),e.U.codeToGlyph=function(r,s){var a=r.cmap,o=-1;if(a.p0e4!=null?o=a.p0e4:a.p3e1!=null?o=a.p3e1:a.p1e0!=null?o=a.p1e0:a.p0e3!=null&&(o=a.p0e3),o==-1)throw"no familiar platform and encoding!";var l=a.tables[o];if(l.format==0)return s>=l.map.length?0:l.map[s];if(l.format==4){for(var c=-1,u=0;u<l.endCount.length;u++)if(s<=l.endCount[u]){c=u;break}return c==-1||l.startCount[c]>s?0:65535&(l.idRangeOffset[c]!=0?l.glyphIdArray[s-l.startCount[c]+(l.idRangeOffset[c]>>1)-(l.idRangeOffset.length-c)]:s+l.idDelta[c])}if(l.format==12){if(s>l.groups[l.groups.length-1][1])return 0;for(u=0;u<l.groups.length;u++){var h=l.groups[u];if(h[0]<=s&&s<=h[1])return h[2]+(s-h[0])}return 0}throw"unknown cmap table format "+l.format},e.U.glyphToPath=function(r,s){var a={cmds:[],crds:[]};if(r.SVG&&r.SVG.entries[s]){var o=r.SVG.entries[s];return o==null?a:(typeof o=="string"&&(o=e.SVG.toPath(o),r.SVG.entries[s]=o),o)}if(r.CFF){var l={x:0,y:0,stack:[],nStems:0,haveWidth:!1,width:r.CFF.Private?r.CFF.Private.defaultWidthX:0,open:!1},c=r.CFF,u=r.CFF.Private;if(c.ROS){for(var h=0;c.FDSelect[h+2]<=s;)h+=2;u=c.FDArray[c.FDSelect[h+1]].Private}e.U._drawCFF(r.CFF.CharStrings[s],l,c,u,a)}else r.glyf&&e.U._drawGlyf(s,r,a);return a},e.U._drawGlyf=function(r,s,a){var o=s.glyf[r];o==null&&(o=s.glyf[r]=e.glyf._parseGlyf(s,r)),o!=null&&(o.noc>-1?e.U._simpleGlyph(o,a):e.U._compoGlyph(o,s,a))},e.U._simpleGlyph=function(r,s){for(var a=0;a<r.noc;a++){for(var o=a==0?0:r.endPts[a-1]+1,l=r.endPts[a],c=o;c<=l;c++){var u=c==o?l:c-1,h=c==l?o:c+1,f=1&r.flags[c],d=1&r.flags[u],g=1&r.flags[h],v=r.xs[c],m=r.ys[c];if(c==o)if(f){if(!d){e.U.P.moveTo(s,v,m);continue}e.U.P.moveTo(s,r.xs[u],r.ys[u])}else d?e.U.P.moveTo(s,r.xs[u],r.ys[u]):e.U.P.moveTo(s,(r.xs[u]+v)/2,(r.ys[u]+m)/2);f?d&&e.U.P.lineTo(s,v,m):g?e.U.P.qcurveTo(s,v,m,r.xs[h],r.ys[h]):e.U.P.qcurveTo(s,v,m,(v+r.xs[h])/2,(m+r.ys[h])/2)}e.U.P.closePath(s)}},e.U._compoGlyph=function(r,s,a){for(var o=0;o<r.parts.length;o++){var l={cmds:[],crds:[]},c=r.parts[o];e.U._drawGlyf(c.glyphIndex,s,l);for(var u=c.m,h=0;h<l.crds.length;h+=2){var f=l.crds[h],d=l.crds[h+1];a.crds.push(f*u.a+d*u.b+u.tx),a.crds.push(f*u.c+d*u.d+u.ty)}for(h=0;h<l.cmds.length;h++)a.cmds.push(l.cmds[h])}},e.U._getGlyphClass=function(r,s){var a=e._lctf.getInterval(s,r);return a==-1?0:s[a+2]},e.U._applySubs=function(r,s,a,o){for(var l=r.length-s-1,c=0;c<a.tabs.length;c++)if(a.tabs[c]!=null){var u,h=a.tabs[c];if(!h.coverage||(u=e._lctf.coverageIndex(h.coverage,r[s]))!=-1){if(a.ltype==1)r[s],h.fmt==1?r[s]=r[s]+h.delta:r[s]=h.newg[u];else if(a.ltype==4)for(var f=h.vals[u],d=0;d<f.length;d++){var g=f[d],v=g.chain.length;if(!(v>l)){for(var m=!0,p=0,y=0;y<v;y++){for(;r[s+p+(1+y)]==-1;)p++;g.chain[y]!=r[s+p+(1+y)]&&(m=!1)}if(m){for(r[s]=g.nglyph,y=0;y<v+p;y++)r[s+y+1]=-1;break}}}else if(a.ltype==5&&h.fmt==2)for(var x=e._lctf.getInterval(h.cDef,r[s]),_=h.cDef[x+2],S=h.scset[_],T=0;T<S.length;T++){var E=S[T],A=E.input;if(!(A.length>l)){for(m=!0,y=0;y<A.length;y++){var M=e._lctf.getInterval(h.cDef,r[s+1+y]);if(x==-1&&h.cDef[M+2]!=A[y]){m=!1;break}}if(m){var b=E.substLookupRecords;for(d=0;d<b.length;d+=2)b[d],b[d+1]}}}else if(a.ltype==6&&h.fmt==3){if(!e.U._glsCovered(r,h.backCvg,s-h.backCvg.length)||!e.U._glsCovered(r,h.inptCvg,s)||!e.U._glsCovered(r,h.ahedCvg,s+h.inptCvg.length))continue;var L=h.lookupRec;for(T=0;T<L.length;T+=2){x=L[T];var P=o[L[T+1]];e.U._applySubs(r,s+x,P,o)}}}}},e.U._glsCovered=function(r,s,a){for(var o=0;o<s.length;o++)if(e._lctf.coverageIndex(s[o],r[a+o])==-1)return!1;return!0},e.U.glyphsToPath=function(r,s,a){for(var o={cmds:[],crds:[]},l=0,c=0;c<s.length;c++){var u=s[c];if(u!=-1){for(var h=c<s.length-1&&s[c+1]!=-1?s[c+1]:0,f=e.U.glyphToPath(r,u),d=0;d<f.crds.length;d+=2)o.crds.push(f.crds[d]+l),o.crds.push(f.crds[d+1]);for(a&&o.cmds.push(a),d=0;d<f.cmds.length;d++)o.cmds.push(f.cmds[d]);a&&o.cmds.push("X"),l+=r.hmtx.aWidth[u],c<s.length-1&&(l+=e.U.getPairAdjustment(r,u,h))}}return o},e.U.P={},e.U.P.moveTo=function(r,s,a){r.cmds.push("M"),r.crds.push(s,a)},e.U.P.lineTo=function(r,s,a){r.cmds.push("L"),r.crds.push(s,a)},e.U.P.curveTo=function(r,s,a,o,l,c,u){r.cmds.push("C"),r.crds.push(s,a,o,l,c,u)},e.U.P.qcurveTo=function(r,s,a,o,l){r.cmds.push("Q"),r.crds.push(s,a,o,l)},e.U.P.closePath=function(r){r.cmds.push("Z")},e.U._drawCFF=function(r,s,a,o,l){for(var c=s.stack,u=s.nStems,h=s.haveWidth,f=s.width,d=s.open,g=0,v=s.x,m=s.y,p=0,y=0,x=0,_=0,S=0,T=0,E=0,A=0,M=0,b=0,L={val:0,size:0};g<r.length;){e.CFF.getCharString(r,g,L);var P=L.val;if(g+=L.size,P=="o1"||P=="o18")c.length%2!=0&&!h&&(f=c.shift()+o.nominalWidthX),u+=c.length>>1,c.length=0,h=!0;else if(P=="o3"||P=="o23")c.length%2!=0&&!h&&(f=c.shift()+o.nominalWidthX),u+=c.length>>1,c.length=0,h=!0;else if(P=="o4")c.length>1&&!h&&(f=c.shift()+o.nominalWidthX,h=!0),d&&e.U.P.closePath(l),m+=c.pop(),e.U.P.moveTo(l,v,m),d=!0;else if(P=="o5")for(;c.length>0;)v+=c.shift(),m+=c.shift(),e.U.P.lineTo(l,v,m);else if(P=="o6"||P=="o7")for(var I=c.length,F=P=="o6",K=0;K<I;K++){var G=c.shift();F?v+=G:m+=G,F=!F,e.U.P.lineTo(l,v,m)}else if(P=="o8"||P=="o24"){I=c.length;for(var $=0;$+6<=I;)p=v+c.shift(),y=m+c.shift(),x=p+c.shift(),_=y+c.shift(),v=x+c.shift(),m=_+c.shift(),e.U.P.curveTo(l,p,y,x,_,v,m),$+=6;P=="o24"&&(v+=c.shift(),m+=c.shift(),e.U.P.lineTo(l,v,m))}else{if(P=="o11")break;if(P=="o1234"||P=="o1235"||P=="o1236"||P=="o1237")P=="o1234"&&(y=m,x=(p=v+c.shift())+c.shift(),b=_=y+c.shift(),T=_,A=m,v=(E=(S=(M=x+c.shift())+c.shift())+c.shift())+c.shift(),e.U.P.curveTo(l,p,y,x,_,M,b),e.U.P.curveTo(l,S,T,E,A,v,m)),P=="o1235"&&(p=v+c.shift(),y=m+c.shift(),x=p+c.shift(),_=y+c.shift(),M=x+c.shift(),b=_+c.shift(),S=M+c.shift(),T=b+c.shift(),E=S+c.shift(),A=T+c.shift(),v=E+c.shift(),m=A+c.shift(),c.shift(),e.U.P.curveTo(l,p,y,x,_,M,b),e.U.P.curveTo(l,S,T,E,A,v,m)),P=="o1236"&&(p=v+c.shift(),y=m+c.shift(),x=p+c.shift(),b=_=y+c.shift(),T=_,E=(S=(M=x+c.shift())+c.shift())+c.shift(),A=T+c.shift(),v=E+c.shift(),e.U.P.curveTo(l,p,y,x,_,M,b),e.U.P.curveTo(l,S,T,E,A,v,m)),P=="o1237"&&(p=v+c.shift(),y=m+c.shift(),x=p+c.shift(),_=y+c.shift(),M=x+c.shift(),b=_+c.shift(),S=M+c.shift(),T=b+c.shift(),E=S+c.shift(),A=T+c.shift(),Math.abs(E-v)>Math.abs(A-m)?v=E+c.shift():m=A+c.shift(),e.U.P.curveTo(l,p,y,x,_,M,b),e.U.P.curveTo(l,S,T,E,A,v,m));else if(P=="o14"){if(c.length>0&&!h&&(f=c.shift()+a.nominalWidthX,h=!0),c.length==4){var O=c.shift(),W=c.shift(),Y=c.shift(),N=c.shift(),V=e.CFF.glyphBySE(a,Y),ee=e.CFF.glyphBySE(a,N);e.U._drawCFF(a.CharStrings[V],s,a,o,l),s.x=O,s.y=W,e.U._drawCFF(a.CharStrings[ee],s,a,o,l)}d&&(e.U.P.closePath(l),d=!1)}else if(P=="o19"||P=="o20")c.length%2!=0&&!h&&(f=c.shift()+o.nominalWidthX),u+=c.length>>1,c.length=0,h=!0,g+=u+7>>3;else if(P=="o21")c.length>2&&!h&&(f=c.shift()+o.nominalWidthX,h=!0),m+=c.pop(),v+=c.pop(),d&&e.U.P.closePath(l),e.U.P.moveTo(l,v,m),d=!0;else if(P=="o22")c.length>1&&!h&&(f=c.shift()+o.nominalWidthX,h=!0),v+=c.pop(),d&&e.U.P.closePath(l),e.U.P.moveTo(l,v,m),d=!0;else if(P=="o25"){for(;c.length>6;)v+=c.shift(),m+=c.shift(),e.U.P.lineTo(l,v,m);p=v+c.shift(),y=m+c.shift(),x=p+c.shift(),_=y+c.shift(),v=x+c.shift(),m=_+c.shift(),e.U.P.curveTo(l,p,y,x,_,v,m)}else if(P=="o26")for(c.length%2&&(v+=c.shift());c.length>0;)p=v,y=m+c.shift(),v=x=p+c.shift(),m=(_=y+c.shift())+c.shift(),e.U.P.curveTo(l,p,y,x,_,v,m);else if(P=="o27")for(c.length%2&&(m+=c.shift());c.length>0;)y=m,x=(p=v+c.shift())+c.shift(),_=y+c.shift(),v=x+c.shift(),m=_,e.U.P.curveTo(l,p,y,x,_,v,m);else if(P=="o10"||P=="o29"){var z=P=="o10"?o:a;if(c.length==0)console.debug("error: empty stack");else{var j=c.pop(),ne=z.Subrs[j+z.Bias];s.x=v,s.y=m,s.nStems=u,s.haveWidth=h,s.width=f,s.open=d,e.U._drawCFF(ne,s,a,o,l),v=s.x,m=s.y,u=s.nStems,h=s.haveWidth,f=s.width,d=s.open}}else if(P=="o30"||P=="o31"){var J=c.length,re=($=0,P=="o31");for($+=J-(I=-3&J);$<I;)re?(y=m,x=(p=v+c.shift())+c.shift(),m=(_=y+c.shift())+c.shift(),I-$==5?(v=x+c.shift(),$++):v=x,re=!1):(p=v,y=m+c.shift(),x=p+c.shift(),_=y+c.shift(),v=x+c.shift(),I-$==5?(m=_+c.shift(),$++):m=_,re=!0),e.U.P.curveTo(l,p,y,x,_,v,m),$+=4}else{if((P+"").charAt(0)=="o")throw console.debug("Unknown operation: "+P,r),P;c.push(P)}}}s.x=v,s.y=m,s.nStems=u,s.haveWidth=h,s.width=f,s.open=d};var t=e,i={Typr:t};return n.Typr=t,n.default=i,Object.defineProperty(n,"__esModule",{value:!0}),n})({}).Typr}/*!
Custom bundle of woff2otf (https://github.com/arty-name/woff2otf) with fflate
(https://github.com/101arrowz/fflate) for use in Troika text rendering. 
Original licenses apply: 
- fflate: https://github.com/101arrowz/fflate/blob/master/LICENSE (MIT)
- woff2otf.js: https://github.com/arty-name/woff2otf/blob/master/woff2otf.js (Apache2)
*/function oE(){return(function(n){var e=Uint8Array,t=Uint16Array,i=Uint32Array,r=new e([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),s=new e([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),a=new e([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),o=function(P,I){for(var F=new t(31),K=0;K<31;++K)F[K]=I+=1<<P[K-1];var G=new i(F[30]);for(K=1;K<30;++K)for(var $=F[K];$<F[K+1];++$)G[$]=$-F[K]<<5|K;return[F,G]},l=o(r,2),c=l[0],u=l[1];c[28]=258,u[258]=28;for(var h=o(s,0)[0],f=new t(32768),d=0;d<32768;++d){var g=(43690&d)>>>1|(21845&d)<<1;g=(61680&(g=(52428&g)>>>2|(13107&g)<<2))>>>4|(3855&g)<<4,f[d]=((65280&g)>>>8|(255&g)<<8)>>>1}var v=function(P,I,F){for(var K=P.length,G=0,$=new t(I);G<K;++G)++$[P[G]-1];var O,W=new t(I);for(G=0;G<I;++G)W[G]=W[G-1]+$[G-1]<<1;{O=new t(1<<I);var Y=15-I;for(G=0;G<K;++G)if(P[G])for(var N=G<<4|P[G],V=I-P[G],ee=W[P[G]-1]++<<V,z=ee|(1<<V)-1;ee<=z;++ee)O[f[ee]>>>Y]=N}return O},m=new e(288);for(d=0;d<144;++d)m[d]=8;for(d=144;d<256;++d)m[d]=9;for(d=256;d<280;++d)m[d]=7;for(d=280;d<288;++d)m[d]=8;var p=new e(32);for(d=0;d<32;++d)p[d]=5;var y=v(m,9),x=v(p,5),_=function(P){for(var I=P[0],F=1;F<P.length;++F)P[F]>I&&(I=P[F]);return I},S=function(P,I,F){var K=I/8|0;return(P[K]|P[K+1]<<8)>>(7&I)&F},T=function(P,I){var F=I/8|0;return(P[F]|P[F+1]<<8|P[F+2]<<16)>>(7&I)},E=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],A=function(P,I,F){var K=new Error(I||E[P]);if(K.code=P,Error.captureStackTrace&&Error.captureStackTrace(K,A),!F)throw K;return K},M=function(P,I,F){var K=P.length;if(!K||F&&!F.l&&K<5)return I||new e(0);var G=!I||F,$=!F||F.i;F||(F={}),I||(I=new e(3*K));var O,W=function(ge){var Ve=I.length;if(ge>Ve){var ke=new e(Math.max(2*Ve,ge));ke.set(I),I=ke}},Y=F.f||0,N=F.p||0,V=F.b||0,ee=F.l,z=F.d,j=F.m,ne=F.n,J=8*K;do{if(!ee){F.f=Y=S(P,N,1);var re=S(P,N+1,3);if(N+=3,!re){var me=P[(de=((O=N)/8|0)+(7&O&&1)+4)-4]|P[de-3]<<8,Se=de+me;if(Se>K){$&&A(0);break}G&&W(V+me),I.set(P.subarray(de,Se),V),F.b=V+=me,F.p=N=8*Se;continue}if(re==1)ee=y,z=x,j=9,ne=5;else if(re==2){var xe=S(P,N,31)+257,he=S(P,N+10,15)+4,Ie=xe+S(P,N+5,31)+1;N+=14;for(var B=new e(Ie),Pe=new e(19),be=0;be<he;++be)Pe[a[be]]=S(P,N+3*be,7);N+=3*he;var Ee=_(Pe),se=(1<<Ee)-1,Ae=v(Pe,Ee);for(be=0;be<Ie;){var de,C=Ae[S(P,N,se)];if(N+=15&C,(de=C>>>4)<16)B[be++]=de;else{var w=0,U=0;for(de==16?(U=3+S(P,N,3),N+=2,w=B[be-1]):de==17?(U=3+S(P,N,7),N+=3):de==18&&(U=11+S(P,N,127),N+=7);U--;)B[be++]=w}}var k=B.subarray(0,xe),X=B.subarray(xe);j=_(k),ne=_(X),ee=v(k,j),z=v(X,ne)}else A(1);if(N>J){$&&A(0);break}}G&&W(V+131072);for(var Z=(1<<j)-1,ue=(1<<ne)-1,le=N;;le=N){var fe=(w=ee[T(P,N)&Z])>>>4;if((N+=15&w)>J){$&&A(0);break}if(w||A(2),fe<256)I[V++]=fe;else{if(fe==256){le=N,ee=null;break}var De=fe-254;if(fe>264){var ve=r[be=fe-257];De=S(P,N,(1<<ve)-1)+c[be],N+=ve}var we=z[T(P,N)&ue],Ce=we>>>4;if(we||A(3),N+=15&we,X=h[Ce],Ce>3&&(ve=s[Ce],X+=T(P,N)&(1<<ve)-1,N+=ve),N>J){$&&A(0);break}G&&W(V+131072);for(var Re=V+De;V<Re;V+=4)I[V]=I[V-X],I[V+1]=I[V+1-X],I[V+2]=I[V+2-X],I[V+3]=I[V+3-X];V=Re}}F.l=ee,F.p=le,F.b=V,ee&&(Y=1,F.m=j,F.d=z,F.n=ne)}while(!Y);return V==I.length?I:(function(ge,Ve,ke){(ke==null||ke>ge.length)&&(ke=ge.length);var $e=new(ge instanceof t?t:ge instanceof i?i:e)(ke-Ve);return $e.set(ge.subarray(Ve,ke)),$e})(I,0,V)},b=new e(0),L=typeof TextDecoder<"u"&&new TextDecoder;try{L.decode(b,{stream:!0})}catch{}return n.convert_streams=function(P){var I=new DataView(P),F=0;function K(){var xe=I.getUint16(F);return F+=2,xe}function G(){var xe=I.getUint32(F);return F+=4,xe}function $(xe){me.setUint16(Se,xe),Se+=2}function O(xe){me.setUint32(Se,xe),Se+=4}for(var W={signature:G(),flavor:G(),length:G(),numTables:K(),reserved:K(),totalSfntSize:G(),majorVersion:K(),minorVersion:K(),metaOffset:G(),metaLength:G(),metaOrigLength:G(),privOffset:G(),privLength:G()},Y=0;Math.pow(2,Y)<=W.numTables;)Y++;Y--;for(var N=16*Math.pow(2,Y),V=16*W.numTables-N,ee=12,z=[],j=0;j<W.numTables;j++)z.push({tag:G(),offset:G(),compLength:G(),origLength:G(),origChecksum:G()}),ee+=16;var ne,J=new Uint8Array(12+16*z.length+z.reduce((function(xe,he){return xe+he.origLength+4}),0)),re=J.buffer,me=new DataView(re),Se=0;return O(W.flavor),$(W.numTables),$(N),$(Y),$(V),z.forEach((function(xe){O(xe.tag),O(xe.origChecksum),O(ee),O(xe.origLength),xe.outOffset=ee,(ee+=xe.origLength)%4!=0&&(ee+=4-ee%4)})),z.forEach((function(xe){var he,Ie=P.slice(xe.offset,xe.offset+xe.compLength);if(xe.compLength!=xe.origLength){var B=new Uint8Array(xe.origLength);he=new Uint8Array(Ie,2),M(he,B)}else B=new Uint8Array(Ie);J.set(B,xe.outOffset);var Pe=0;(ee=xe.outOffset+xe.origLength)%4!=0&&(Pe=4-ee%4),J.set(new Uint8Array(Pe).buffer,xe.outOffset+xe.origLength),ne=ee+Pe})),re.slice(0,ne)},Object.defineProperty(n,"__esModule",{value:!0}),n})({}).convert_streams}function lE(n,e){const t={M:2,L:2,Q:4,C:6,Z:0},i={C:"18g,ca,368,1kz",D:"17k,6,2,2+4,5+c,2+6,2+1,10+1,9+f,j+11,2+1,a,2,2+1,15+2,3,j+2,6+3,2+8,2,2,2+1,w+a,4+e,3+3,2,3+2,3+5,23+w,2f+4,3,2+9,2,b,2+3,3,1k+9,6+1,3+1,2+2,2+d,30g,p+y,1,1+1g,f+x,2,sd2+1d,jf3+4,f+3,2+4,2+2,b+3,42,2,4+2,2+1,2,3,t+1,9f+w,2,el+2,2+g,d+2,2l,2+1,5,3+1,2+1,2,3,6,16wm+1v",R:"17m+3,2,2,6+3,m,15+2,2+2,h+h,13,3+8,2,2,3+1,2,p+1,x,5+4,5,a,2,2,3,u,c+2,g+1,5,2+1,4+1,5j,6+1,2,b,2+2,f,2+1,1s+2,2,3+1,7,1ez0,2,2+1,4+4,b,4,3,b,42,2+2,4,3,2+1,2,o+3,ae,ep,x,2o+2,3+1,3,5+1,6",L:"x9u,jff,a,fd,jv",T:"4t,gj+33,7o+4,1+1,7c+18,2,2+1,2+1,2,21+a,2,1b+k,h,2u+6,3+5,3+1,2+3,y,2,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,3,7,6+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+d,1,1+1,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,ek,3+1,r+4,1e+4,6+5,2p+c,1+3,1,1+2,1+b,2db+2,3y,2p+v,ff+3,30+1,n9x,1+2,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,5s,6y+2,ea,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+9,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2,2b+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,470+8,at4+4,1o+6,t5,1s+3,2a,f5l+1,2+3,43o+2,a+7,1+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,1,gzau,v+2n,3l+6n"},r=1,s=2,a=4,o=8,l=16,c=32;let u;function h(E){if(!u){const A={R:s,L:r,D:a,C:l,U:c,T:o};u=new Map;for(let M in i){let b=0;i[M].split(",").forEach(L=>{let[P,I]=L.split("+");P=parseInt(P,36),I=I?parseInt(I,36):0,u.set(b+=P,A[M]);for(let F=I;F--;)u.set(++b,A[M])})}}return u.get(E)||c}const f=1,d=2,g=3,v=4,m=[null,"isol","init","fina","medi"];function p(E){const A=new Uint8Array(E.length);let M=c,b=f,L=-1;for(let P=0;P<E.length;P++){const I=E.codePointAt(P);let F=h(I)|0,K=f;F&o||(M&(r|a|l)?F&(s|a|l)?(K=g,(b===f||b===g)&&A[L]++):F&(r|c)&&(b===d||b===v)&&A[L]--:M&(s|c)&&(b===d||b===v)&&A[L]--,b=A[P]=K,M=F,L=P,I>65535&&P++)}return A}function y(E,A){const M=[];for(let L=0;L<A.length;L++){const P=A.codePointAt(L);P>65535&&L++,M.push(n.U.codeToGlyph(E,P))}const b=E.GSUB;if(b){const{lookupList:L,featureList:P}=b;let I;const F=/^(rlig|liga|mset|isol|init|fina|medi|half|pres|blws|ccmp)$/,K=[];P.forEach(G=>{if(F.test(G.tag))for(let $=0;$<G.tab.length;$++){if(K[G.tab[$]])continue;K[G.tab[$]]=!0;const O=L[G.tab[$]],W=/^(isol|init|fina|medi)$/.test(G.tag);W&&!I&&(I=p(A));for(let Y=0;Y<M.length;Y++)(!I||!W||m[I[Y]]===G.tag)&&n.U._applySubs(M,Y,O,L)}})}return M}function x(E,A){const M=new Int16Array(A.length*3);let b=0;for(;b<A.length;b++){const F=A[b];if(F===-1)continue;M[b*3+2]=E.hmtx.aWidth[F];const K=E.GPOS;if(K){const G=K.lookupList;for(let $=0;$<G.length;$++){const O=G[$];for(let W=0;W<O.tabs.length;W++){const Y=O.tabs[W];if(O.ltype===1){if(n._lctf.coverageIndex(Y.coverage,F)!==-1&&Y.pos){I(Y.pos,b);break}}else if(O.ltype===2){let N=null,V=L();if(V!==-1){const ee=n._lctf.coverageIndex(Y.coverage,A[V]);if(ee!==-1){if(Y.fmt===1){const z=Y.pairsets[ee];for(let j=0;j<z.length;j++)z[j].gid2===F&&(N=z[j])}else if(Y.fmt===2){const z=n.U._getGlyphClass(A[V],Y.classDef1),j=n.U._getGlyphClass(F,Y.classDef2);N=Y.matrix[z][j]}if(N){N.val1&&I(N.val1,V),N.val2&&I(N.val2,b);break}}}}else if(O.ltype===4){const N=n._lctf.coverageIndex(Y.markCoverage,F);if(N!==-1){const V=L(P),ee=V===-1?-1:n._lctf.coverageIndex(Y.baseCoverage,A[V]);if(ee!==-1){const z=Y.markArray[N],j=Y.baseArray[ee][z.markClass];M[b*3]=j.x-z.x+M[V*3]-M[V*3+2],M[b*3+1]=j.y-z.y+M[V*3+1];break}}}else if(O.ltype===6){const N=n._lctf.coverageIndex(Y.mark1Coverage,F);if(N!==-1){const V=L();if(V!==-1){const ee=A[V];if(_(E,ee)===3){const z=n._lctf.coverageIndex(Y.mark2Coverage,ee);if(z!==-1){const j=Y.mark1Array[N],ne=Y.mark2Array[z][j.markClass];M[b*3]=ne.x-j.x+M[V*3]-M[V*3+2],M[b*3+1]=ne.y-j.y+M[V*3+1];break}}}}}}}}else if(E.kern&&!E.cff){const G=L();if(G!==-1){const $=E.kern.glyph1.indexOf(A[G]);if($!==-1){const O=E.kern.rval[$].glyph2.indexOf(F);O!==-1&&(M[G*3+2]+=E.kern.rval[$].vals[O])}}}}return M;function L(F){for(let K=b-1;K>=0;K--)if(A[K]!==-1&&(!F||F(A[K])))return K;return-1}function P(F){return _(E,F)===1}function I(F,K){for(let G=0;G<3;G++)M[K*3+G]+=F[G]||0}}function _(E,A){const M=E.GDEF&&E.GDEF.glyphClassDef;return M?n.U._getGlyphClass(A,M):0}function S(...E){for(let A=0;A<E.length;A++)if(typeof E[A]=="number")return E[A]}function T(E){const A=Object.create(null),M=E["OS/2"],b=E.hhea,L=E.head.unitsPerEm,P=S(M&&M.sTypoAscender,b&&b.ascender,L),I={unitsPerEm:L,ascender:P,descender:S(M&&M.sTypoDescender,b&&b.descender,0),capHeight:S(M&&M.sCapHeight,P),xHeight:S(M&&M.sxHeight,P),lineGap:S(M&&M.sTypoLineGap,b&&b.lineGap),supportsCodePoint(F){return n.U.codeToGlyph(E,F)>0},forEachGlyph(F,K,G,$){let O=0;const W=1/I.unitsPerEm*K,Y=y(E,F);let N=0;const V=x(E,Y);return Y.forEach((ee,z)=>{if(ee!==-1){let j=A[ee];if(!j){const{cmds:ne,crds:J}=n.U.glyphToPath(E,ee);let re="",me=0;for(let B=0,Pe=ne.length;B<Pe;B++){const be=t[ne[B]];re+=ne[B];for(let Ee=1;Ee<=be;Ee++)re+=(Ee>1?",":"")+J[me++]}let Se,xe,he,Ie;if(J.length){Se=xe=1/0,he=Ie=-1/0;for(let B=0,Pe=J.length;B<Pe;B+=2){let be=J[B],Ee=J[B+1];be<Se&&(Se=be),Ee<xe&&(xe=Ee),be>he&&(he=be),Ee>Ie&&(Ie=Ee)}}else Se=he=xe=Ie=0;j=A[ee]={index:ee,advanceWidth:E.hmtx.aWidth[ee],xMin:Se,yMin:xe,xMax:he,yMax:Ie,path:re}}$.call(null,j,O+V[z*3]*W,V[z*3+1]*W,N),O+=V[z*3+2]*W,G&&(O+=G*K)}N+=F.codePointAt(N)>65535?2:1}),O}};return I}return function(A){const M=new Uint8Array(A,0,4),b=n._bin.readASCII(M,0,4);if(b==="wOFF")A=e(A);else if(b==="wOF2")throw new Error("woff2 fonts not supported");return T(n.parse(A)[0])}}const cE=Vr({name:"Typr Font Parser",dependencies:[aE,oE,lE],init(n,e,t){const i=n(),r=e();return t(i,r)}});/*!
Custom bundle of @unicode-font-resolver/client v1.0.2 (https://github.com/lojjic/unicode-font-resolver)
for use in Troika text rendering. 
Original MIT license applies
*/function uE(){return(function(n){var e=function(){this.buckets=new Map};e.prototype.add=function(x){var _=x>>5;this.buckets.set(_,(this.buckets.get(_)||0)|1<<(31&x))},e.prototype.has=function(x){var _=this.buckets.get(x>>5);return _!==void 0&&(_&1<<(31&x))!=0},e.prototype.serialize=function(){var x=[];return this.buckets.forEach((function(_,S){x.push((+S).toString(36)+":"+_.toString(36))})),x.join(",")},e.prototype.deserialize=function(x){var _=this;this.buckets.clear(),x.split(",").forEach((function(S){var T=S.split(":");_.buckets.set(parseInt(T[0],36),parseInt(T[1],36))}))};var t=Math.pow(2,8),i=t-1,r=~i;function s(x){var _=(function(T){return T&r})(x).toString(16),S=(function(T){return(T&r)+t-1})(x).toString(16);return"codepoint-index/plane"+(x>>16)+"/"+_+"-"+S+".json"}function a(x,_){var S=x&i,T=_.codePointAt(S/6|0);return((T=(T||48)-48)&1<<S%6)!=0}function o(x,_){var S;(S=x,S.replace(/U\+/gi,"").replace(/^,+|,+$/g,"").split(/,+/).map((function(T){return T.split("-").map((function(E){return parseInt(E.trim(),16)}))}))).forEach((function(T){var E=T[0],A=T[1];A===void 0&&(A=E),_(E,A)}))}function l(x,_){o(x,(function(S,T){for(var E=S;E<=T;E++)_(E)}))}var c={},u={},h=new WeakMap,f="https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data";function d(x){var _=h.get(x);return _||(_=new e,l(x.ranges,(function(S){return _.add(S)})),h.set(x,_)),_}var g,v=new Map;function m(x,_,S){return x[_]?_:x[S]?S:(function(T){for(var E in T)return E})(x)}function p(x,_){var S=_;if(!x.includes(S)){S=1/0;for(var T=0;T<x.length;T++)Math.abs(x[T]-_)<Math.abs(S-_)&&(S=x[T])}return S}function y(x){return g||(g=new Set,l("9-D,20,85,A0,1680,2000-200A,2028-202F,205F,3000",(function(_){g.add(_)}))),g.has(x)}return n.CodePointSet=e,n.clearCache=function(){c={},u={}},n.getFontsForString=function(x,_){_===void 0&&(_={});var S,T=_.lang;T===void 0&&(T=new RegExp("\\p{Script=Hangul}","u").test(S=x)?"ko":new RegExp("\\p{Script=Hiragana}|\\p{Script=Katakana}","u").test(S)?"ja":"en");var E=_.category;E===void 0&&(E="sans-serif");var A=_.style;A===void 0&&(A="normal");var M=_.weight;M===void 0&&(M=400);var b=(_.dataUrl||f).replace(/\/$/g,""),L=new Map,P=new Uint8Array(x.length),I={},F={},K=new Array(x.length),G=new Map,$=!1;function O(N){var V=v.get(N);return V||(V=fetch(b+"/"+N).then((function(ee){if(!ee.ok)throw new Error(ee.statusText);return ee.json().then((function(z){if(!Array.isArray(z)||z[0]!==1)throw new Error("Incorrect schema version; need 1, got "+z[0]);return z[1]}))})).catch((function(ee){if(b!==f)return $||(console.error('unicode-font-resolver: Failed loading from dataUrl "'+b+'", trying default CDN. '+ee.message),$=!0),b=f,v.delete(N),O(N);throw ee})),v.set(N,V)),V}for(var W=function(N){var V=x.codePointAt(N),ee=s(V);K[N]=ee,c[ee]||G.has(ee)||G.set(ee,O(ee).then((function(z){c[ee]=z}))),V>65535&&(N++,Y=N)},Y=0;Y<x.length;Y++)W(Y);return Promise.all(G.values()).then((function(){G.clear();for(var N=function(ee){var z=x.codePointAt(ee),j=null,ne=c[K[ee]],J=void 0;for(var re in ne){var me=F[re];if(me===void 0&&(me=F[re]=new RegExp(re).test(T||"en")),me){for(var Se in J=re,ne[re])if(a(z,ne[re][Se])){j=Se;break}break}}if(!j){e:for(var xe in ne)if(xe!==J){for(var he in ne[xe])if(a(z,ne[xe][he])){j=he;break e}}}j||(console.debug("No font coverage for U+"+z.toString(16)),j="latin"),K[ee]=j,u[j]||G.has(j)||G.set(j,O("font-meta/"+j+".json").then((function(Ie){u[j]=Ie}))),z>65535&&(ee++,V=ee)},V=0;V<x.length;V++)N(V);return Promise.all(G.values())})).then((function(){for(var N,V=null,ee=0;ee<x.length;ee++){var z=x.codePointAt(ee);if(V&&(y(z)||d(V).has(z)))P[ee]=P[ee-1];else{V=u[K[ee]];var j=I[V.id];if(!j){var ne=V.typeforms,J=m(ne,E,"sans-serif"),re=m(ne[J],A,"normal"),me=p((N=ne[J])===null||N===void 0?void 0:N[re],M);j=I[V.id]=b+"/font-files/"+V.id+"/"+J+"."+re+"."+me+".woff"}var Se=L.get(j);Se==null&&(Se=L.size,L.set(j,Se)),P[ee]=Se}z>65535&&(ee++,P[ee]=P[ee-1])}return{fontUrls:Array.from(L.keys()),chars:P}}))},Object.defineProperty(n,"__esModule",{value:!0}),n})({})}function hE(n,e){const t=Object.create(null),i=Object.create(null);function r(a,o){const l=c=>{console.error(`Failure loading font ${a}`,c)};try{const c=new XMLHttpRequest;c.open("get",a,!0),c.responseType="arraybuffer",c.onload=function(){if(c.status>=400)l(new Error(c.statusText));else if(c.status>0)try{const u=n(c.response);u.src=a,o(u)}catch(u){l(u)}},c.onerror=l,c.send()}catch(c){l(c)}}function s(a,o){let l=t[a];l?o(l):i[a]?i[a].push(o):(i[a]=[o],r(a,c=>{c.src=a,t[a]=c,i[a].forEach(u=>u(c)),delete i[a]}))}return function(a,o,{lang:l,fonts:c=[],style:u="normal",weight:h="normal",unicodeFontsURL:f}={}){const d=new Uint8Array(a.length),g=[];a.length||y();const v=new Map,m=[];if(u!=="italic"&&(u="normal"),typeof h!="number"&&(h=h==="bold"?700:400),c&&!Array.isArray(c)&&(c=[c]),c=c.slice().filter(_=>!_.lang||_.lang.test(l)).reverse(),c.length){let E=0;(function A(M=0){for(let b=M,L=a.length;b<L;b++){const P=a.codePointAt(b);if(E===1&&g[d[b-1]].supportsCodePoint(P)||b>0&&/\s/.test(a[b]))d[b]=d[b-1],E===2&&(m[m.length-1][1]=b);else for(let I=d[b],F=c.length;I<=F;I++)if(I===F){const K=E===2?m[m.length-1]:m[m.length]=[b,b];K[1]=b,E=2}else{d[b]=I;const{src:K,unicodeRange:G}=c[I];if(!G||x(P,G)){const $=t[K];if(!$){s(K,()=>{A(b)});return}if($.supportsCodePoint(P)){let O=v.get($);typeof O!="number"&&(O=g.length,g.push($),v.set($,O)),d[b]=O,E=1;break}}}P>65535&&b+1<L&&(d[b+1]=d[b],b++,E===2&&(m[m.length-1][1]=b))}p()})()}else m.push([0,a.length-1]),p();function p(){if(m.length){const _=m.map(S=>a.substring(S[0],S[1]+1)).join(`
`);e.getFontsForString(_,{lang:l||void 0,style:u,weight:h,dataUrl:f}).then(({fontUrls:S,chars:T})=>{const E=g.length;let A=0;m.forEach(b=>{for(let L=0,P=b[1]-b[0];L<=P;L++)d[b[0]+L]=T[A++]+E;A++});let M=0;S.forEach((b,L)=>{s(b,P=>{g[L+E]=P,++M===S.length&&y()})})})}else y()}function y(){o({chars:d,fonts:g})}function x(_,S){for(let T=0;T<S.length;T++){const[E,A=E]=S[T];if(E<=_&&_<=A)return!0}return!1}}}const fE=Vr({name:"FontResolver",dependencies:[hE,cE,uE],init(n,e,t){return n(e,t())}});function dE(n,e){const i=/[\u00AD\u034F\u061C\u115F-\u1160\u17B4-\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFF8]/,r="[^\\S\\u00A0]",s=new RegExp(`${r}|[\\-\\u007C\\u00AD\\u2010\\u2012-\\u2014\\u2027\\u2056\\u2E17\\u2E40]`);function a({text:g,lang:v,fonts:m,style:p,weight:y,preResolvedFonts:x,unicodeFontsURL:_},S){const T=({chars:E,fonts:A})=>{let M,b;const L=[];for(let P=0;P<E.length;P++)E[P]!==b?(b=E[P],L.push(M={start:P,end:P,fontObj:A[E[P]]})):M.end=P;S(L)};x?T(x):n(g,T,{lang:v,fonts:m,style:p,weight:y,unicodeFontsURL:_})}function o({text:g="",font:v,lang:m,sdfGlyphSize:p=64,fontSize:y=400,fontWeight:x=1,fontStyle:_="normal",letterSpacing:S=0,lineHeight:T="normal",maxWidth:E=1/0,direction:A,textAlign:M="left",textIndent:b=0,whiteSpace:L="normal",overflowWrap:P="normal",anchorX:I=0,anchorY:F=0,metricsOnly:K=!1,unicodeFontsURL:G,preResolvedFonts:$=null,includeCaretPositions:O=!1,chunkedBoundsSize:W=8192,colorRanges:Y=null},N){const V=h(),ee={fontLoad:0,typesetting:0};g.indexOf("\r")>-1&&(console.info("Typesetter: got text with \\r chars; normalizing to \\n"),g=g.replace(/\r\n/g,`
`).replace(/\r/g,`
`)),y=+y,S=+S,E=+E,T=T||"normal",b=+b,a({text:g,lang:m,style:_,weight:x,fonts:typeof v=="string"?[{src:v}]:v,unicodeFontsURL:G,preResolvedFonts:$},z=>{ee.fontLoad=h()-V;const j=isFinite(E);let ne=null,J=null,re=null,me=null,Se=null,xe=null,he=null,Ie=null,B=0,Pe=0,be=L!=="nowrap";const Ee=new Map,se=h();let Ae=b,de=0,C=new f;const w=[C];z.forEach(ue=>{const{fontObj:le}=ue,{ascender:fe,descender:De,unitsPerEm:ve,lineGap:we,capHeight:Ce,xHeight:Re}=le;let ge=Ee.get(le);if(!ge){const pe=y/ve,ie=T==="normal"?(fe-De+we)*pe:T*y,_e=(ie-(fe-De)*pe)/2,Me=Math.min(ie,(fe-De)*pe),ye=(fe+De)/2*pe+Me/2;ge={index:Ee.size,src:le.src,fontObj:le,fontSizeMult:pe,unitsPerEm:ve,ascender:fe*pe,descender:De*pe,capHeight:Ce*pe,xHeight:Re*pe,lineHeight:ie,baseline:-_e-fe*pe,caretTop:ye,caretBottom:ye-Me},Ee.set(le,ge)}const{fontSizeMult:Ve}=ge,ke=g.slice(ue.start,ue.end+1);let $e,q;le.forEachGlyph(ke,y,S,(pe,ie,_e,Me)=>{ie+=de,Me+=ue.start,$e=ie,q=pe;const ye=g.charAt(Me),Be=pe.advanceWidth*Ve,qe=C.count;let ze;if("isEmpty"in pe||(pe.isWhitespace=!!ye&&new RegExp(r).test(ye),pe.canBreakAfter=!!ye&&s.test(ye),pe.isEmpty=pe.xMin===pe.xMax||pe.yMin===pe.yMax||i.test(ye)),!pe.isWhitespace&&!pe.isEmpty&&Pe++,be&&j&&!pe.isWhitespace&&ie+Be+Ae>E&&qe){if(C.glyphAt(qe-1).glyphObj.canBreakAfter)ze=new f,Ae=-ie;else for(let lt=qe;lt--;)if(lt===0&&P==="break-word"){ze=new f,Ae=-ie;break}else if(C.glyphAt(lt).glyphObj.canBreakAfter){ze=C.splitAt(lt+1);const ht=ze.glyphAt(0).x;Ae-=ht;for(let _t=ze.count;_t--;)ze.glyphAt(_t).x-=ht;break}ze&&(C.isSoftWrapped=!0,C=ze,w.push(C),B=E)}let He=C.glyphAt(C.count);He.glyphObj=pe,He.x=ie+Ae,He.y=_e,He.width=Be,He.charIndex=Me,He.fontData=ge,ye===`
`&&(C=new f,w.push(C),Ae=-(ie+Be+S*y)+b)}),de=$e+q.advanceWidth*Ve+S*y});let U=0;w.forEach(ue=>{let le=!0;for(let fe=ue.count;fe--;){const De=ue.glyphAt(fe);le&&!De.glyphObj.isWhitespace&&(ue.width=De.x+De.width,ue.width>B&&(B=ue.width),le=!1);let{lineHeight:ve,capHeight:we,xHeight:Ce,baseline:Re}=De.fontData;ve>ue.lineHeight&&(ue.lineHeight=ve);const ge=Re-ue.baseline;ge<0&&(ue.baseline+=ge,ue.cap+=ge,ue.ex+=ge),ue.cap=Math.max(ue.cap,ue.baseline+we),ue.ex=Math.max(ue.ex,ue.baseline+Ce)}ue.baseline-=U,ue.cap-=U,ue.ex-=U,U+=ue.lineHeight});let k=0,X=0;if(I&&(typeof I=="number"?k=-I:typeof I=="string"&&(k=-B*(I==="left"?0:I==="center"?.5:I==="right"?1:c(I)))),F&&(typeof F=="number"?X=-F:typeof F=="string"&&(X=F==="top"?0:F==="top-baseline"?-w[0].baseline:F==="top-cap"?-w[0].cap:F==="top-ex"?-w[0].ex:F==="middle"?U/2:F==="bottom"?U:F==="bottom-baseline"?-w[w.length-1].baseline:c(F)*U)),!K){const ue=e.getEmbeddingLevels(g,A);ne=new Uint16Array(Pe),J=new Uint8Array(Pe),re=new Float32Array(Pe*2),me={},he=[1/0,1/0,-1/0,-1/0],Ie=[],O&&(xe=new Float32Array(g.length*4)),Y&&(Se=new Uint8Array(Pe*3));let le=0,fe=-1,De=-1,ve,we;if(w.forEach((Ce,Re)=>{let{count:ge,width:Ve}=Ce;if(ge>0){let ke=0;for(let Me=ge;Me--&&Ce.glyphAt(Me).glyphObj.isWhitespace;)ke++;let $e=0,q=0;if(M==="center")$e=(B-Ve)/2;else if(M==="right")$e=B-Ve;else if(M==="justify"&&Ce.isSoftWrapped){let Me=0;for(let ye=ge-ke;ye--;)Ce.glyphAt(ye).glyphObj.isWhitespace&&Me++;q=(B-Ve)/Me}if(q||$e){let Me=0;for(let ye=0;ye<ge;ye++){let Be=Ce.glyphAt(ye);const qe=Be.glyphObj;Be.x+=$e+Me,q!==0&&qe.isWhitespace&&ye<ge-ke&&(Me+=q,Be.width+=q)}}const pe=e.getReorderSegments(g,ue,Ce.glyphAt(0).charIndex,Ce.glyphAt(Ce.count-1).charIndex);for(let Me=0;Me<pe.length;Me++){const[ye,Be]=pe[Me];let qe=1/0,ze=-1/0;for(let He=0;He<ge;He++)if(Ce.glyphAt(He).charIndex>=ye){let lt=He,ht=He;for(;ht<ge;ht++){let _t=Ce.glyphAt(ht);if(_t.charIndex>Be)break;ht<ge-ke&&(qe=Math.min(qe,_t.x),ze=Math.max(ze,_t.x+_t.width))}for(let _t=lt;_t<ht;_t++){const Zt=Ce.glyphAt(_t);Zt.x=ze-(Zt.x+Zt.width-qe)}break}}let ie;const _e=Me=>ie=Me;for(let Me=0;Me<ge;Me++){const ye=Ce.glyphAt(Me);ie=ye.glyphObj;const Be=ie.index,qe=ue.levels[ye.charIndex]&1;if(qe){const ze=e.getMirroredCharacter(g[ye.charIndex]);ze&&ye.fontData.fontObj.forEachGlyph(ze,0,0,_e)}if(O){const{charIndex:ze,fontData:He}=ye,lt=ye.x+k,ht=ye.x+ye.width+k;xe[ze*4]=qe?ht:lt,xe[ze*4+1]=qe?lt:ht,xe[ze*4+2]=Ce.baseline+He.caretBottom+X,xe[ze*4+3]=Ce.baseline+He.caretTop+X;const _t=ze-fe;_t>1&&u(xe,fe,_t),fe=ze}if(Y){const{charIndex:ze}=ye;for(;ze>De;)De++,Y.hasOwnProperty(De)&&(we=Y[De])}if(!ie.isWhitespace&&!ie.isEmpty){const ze=le++,{fontSizeMult:He,src:lt,index:ht}=ye.fontData,_t=me[lt]||(me[lt]={});_t[Be]||(_t[Be]={path:ie.path,pathBounds:[ie.xMin,ie.yMin,ie.xMax,ie.yMax]});const Zt=ye.x+k,Ot=ye.y+Ce.baseline+X;re[ze*2]=Zt,re[ze*2+1]=Ot;const ln=Zt+ie.xMin*He,Tn=Ot+ie.yMin*He,In=Zt+ie.xMax*He,$t=Ot+ie.yMax*He;ln<he[0]&&(he[0]=ln),Tn<he[1]&&(he[1]=Tn),In>he[2]&&(he[2]=In),$t>he[3]&&(he[3]=$t),ze%W===0&&(ve={start:ze,end:ze,rect:[1/0,1/0,-1/0,-1/0]},Ie.push(ve)),ve.end++;const At=ve.rect;if(ln<At[0]&&(At[0]=ln),Tn<At[1]&&(At[1]=Tn),In>At[2]&&(At[2]=In),$t>At[3]&&(At[3]=$t),ne[ze]=Be,J[ze]=ht,Y){const pn=ze*3;Se[pn]=we>>16&255,Se[pn+1]=we>>8&255,Se[pn+2]=we&255}}}}}),xe){const Ce=g.length-fe;Ce>1&&u(xe,fe,Ce)}}const Z=[];Ee.forEach(({index:ue,src:le,unitsPerEm:fe,ascender:De,descender:ve,lineHeight:we,capHeight:Ce,xHeight:Re})=>{Z[ue]={src:le,unitsPerEm:fe,ascender:De,descender:ve,lineHeight:we,capHeight:Ce,xHeight:Re}}),ee.typesetting=h()-se,N({glyphIds:ne,glyphFontIndices:J,glyphPositions:re,glyphData:me,fontData:Z,caretPositions:xe,glyphColors:Se,chunkedBounds:Ie,fontSize:y,topBaseline:X+w[0].baseline,blockBounds:[k,X-U,k+B,X],visibleBounds:he,timings:ee})})}function l(g,v){o({...g,metricsOnly:!0},m=>{const[p,y,x,_]=m.blockBounds;v({width:x-p,height:_-y})})}function c(g){let v=g.match(/^([\d.]+)%$/),m=v?parseFloat(v[1]):NaN;return isNaN(m)?0:m/100}function u(g,v,m){const p=g[v*4],y=g[v*4+1],x=g[v*4+2],_=g[v*4+3],S=(y-p)/m;for(let T=0;T<m;T++){const E=(v+T)*4;g[E]=p+S*T,g[E+1]=p+S*(T+1),g[E+2]=x,g[E+3]=_}}function h(){return(self.performance||Date).now()}function f(){this.data=[]}const d=["glyphObj","x","y","width","charIndex","fontData"];return f.prototype={width:0,lineHeight:0,baseline:0,cap:0,ex:0,isSoftWrapped:!1,get count(){return Math.ceil(this.data.length/d.length)},glyphAt(g){let v=f.flyweight;return v.data=this.data,v.index=g,v},splitAt(g){let v=new f;return v.data=this.data.splice(g*d.length),v}},f.flyweight=d.reduce((g,v,m,p)=>(Object.defineProperty(g,v,{get(){return this.data[this.index*d.length+m]},set(y){this.data[this.index*d.length+m]=y}}),g),{data:null,index:0}),{typeset:o,measure:l}}const Wi=()=>(self.performance||Date).now(),lo=Sm();let Ff;function pE(n,e,t,i,r,s,a,o,l,c,u=!0){return u?gE(n,e,t,i,r,s,a,o,l,c).then(null,h=>(Ff||(console.warn("WebGL SDF generation failed, falling back to JS",h),Ff=!0),kf(n,e,t,i,r,s,a,o,l,c))):kf(n,e,t,i,r,s,a,o,l,c)}const Na=[],mE=5;let Mc=0;function Mm(){const n=Wi();for(;Na.length&&Wi()-n<mE;)Na.shift()();Mc=Na.length?setTimeout(Mm,0):0}const gE=(...n)=>new Promise((e,t)=>{Na.push(()=>{const i=Wi();try{lo.webgl.generateIntoCanvas(...n),e({timing:Wi()-i})}catch(r){t(r)}}),Mc||(Mc=setTimeout(Mm,0))}),vE=4,_E=2e3,Of={};let xE=0;function kf(n,e,t,i,r,s,a,o,l,c){const u="TroikaTextSDFGenerator_JS_"+xE++%vE;let h=Of[u];return h||(h=Of[u]={workerModule:Vr({name:u,workerId:u,dependencies:[Sm,Wi],init(f,d){const g=f().javascript.generate;return function(...v){const m=d();return{textureData:g(...v),timing:d()-m}}},getTransferables(f){return[f.textureData.buffer]}}),requests:0,idleTimer:null}),h.requests++,clearTimeout(h.idleTimer),h.workerModule(n,e,t,i,r,s).then(({textureData:f,timing:d})=>{const g=Wi(),v=new Uint8Array(f.length*4);for(let m=0;m<f.length;m++)v[m*4+c]=f[m];return lo.webglUtils.renderImageData(a,v,o,l,n,e,1<<3-c),d+=Wi()-g,--h.requests===0&&(h.idleTimer=setTimeout(()=>{ZT(u)},_E)),{timing:d}})}function yE(n){n._warm||(lo.webgl.isSupported(n),n._warm=!0)}const SE=lo.webglUtils.resizeWebGLCanvasWithoutClearing,gs={unicodeFontsURL:null,sdfGlyphSize:64,sdfMargin:1/16,sdfExponent:9,textureWidth:2048},bE=new Ke;function vr(){return(self.performance||Date).now()}const Bf=Object.create(null);function ME(n,e){n=EE({},n);const t=vr(),i=[];if(n.font&&i.push({label:"user",src:wE(n.font)}),n.font=i,n.text=""+n.text,n.sdfGlyphSize=n.sdfGlyphSize||gs.sdfGlyphSize,n.unicodeFontsURL=n.unicodeFontsURL||gs.unicodeFontsURL,n.colorRanges!=null){let f={};for(let d in n.colorRanges)if(n.colorRanges.hasOwnProperty(d)){let g=n.colorRanges[d];typeof g!="number"&&(g=bE.set(g).getHex()),f[d]=g}n.colorRanges=f}Object.freeze(n);const{textureWidth:r,sdfExponent:s}=gs,{sdfGlyphSize:a}=n,o=r/a*4;let l=Bf[a];if(!l){const f=document.createElement("canvas");f.width=r,f.height=a*256/o,l=Bf[a]={glyphCount:0,sdfGlyphSize:a,sdfCanvas:f,sdfTexture:new Gt(f,void 0,void 0,void 0,Sn,Sn),contextLost:!1,glyphsByFont:new Map},l.sdfTexture.generateMipmaps=!1,TE(l)}const{sdfTexture:c,sdfCanvas:u}=l;wm(n).then(f=>{const{glyphIds:d,glyphFontIndices:g,fontData:v,glyphPositions:m,fontSize:p,timings:y}=f,x=[],_=new Float32Array(d.length*4);let S=0,T=0;const E=vr(),A=v.map(I=>{let F=l.glyphsByFont.get(I.src);return F||l.glyphsByFont.set(I.src,F=new Map),F});d.forEach((I,F)=>{const K=g[F],{src:G,unitsPerEm:$}=v[K];let O=A[K].get(I);if(!O){const{path:ee,pathBounds:z}=f.glyphData[G][I],j=Math.max(z[2]-z[0],z[3]-z[1])/a*(gs.sdfMargin*a+.5),ne=l.glyphCount++,J=[z[0]-j,z[1]-j,z[2]+j,z[3]+j];A[K].set(I,O={path:ee,atlasIndex:ne,sdfViewBox:J}),x.push(O)}const{sdfViewBox:W}=O,Y=m[T++],N=m[T++],V=p/$;_[S++]=Y+W[0]*V,_[S++]=N+W[1]*V,_[S++]=Y+W[2]*V,_[S++]=N+W[3]*V,d[F]=O.atlasIndex}),y.quads=(y.quads||0)+(vr()-E);const M=vr();y.sdf={};const b=u.height,L=Math.ceil(l.glyphCount/o),P=Math.pow(2,Math.ceil(Math.log2(L*a)));P>b&&(console.info(`Increasing SDF texture size ${b}->${P}`),SE(u,r,P),c.dispose()),Promise.all(x.map(I=>Tm(I,l,n.gpuAccelerateSDF).then(({timing:F})=>{y.sdf[I.atlasIndex]=F}))).then(()=>{x.length&&!l.contextLost&&(Em(l),c.needsUpdate=!0),y.sdfTotal=vr()-M,y.total=vr()-t,e(Object.freeze({parameters:n,sdfTexture:c,sdfGlyphSize:a,sdfExponent:s,glyphBounds:_,glyphAtlasIndices:d,glyphColors:f.glyphColors,caretPositions:f.caretPositions,chunkedBounds:f.chunkedBounds,ascender:f.ascender,descender:f.descender,lineHeight:f.lineHeight,capHeight:f.capHeight,xHeight:f.xHeight,topBaseline:f.topBaseline,blockBounds:f.blockBounds,visibleBounds:f.visibleBounds,timings:f.timings}))})}),Promise.resolve().then(()=>{l.contextLost||yE(u)})}function Tm({path:n,atlasIndex:e,sdfViewBox:t},{sdfGlyphSize:i,sdfCanvas:r,contextLost:s},a){if(s)return Promise.resolve({timing:-1});const{textureWidth:o,sdfExponent:l}=gs,c=Math.max(t[2]-t[0],t[3]-t[1]),u=Math.floor(e/4),h=u%(o/i)*i,f=Math.floor(u/(o/i))*i,d=e%4;return pE(i,i,n,t,c,l,r,h,f,d,a)}function TE(n){const e=n.sdfCanvas;e.addEventListener("webglcontextlost",t=>{console.log("Context Lost",t),t.preventDefault(),n.contextLost=!0}),e.addEventListener("webglcontextrestored",t=>{console.log("Context Restored",t),n.contextLost=!1;const i=[];n.glyphsByFont.forEach(r=>{r.forEach(s=>{i.push(Tm(s,n,!0))})}),Promise.all(i).then(()=>{Em(n),n.sdfTexture.needsUpdate=!0})})}function EE(n,e){for(let t in e)e.hasOwnProperty(t)&&(n[t]=e[t]);return n}let xa;function wE(n){return xa||(xa=typeof document>"u"?{}:document.createElement("a")),xa.href=n,xa.href}function Em(n){if(typeof createImageBitmap!="function"){console.info("Safari<15: applying SDF canvas workaround");const{sdfCanvas:e,sdfTexture:t}=n,{width:i,height:r}=e,s=n.sdfCanvas.getContext("webgl");let a=t.image.data;(!a||a.length!==i*r*4)&&(a=new Uint8Array(i*r*4),t.image={width:i,height:r,data:a},t.flipY=!1,t.isDataTexture=!0),s.readPixels(0,0,i,r,s.RGBA,s.UNSIGNED_BYTE,a)}}const AE=Vr({name:"Typesetter",dependencies:[dE,fE,JT],init(n,e,t){return n(e,t())}}),wm=Vr({name:"Typesetter",dependencies:[AE],init(n){return function(e){return new Promise(t=>{n.typeset(e,t)})}},getTransferables(n){const e=[];for(let t in n)n[t]&&n[t].buffer&&e.push(n[t].buffer);return e}});wm.onMainThread;const zf={};function CE(n){let e=zf[n];return e||(e=zf[n]=new $i(1,1,n,n).translate(.5,.5,0)),e}const RE="aTroikaGlyphBounds",Vf="aTroikaGlyphIndex",PE="aTroikaGlyphColor";class DE extends j0{constructor(){super(),this.detail=1,this.curveRadius=0,this.groups=[{start:0,count:1/0,materialIndex:0},{start:0,count:1/0,materialIndex:1}],this.boundingSphere=new Zi,this.boundingBox=new ai}computeBoundingSphere(){}computeBoundingBox(){}set detail(e){if(e!==this._detail){this._detail=e,(typeof e!="number"||e<1)&&(e=1);let t=CE(e);["position","normal","uv"].forEach(i=>{this.attributes[i]=t.attributes[i].clone()}),this.setIndex(t.getIndex().clone())}}get detail(){return this._detail}set curveRadius(e){e!==this._curveRadius&&(this._curveRadius=e,this._updateBounds())}get curveRadius(){return this._curveRadius}updateGlyphs(e,t,i,r,s){this.updateAttributeData(RE,e,4),this.updateAttributeData(Vf,t,1),this.updateAttributeData(PE,s,3),this._blockBounds=i,this._chunkedBounds=r,this.instanceCount=t.length,this._updateBounds()}_updateBounds(){const e=this._blockBounds;if(e){const{curveRadius:t,boundingBox:i}=this;if(t){const{PI:r,floor:s,min:a,max:o,sin:l,cos:c}=Math,u=r/2,h=r*2,f=Math.abs(t),d=e[0]/f,g=e[2]/f,v=s((d+u)/h)!==s((g+u)/h)?-f:a(l(d)*f,l(g)*f),m=s((d-u)/h)!==s((g-u)/h)?f:o(l(d)*f,l(g)*f),p=s((d+r)/h)!==s((g+r)/h)?f*2:o(f-c(d)*f,f-c(g)*f);i.min.set(v,e[1],t<0?-p:0),i.max.set(m,e[3],t<0?0:p)}else i.min.set(e[0],e[1],0),i.max.set(e[2],e[3],0);i.getBoundingSphere(this.boundingSphere)}}applyClipRect(e){let t=this.getAttribute(Vf).count,i=this._chunkedBounds;if(i)for(let r=i.length;r--;){t=i[r].end;let s=i[r].rect;if(s[1]<e.w&&s[3]>e.y&&s[0]<e.z&&s[2]>e.x)break}this.instanceCount=t}updateAttributeData(e,t,i){const r=this.getAttribute(e);t?r&&r.array.length===t.length?(r.array.set(t),r.needsUpdate=!0):(this.setAttribute(e,new mc(t,i)),delete this._maxInstanceCount,this.dispose()):r&&this.deleteAttribute(e)}}const LE=`
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform vec4 uTroikaTotalBounds;
uniform vec4 uTroikaClipRect;
uniform mat3 uTroikaOrient;
uniform bool uTroikaUseGlyphColors;
uniform float uTroikaEdgeOffset;
uniform float uTroikaBlurRadius;
uniform vec2 uTroikaPositionOffset;
uniform float uTroikaCurveRadius;
attribute vec4 aTroikaGlyphBounds;
attribute float aTroikaGlyphIndex;
attribute vec3 aTroikaGlyphColor;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec3 vTroikaGlyphColor;
varying vec2 vTroikaGlyphDimensions;
`,UE=`
vec4 bounds = aTroikaGlyphBounds;
bounds.xz += uTroikaPositionOffset.x;
bounds.yw -= uTroikaPositionOffset.y;

vec4 outlineBounds = vec4(
  bounds.xy - uTroikaEdgeOffset - uTroikaBlurRadius,
  bounds.zw + uTroikaEdgeOffset + uTroikaBlurRadius
);
vec4 clippedBounds = vec4(
  clamp(outlineBounds.xy, uTroikaClipRect.xy, uTroikaClipRect.zw),
  clamp(outlineBounds.zw, uTroikaClipRect.xy, uTroikaClipRect.zw)
);

vec2 clippedXY = (mix(clippedBounds.xy, clippedBounds.zw, position.xy) - bounds.xy) / (bounds.zw - bounds.xy);

position.xy = mix(bounds.xy, bounds.zw, clippedXY);

uv = (position.xy - uTroikaTotalBounds.xy) / (uTroikaTotalBounds.zw - uTroikaTotalBounds.xy);

float rad = uTroikaCurveRadius;
if (rad != 0.0) {
  float angle = position.x / rad;
  position.xz = vec2(sin(angle) * rad, rad - cos(angle) * rad);
  normal.xz = vec2(sin(angle), cos(angle));
}
  
position = uTroikaOrient * position;
normal = uTroikaOrient * normal;

vTroikaGlyphUV = clippedXY.xy;
vTroikaGlyphDimensions = vec2(bounds[2] - bounds[0], bounds[3] - bounds[1]);


float txCols = uTroikaSDFTextureSize.x / uTroikaSDFGlyphSize;
vec2 txUvPerSquare = uTroikaSDFGlyphSize / uTroikaSDFTextureSize;
vec2 txStartUV = txUvPerSquare * vec2(
  mod(floor(aTroikaGlyphIndex / 4.0), txCols),
  floor(floor(aTroikaGlyphIndex / 4.0) / txCols)
);
vTroikaTextureUVBounds = vec4(txStartUV, vec2(txStartUV) + txUvPerSquare);
vTroikaTextureChannel = mod(aTroikaGlyphIndex, 4.0);
`,NE=`
uniform sampler2D uTroikaSDFTexture;
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform float uTroikaSDFExponent;
uniform float uTroikaEdgeOffset;
uniform float uTroikaFillOpacity;
uniform float uTroikaBlurRadius;
uniform vec3 uTroikaStrokeColor;
uniform float uTroikaStrokeWidth;
uniform float uTroikaStrokeOpacity;
uniform bool uTroikaSDFDebug;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec2 vTroikaGlyphDimensions;

float troikaSdfValueToSignedDistance(float alpha) {
  // Inverse of exponential encoding in webgl-sdf-generator
  
  float maxDimension = max(vTroikaGlyphDimensions.x, vTroikaGlyphDimensions.y);
  float absDist = (1.0 - pow(2.0 * (alpha > 0.5 ? 1.0 - alpha : alpha), 1.0 / uTroikaSDFExponent)) * maxDimension;
  float signedDist = absDist * (alpha > 0.5 ? -1.0 : 1.0);
  return signedDist;
}

float troikaGlyphUvToSdfValue(vec2 glyphUV) {
  vec2 textureUV = mix(vTroikaTextureUVBounds.xy, vTroikaTextureUVBounds.zw, glyphUV);
  vec4 rgba = texture2D(uTroikaSDFTexture, textureUV);
  float ch = floor(vTroikaTextureChannel + 0.5); //NOTE: can't use round() in WebGL1
  return ch == 0.0 ? rgba.r : ch == 1.0 ? rgba.g : ch == 2.0 ? rgba.b : rgba.a;
}

float troikaGlyphUvToDistance(vec2 uv) {
  return troikaSdfValueToSignedDistance(troikaGlyphUvToSdfValue(uv));
}

float troikaGetAADist() {
  
  #if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300
  return length(fwidth(vTroikaGlyphUV * vTroikaGlyphDimensions)) * 0.5;
  #else
  return vTroikaGlyphDimensions.x / 64.0;
  #endif
}

float troikaGetFragDistValue() {
  vec2 clampedGlyphUV = clamp(vTroikaGlyphUV, 0.5 / uTroikaSDFGlyphSize, 1.0 - 0.5 / uTroikaSDFGlyphSize);
  float distance = troikaGlyphUvToDistance(clampedGlyphUV);
 
  // Extrapolate distance when outside bounds:
  distance += clampedGlyphUV == vTroikaGlyphUV ? 0.0 : 
    length((vTroikaGlyphUV - clampedGlyphUV) * vTroikaGlyphDimensions);

  

  return distance;
}

float troikaGetEdgeAlpha(float distance, float distanceOffset, float aaDist) {
  #if defined(IS_DEPTH_MATERIAL) || defined(IS_DISTANCE_MATERIAL)
  float alpha = step(-distanceOffset, -distance);
  #else

  float alpha = smoothstep(
    distanceOffset + aaDist,
    distanceOffset - aaDist,
    distance
  );
  #endif

  return alpha;
}
`,IE=`
float aaDist = troikaGetAADist();
float fragDistance = troikaGetFragDistValue();
float edgeAlpha = uTroikaSDFDebug ?
  troikaGlyphUvToSdfValue(vTroikaGlyphUV) :
  troikaGetEdgeAlpha(fragDistance, uTroikaEdgeOffset, max(aaDist, uTroikaBlurRadius));

#if !defined(IS_DEPTH_MATERIAL) && !defined(IS_DISTANCE_MATERIAL)
vec4 fillRGBA = gl_FragColor;
fillRGBA.a *= uTroikaFillOpacity;
vec4 strokeRGBA = uTroikaStrokeWidth == 0.0 ? fillRGBA : vec4(uTroikaStrokeColor, uTroikaStrokeOpacity);
if (fillRGBA.a == 0.0) fillRGBA.rgb = strokeRGBA.rgb;
gl_FragColor = mix(fillRGBA, strokeRGBA, smoothstep(
  -uTroikaStrokeWidth - aaDist,
  -uTroikaStrokeWidth + aaDist,
  fragDistance
));
gl_FragColor.a *= edgeAlpha;
#endif

if (edgeAlpha == 0.0) {
  discard;
}
`;function FE(n){const e=bc(n,{chained:!0,extensions:{derivatives:!0},uniforms:{uTroikaSDFTexture:{value:null},uTroikaSDFTextureSize:{value:new je},uTroikaSDFGlyphSize:{value:0},uTroikaSDFExponent:{value:0},uTroikaTotalBounds:{value:new gt(0,0,0,0)},uTroikaClipRect:{value:new gt(0,0,0,0)},uTroikaEdgeOffset:{value:0},uTroikaFillOpacity:{value:1},uTroikaPositionOffset:{value:new je},uTroikaCurveRadius:{value:0},uTroikaBlurRadius:{value:0},uTroikaStrokeWidth:{value:0},uTroikaStrokeColor:{value:new Ke},uTroikaStrokeOpacity:{value:1},uTroikaOrient:{value:new Ze},uTroikaUseGlyphColors:{value:!0},uTroikaSDFDebug:{value:!1}},vertexDefs:LE,vertexTransform:UE,fragmentDefs:NE,fragmentColorTransform:IE,customRewriter({vertexShader:t,fragmentShader:i}){let r=/\buniform\s+vec3\s+diffuse\b/;return r.test(i)&&(i=i.replace(r,"varying vec3 vTroikaGlyphColor").replace(/\bdiffuse\b/g,"vTroikaGlyphColor"),r.test(t)||(t=t.replace(bm,`uniform vec3 diffuse;
$&
vTroikaGlyphColor = uTroikaUseGlyphColors ? aTroikaGlyphColor / 255.0 : diffuse;
`))),{vertexShader:t,fragmentShader:i}}});return e.transparent=!0,e.forceSinglePass=!0,Object.defineProperties(e,{isTroikaTextMaterial:{value:!0},shadowSide:{get(){return this.side},set(){}}}),e}const cu=new Is({color:16777215,side:kn,transparent:!0}),Gf=8421504,Hf=new ut,ya=new te,al=new te,us=[],OE=new te,ol="+x+y";function Wf(n){return Array.isArray(n)?n[0]:n}let Am=()=>{const n=new zt(new $i(1,1),cu);return Am=()=>n,n},Cm=()=>{const n=new zt(new $i(1,1,32,1),cu);return Cm=()=>n,n};const kE={type:"syncstart"},BE={type:"synccomplete"},Rm=["font","fontSize","fontStyle","fontWeight","lang","letterSpacing","lineHeight","maxWidth","overflowWrap","text","direction","textAlign","textIndent","whiteSpace","anchorX","anchorY","colorRanges","sdfGlyphSize"],zE=Rm.concat("material","color","depthOffset","clipRect","curveRadius","orientation","glyphGeometryDetail");class Pm extends zt{constructor(){const e=new DE;super(e,null),this.text="",this.anchorX=0,this.anchorY=0,this.curveRadius=0,this.direction="auto",this.font=null,this.unicodeFontsURL=null,this.fontSize=.1,this.fontWeight="normal",this.fontStyle="normal",this.lang=null,this.letterSpacing=0,this.lineHeight="normal",this.maxWidth=1/0,this.overflowWrap="normal",this.textAlign="left",this.textIndent=0,this.whiteSpace="normal",this.material=null,this.color=null,this.colorRanges=null,this.outlineWidth=0,this.outlineColor=0,this.outlineOpacity=1,this.outlineBlur=0,this.outlineOffsetX=0,this.outlineOffsetY=0,this.strokeWidth=0,this.strokeColor=Gf,this.strokeOpacity=1,this.fillOpacity=1,this.depthOffset=0,this.clipRect=null,this.orientation=ol,this.glyphGeometryDetail=1,this.sdfGlyphSize=null,this.gpuAccelerateSDF=!0,this.debugSDF=!1}sync(e){this._needsSync&&(this._needsSync=!1,this._isSyncing?(this._queuedSyncs||(this._queuedSyncs=[])).push(e):(this._isSyncing=!0,this.dispatchEvent(kE),ME({text:this.text,font:this.font,lang:this.lang,fontSize:this.fontSize||.1,fontWeight:this.fontWeight||"normal",fontStyle:this.fontStyle||"normal",letterSpacing:this.letterSpacing||0,lineHeight:this.lineHeight||"normal",maxWidth:this.maxWidth,direction:this.direction||"auto",textAlign:this.textAlign,textIndent:this.textIndent,whiteSpace:this.whiteSpace,overflowWrap:this.overflowWrap,anchorX:this.anchorX,anchorY:this.anchorY,colorRanges:this.colorRanges,includeCaretPositions:!0,sdfGlyphSize:this.sdfGlyphSize,gpuAccelerateSDF:this.gpuAccelerateSDF,unicodeFontsURL:this.unicodeFontsURL},t=>{this._isSyncing=!1,this._textRenderInfo=t,this.geometry.updateGlyphs(t.glyphBounds,t.glyphAtlasIndices,t.blockBounds,t.chunkedBounds,t.glyphColors);const i=this._queuedSyncs;i&&(this._queuedSyncs=null,this._needsSync=!0,this.sync(()=>{i.forEach(r=>r&&r())})),this.dispatchEvent(BE),e&&e()})))}onBeforeRender(e,t,i,r,s,a){this.sync(),s.isTroikaTextMaterial&&this._prepareForRender(s)}dispose(){this.geometry.dispose()}get textRenderInfo(){return this._textRenderInfo||null}createDerivedMaterial(e){return FE(e)}get material(){let e=this._derivedMaterial;const t=this._baseMaterial||this._defaultMaterial||(this._defaultMaterial=cu.clone());if((!e||!e.isDerivedFrom(t))&&(e=this._derivedMaterial=this.createDerivedMaterial(t),t.addEventListener("dispose",function i(){t.removeEventListener("dispose",i),e.dispose()})),this.hasOutline()){let i=e._outlineMtl;return i||(i=e._outlineMtl=Object.create(e,{id:{value:e.id+.1}}),i.isTextOutlineMaterial=!0,i.depthWrite=!1,i.map=null,e.addEventListener("dispose",function r(){e.removeEventListener("dispose",r),i.dispose()})),[i,e]}else return e}set material(e){e&&e.isTroikaTextMaterial?(this._derivedMaterial=e,this._baseMaterial=e.baseMaterial):this._baseMaterial=e}hasOutline(){return!!(this.outlineWidth||this.outlineBlur||this.outlineOffsetX||this.outlineOffsetY)}get glyphGeometryDetail(){return this.geometry.detail}set glyphGeometryDetail(e){this.geometry.detail=e}get curveRadius(){return this.geometry.curveRadius}set curveRadius(e){this.geometry.curveRadius=e}get customDepthMaterial(){return Wf(this.material).getDepthMaterial()}set customDepthMaterial(e){}get customDistanceMaterial(){return Wf(this.material).getDistanceMaterial()}set customDistanceMaterial(e){}_prepareForRender(e){const t=e.isTextOutlineMaterial,i=e.uniforms,r=this.textRenderInfo;if(r){const{sdfTexture:o,blockBounds:l}=r;i.uTroikaSDFTexture.value=o,i.uTroikaSDFTextureSize.value.set(o.image.width,o.image.height),i.uTroikaSDFGlyphSize.value=r.sdfGlyphSize,i.uTroikaSDFExponent.value=r.sdfExponent,i.uTroikaTotalBounds.value.fromArray(l),i.uTroikaUseGlyphColors.value=!t&&!!r.glyphColors;let c=0,u=0,h=0,f,d,g,v=0,m=0;if(t){let{outlineWidth:y,outlineOffsetX:x,outlineOffsetY:_,outlineBlur:S,outlineOpacity:T}=this;c=this._parsePercent(y)||0,u=Math.max(0,this._parsePercent(S)||0),f=T,v=this._parsePercent(x)||0,m=this._parsePercent(_)||0}else h=Math.max(0,this._parsePercent(this.strokeWidth)||0),h&&(g=this.strokeColor,i.uTroikaStrokeColor.value.set(g??Gf),d=this.strokeOpacity,d==null&&(d=1)),f=this.fillOpacity;i.uTroikaEdgeOffset.value=c,i.uTroikaPositionOffset.value.set(v,m),i.uTroikaBlurRadius.value=u,i.uTroikaStrokeWidth.value=h,i.uTroikaStrokeOpacity.value=d,i.uTroikaFillOpacity.value=f??1,i.uTroikaCurveRadius.value=this.curveRadius||0;let p=this.clipRect;if(p&&Array.isArray(p)&&p.length===4)i.uTroikaClipRect.value.fromArray(p);else{const y=(this.fontSize||.1)*100;i.uTroikaClipRect.value.set(l[0]-y,l[1]-y,l[2]+y,l[3]+y)}this.geometry.applyClipRect(i.uTroikaClipRect.value)}i.uTroikaSDFDebug.value=!!this.debugSDF,e.polygonOffset=!!this.depthOffset,e.polygonOffsetFactor=e.polygonOffsetUnits=this.depthOffset||0;const s=t?this.outlineColor||0:this.color;if(s==null)delete e.color;else{const o=e.hasOwnProperty("color")?e.color:e.color=new Ke;(s!==o._input||typeof s=="object")&&o.set(o._input=s)}let a=this.orientation||ol;if(a!==e._orientation){let o=i.uTroikaOrient.value;a=a.replace(/[^-+xyz]/g,"");let l=a!==ol&&a.match(/^([-+])([xyz])([-+])([xyz])$/);if(l){let[,c,u,h,f]=l;ya.set(0,0,0)[u]=c==="-"?1:-1,al.set(0,0,0)[f]=h==="-"?-1:1,Hf.lookAt(OE,ya.cross(al),al),o.setFromMatrix4(Hf)}else o.identity();e._orientation=a}}_parsePercent(e){if(typeof e=="string"){let t=e.match(/^(-?[\d.]+)%$/),i=t?parseFloat(t[1]):NaN;e=(isNaN(i)?0:i/100)*this.fontSize}return e}localPositionToTextCoords(e,t=new je){t.copy(e);const i=this.curveRadius;return i&&(t.x=Math.atan2(e.x,Math.abs(i)-Math.abs(e.z))*Math.abs(i)),t}worldPositionToTextCoords(e,t=new je){return ya.copy(e),this.localPositionToTextCoords(this.worldToLocal(ya),t)}raycast(e,t){const{textRenderInfo:i,curveRadius:r}=this;if(i){const s=i.blockBounds,a=r?Cm():Am(),o=a.geometry,{position:l,uv:c}=o.attributes;for(let u=0;u<c.count;u++){let h=s[0]+c.getX(u)*(s[2]-s[0]);const f=s[1]+c.getY(u)*(s[3]-s[1]);let d=0;r&&(d=r-Math.cos(h/r)*r,h=Math.sin(h/r)*r),l.setXYZ(u,h,f,d)}o.boundingSphere=this.geometry.boundingSphere,o.boundingBox=this.geometry.boundingBox,a.matrixWorld=this.matrixWorld,a.material.side=this.material.side,us.length=0,a.raycast(e,us);for(let u=0;u<us.length;u++)us[u].object=this,t.push(us[u])}}copy(e){const t=this.geometry;return super.copy(e),this.geometry=t,zE.forEach(i=>{this[i]=e[i]}),this}clone(){return new this.constructor().copy(this)}}Rm.forEach(n=>{const e="_private_"+n;Object.defineProperty(Pm.prototype,n,{get(){return this[e]},set(t){t!==this[e]&&(this[e]=t,this._needsSync=!0)}})});new ai;new Ke;const VE=12,GE=16,jf=42,HE=260,Xf=1500,Yf=.6;function WE(n,e){const t=new xr,i=bi("--v2-ink-1","#ece7df").color,r=[],s=new te;let a=Xf;for(let u=0;u<n;u++){const h=new Pm;h.fontSize=VE,h.color=i.getHex(),h.anchorX="center",h.anchorY="bottom",h.outlineWidth="7%",h.outlineColor=0,h.outlineOpacity=.65,h.renderOrder=10,h.visible=!1,h.sync(),t.add(h),r.push({mesh:h,text:""})}function o(u,h){for(let f=0;f<r.length;f++){const d=r[f];if(!d)continue;const g=u[f];if(!g){d.mesh.visible&&(d.mesh.visible=!1);continue}d.mesh.visible=!0,d.mesh.position.set(g.x,g.y+GE,g.z),d.mesh.quaternion.copy(h.quaternion),d.text!==g.text&&(d.text=g.text,d.mesh.text=g.text.length>jf?`${g.text.slice(0,jf-1)}…`:g.text,d.mesh.sync(e)),d.mesh.getWorldPosition(s);const v=h.position.distanceTo(s),m=Math.max(1,a-HE),p=jE((a-v)/m);d.mesh.fillOpacity=p,d.mesh.outlineOpacity=.65*p,d.mesh.visible=p>.02}}function l(){for(const u of r){const h=u.mesh.material,f=Array.isArray(h)?h:[h];for(const d of f){const g=d==null?void 0:d.dispose;typeof g=="function"&&g.call(d)}u.mesh.dispose()}}function c(u){const h=u>0?u:Yf;a=Xf*(h/Yf)}return{group:t,render:o,setFadeScale:c,dispose:l}}function jE(n){return n<0?0:n>1?1:n}const XE=.02,qf=1,YE=Math.PI*2,qE=14,ll=28;function KE(n,e){const t=qM(n);if(!t)return $E();const{renderer:i,scene:r,camera:s}=t,a=new xr;r.add(a);const o=new NM(s,i.domElement);o.enableRotate=!0,o.enablePan=!0,o.screenSpacePanning=!0,o.enableZoom=!0,o.zoomToCursor=!0,o.minDistance=40,o.maxDistance=6e3,o.mouseButtons={LEFT:xn.PAN,MIDDLE:xn.DOLLY,RIGHT:xn.PAN},o.touches={ONE:xi.PAN,TWO:xi.DOLLY_PAN};const l=U=>{o.mouseButtons.LEFT=U.shiftKey?xn.ROTATE:xn.PAN},c=()=>{o.mouseButtons.LEFT=xn.PAN};window.addEventListener("keydown",l),window.addEventListener("keyup",l),window.addEventListener("blur",c);const u=()=>{I===0&&V()};o.addEventListener("change",u);let h=e,f={nodes:[],edges:[]},d=null,g=null,v=null,m=null,p=null,y=new Map,x=new Map,_=null,S=null,T=new Map,E=[],A=null,M=null,b=e.view,L="",P="",I=0,F=!1,K=!0,G=Math.max(1,n.clientWidth||1),$=Math.max(1,n.clientHeight||1);const O=Zf(),W=new q0,Y=new je;let N=null;function V(){S&&h.quality.labels&&S.render(Se(),s),m?m.render():i.render(r,s)}let ee=!1;function z(){ee||(ee=!0,requestAnimationFrame(()=>{ee=!1,V()}))}function j(){m&&(m.dispose(),m=null),p&&(r.remove(p.mesh),p.dispose(),p=null)}function ne(){I&&(cancelAnimationFrame(I),I=0),F=!1,g&&(a.remove(g.mesh),g.dispose(),g=null),v&&(a.remove(v.lines),v.dispose(),v=null),d&&(d.sim.stop(),d=null),_&&(a.remove(_),_.geometry.dispose(),_.material.dispose(),_=null),S&&(a.remove(S.group),S.dispose(),S=null),T=new Map,E=[],A=null,M=null,j(),a.rotation.set(0,0,0),a.scale.setScalar(1),y=new Map,x=new Map,L="",N=null,i.domElement.style.cursor="default"}function J(){const U=new Map;if(d)for(const Z of d.nodes)U.set(Z.id,{x:Z.x??0,y:Z.y??0,z:Z.z??0});if(ne(),P=h.forces?JSON.stringify(h.forces):"",f.nodes.length===0){V();return}d=pT(f,h.forces);let k=0;for(const Z of d.nodes){const ue=U.get(Z.id);ue&&(Z.x=ue.x,Z.y=ue.y,Z.z=ue.z,k++)}const X=k>0&&k>=d.nodes.length*.5;if(K=!X,d.sim.alpha(X?.3:qf),h.view==="tactical")for(const Z of d.nodes)Z.fz=0;b=h.view,y=new Map(d.nodes.map(Z=>[Z.id,Z])),x=HT(f.edges),v=ET(f,VT(f.nodes.length)),g=bT(f),g.setSizeScale(h.nodeScale??1),a.add(v.lines),a.add(g.mesh),T=new Map(f.nodes.map(Z=>[Z.id,Z.label])),E=[...f.nodes].sort((Z,ue)=>ue.importance-Z.importance).slice(0,80).map(Z=>Z.id),S=WE(ll,z),S.setFadeScale(h.labelFade??.6),a.add(S.group),h.quality.nebula&&(p=Rf(),r.add(p.mesh)),h.quality.bloom&&(m=Cf(i,r,s,G,$)),me(),L=Kf(h),B()}function re(U){if(_&&(a.remove(_),_.geometry.dispose(),_.material.dispose(),_=null),!U)return;const k=y.get(U),X=x.get(U);if(!k||!X||X.length===0)return;const Z=new Float32Array(X.length*6);let ue=0;for(const ve of X){const we=y.get(ve);we&&(Z[ue++]=k.x??0,Z[ue++]=k.y??0,Z[ue++]=k.z??0,Z[ue++]=we.x??0,Z[ue++]=we.y??0,Z[ue++]=we.z??0)}const le=new dn;le.setAttribute("position",new sn(Z.subarray(0,ue),3));const fe=bi("--g-thread","rgba(210,68,48,0.55)"),De=new iu({color:new Ke().copy(fe.color),transparent:!0,opacity:Math.max(.4,fe.alpha)});_=new Kp(le,De),_.frustumCulled=!1,a.add(_)}function me(){if(!g)return;const U=h.focusId??null,k=Math.max(1,h.focusDepth??1),X=U?Pf(x,U,k):null;A=X;const Z=!U&&N&&f.edges.length>0?Pf(x,N,1):null,ue=h.highlightIds&&h.highlightIds.length>0?new Set(h.highlightIds):null,le=h.searchIds?new Set(h.searchIds):null;g.setVisualState({focusId:U,nearSet:X,highlightSet:ue,searchSet:le,hoverNearSet:Z}),v==null||v.setHighlight(U??N),U!==M&&(re(U),M=U),xe(),V()}function Se(){if(!S)return[];const U=[],k=new Set,X=Z=>{if(!Z||k.has(Z)||U.length>=ll)return;const ue=y.get(Z),le=T.get(Z);ue&&le&&(U.push({id:Z,text:le,x:ue.x??0,y:ue.y??0,z:ue.z??0}),k.add(Z))};if(X(N),X(h.focusId??null),A)for(const Z of A)X(Z);for(const Z of E){if(U.length>=ll)break;X(Z)}return U}function xe(){d&&(g==null||g.sync(d.nodes),v==null||v.sync(y))}function he(){f.nodes.length!==0&&(h.quality.bloom&&!m?m=Cf(i,r,s,G,$):!h.quality.bloom&&m&&(m.dispose(),m=null),h.quality.nebula&&!p?(p=Rf(),r.add(p.mesh)):!h.quality.nebula&&p&&(r.remove(p.mesh),p.dispose(),p=null),v&&(v.lines.visible=h.quality.threads),S&&(S.group.visible=h.quality.labels),F&&I===0&&(h.quality.motion||h.quality.nebula)?B():V())}function Ie(){if(!d)return;const U=h.view==="tactical";for(const k of d.nodes)k.fz=U?0:null;F=!1,d.sim.alpha(.5),B()}function B(){I&&cancelAnimationFrame(I);const U=()=>{if(!d){I=0;return}const k=(Zf()-O)/1e3;if(!F&&d.sim.alpha()>XE?(d.sim.tick(),xe()):F||(F=!0,xe(),K&&Pe()),F&&h.quality.motion){const X=Math.sin(k*YE/qE);a.scale.setScalar(1+.006*X),a.rotation.y=.0032*X}h.quality.nebula&&(p==null||p.update(k)),V(),!F||h.quality.motion||h.quality.nebula?I=requestAnimationFrame(U):I=0};I=requestAnimationFrame(U)}function Pe(){if(!d||d.nodes.length===0)return;const U=jT(d.nodes,s.fov);U&&(s.position.set(U.cx,U.cy,U.cz+U.distance),o.target.set(U.cx,U.cy,U.cz),o.update(),s.updateProjectionMatrix())}function be(U,k){if(!g)return null;const X=i.domElement.getBoundingClientRect();if(X.width===0||X.height===0)return null;const Z=WT(U,k,X);Y.x=Z.x,Y.y=Z.y,W.setFromCamera(Y,s);const le=W.intersectObject(g.mesh,!1)[0];return le&&typeof le.instanceId=="number"?g.nodeIdAt(le.instanceId)??null:null}let Ee=null,se=!1;const Ae=U=>{Ee={x:U.clientX,y:U.clientY},se=!1},de=U=>{var X;if(U.buttons!==0){Ee&&Math.hypot(U.clientX-Ee.x,U.clientY-Ee.y)>5&&(se=!0);return}const k=be(U.clientX,U.clientY);k!==N&&(N=k,i.domElement.style.cursor=k?"pointer":"default",(X=h.onHover)==null||X.call(h,k),me())},C=U=>{var X;if(se){se=!1;return}const k=be(U.clientX,U.clientY);k&&((X=h.onSelect)==null||X.call(h,k,U.shiftKey))},w=U=>{var X;if(se){se=!1,U.preventDefault();return}const k=be(U.clientX,U.clientY);k&&(U.preventDefault(),(X=h.onSelect)==null||X.call(h,k,!1))};return i.domElement.addEventListener("pointerdown",Ae),i.domElement.addEventListener("pointermove",de),i.domElement.addEventListener("click",C),i.domElement.addEventListener("contextmenu",w),{setModel(U){f=U,J()},setOptions(U){const k=h.quality;h={...h,...U},U.quality&&ZE(k,h.quality)&&he(),h.view!==b&&(b=h.view,Ie());const X=Kf(h);if(X!==L&&(L=X,me()),U.nodeScale!==void 0&&g&&(g.setSizeScale(h.nodeScale??1),xe(),V()),U.labelFade!==void 0&&S&&(S.setFadeScale(h.labelFade??.6),V()),d&&h.forces){const Z=JSON.stringify(h.forces);Z!==P&&(P=Z,vm(d.sim,h.forces),F=!1,K=!1,d.sim.alpha(.4),B())}},resize(U,k){U===0||k===0||(G=U,$=k,i.setSize(U,k,!1),s.aspect=U/k,s.updateProjectionMatrix(),m==null||m.setSize(U,k),o.update(),V())},fit(){Pe(),V()},relayout(){d&&(F=!1,K=!0,d.sim.alpha(qf),B())},dispose(){i.domElement.removeEventListener("pointerdown",Ae),i.domElement.removeEventListener("pointermove",de),i.domElement.removeEventListener("click",C),i.domElement.removeEventListener("contextmenu",w),o.removeEventListener("change",u),window.removeEventListener("keydown",l),window.removeEventListener("keyup",l),window.removeEventListener("blur",c),o.dispose(),ne(),t.dispose()}}}function Kf(n){const e=n.searchIds==null?"none":`q[${n.searchIds.join(",")}]`;return[n.focusId??"",n.focusDepth??1,(n.highlightIds??[]).join(","),e].join("|")}function ZE(n,e){return n.bloom!==e.bloom||n.nebula!==e.nebula||n.motion!==e.motion||n.threads!==e.threads||n.labels!==e.labels}function Zf(){return typeof performance<"u"&&typeof performance.now=="function"?performance.now():0}function $E(){return{setModel(){},setOptions(){},resize(){},fit(){},relayout(){},dispose(){}}}const JE=ae.forwardRef(function({model:e,options:t,className:i},r){const s=ae.useRef(null),a=ae.useRef(null),o=ae.useRef(null),l=ae.useRef(t);l.current=t;const[c]=ae.useState(()=>YM());return ae.useImperativeHandle(r,()=>({fit:()=>{var u;return(u=o.current)==null?void 0:u.fit()},relayout:()=>{var u;return(u=o.current)==null?void 0:u.relayout()}}),[]),ae.useEffect(()=>{if(!c)return;const u=a.current,h=s.current;if(!u||!h)return;const f=KE(u,l.current);o.current=f;const d=()=>{f.resize(h.clientWidth,h.clientHeight)};d(),f.setModel(e),d();const g=new ResizeObserver(d);return g.observe(h),()=>{g.disconnect(),f.dispose(),o.current=null}},[]),ae.useEffect(()=>{var u;(u=o.current)==null||u.setModel(e)},[e]),ae.useEffect(()=>{var u;(u=o.current)==null||u.setOptions(t)},[t]),c?D.jsx("div",{ref:s,className:i,"data-testid":"brain-graph-canvas-wrap","data-view":t.view,"data-node-count":e.nodes.length,style:{position:"absolute",inset:0},children:D.jsx("canvas",{ref:a,"aria-hidden":"true",style:{display:"block",width:"100%",height:"100%"}})}):D.jsx("div",{className:i,"data-testid":"brain-graph-canvas-wrap",style:{position:"absolute",inset:0,display:"grid",placeItems:"center",padding:24},children:D.jsxs("div",{className:"zaki-galaxy-fallback",role:"status",children:[D.jsx("p",{className:"zaki-galaxy-fallback__title",children:"The 3D Explore view needs WebGL"}),D.jsxs("p",{className:"zaki-galaxy-fallback__body",children:["Your browser or device doesn’t have WebGL (3D graphics) available. Everything else — your themes, timeline, and memories — is on the ",D.jsx("strong",{children:"Home"})," tab."]})]})})});function Dm({userId:n,memoryKey:e,onClose:t}){var a;const{data:i,isLoading:r,isError:s}=$v(n,e);return e?D.jsxs("aside",{className:"zaki-galaxy-detail","data-testid":"brain-galaxy-detail","aria-label":"Memory detail",children:[D.jsxs("header",{className:"zaki-galaxy-detail__head",children:[D.jsx("span",{className:"zaki-galaxy-detail__tag",children:i?Yc[i.kind]??i.kind:"Memory"}),D.jsx("button",{type:"button",className:"zaki-galaxy-detail__close","aria-label":"Close detail",onClick:t,children:"✕"})]}),r?D.jsx("p",{className:"zaki-galaxy-detail__muted",children:"Loading…"}):s?D.jsx("p",{className:"zaki-galaxy-detail__muted",children:"Couldn’t load this memory."}):i?D.jsxs("div",{className:"zaki-galaxy-detail__body",children:[D.jsx("h3",{className:"zaki-galaxy-detail__title",children:i.summary||i.content||i.id}),D.jsxs("div",{className:"zaki-galaxy-detail__meta",children:[(()=>{var l;const o=((l=i.source)==null?void 0:l.timestamp)??i.created_at;return o?D.jsxs("span",{children:["Learned ",Jf(o)]}):null})(),$f(i.confidence_score)?D.jsxs("span",{children:["· ",$f(i.confidence_score)]}):null,i.valid_to!=null?D.jsx("span",{className:"zaki-galaxy-detail__badge",children:"superseded"}):null]}),i.content&&i.content!==i.summary?D.jsxs("section",{className:"zaki-galaxy-detail__section",children:[D.jsx("span",{className:"zaki-galaxy-detail__label",children:"Content"}),D.jsx("p",{className:"zaki-galaxy-detail__prose",children:i.content})]}):null,(a=i.source)!=null&&a.snippet?D.jsxs("section",{className:"zaki-galaxy-detail__section",children:[D.jsx("span",{className:"zaki-galaxy-detail__label",children:"Where this came from"}),D.jsx("blockquote",{className:"zaki-galaxy-detail__quote",children:i.source.snippet})]}):null,i.valid_history&&i.valid_history.length>0?D.jsxs("section",{className:"zaki-galaxy-detail__section",children:[D.jsxs("span",{className:"zaki-galaxy-detail__label",children:["History · ",i.valid_history.length]}),D.jsx("ul",{className:"zaki-galaxy-detail__chain",children:i.valid_history.slice(0,6).map((o,l)=>D.jsxs("li",{children:[D.jsx("span",{className:"zaki-galaxy-detail__when",children:Jf(o.valid_from)}),o.content]},`${o.valid_from}-${l}`))})]}):null,i.linked_memories&&i.linked_memories.length>0?D.jsxs("section",{className:"zaki-galaxy-detail__section",children:[D.jsxs("span",{className:"zaki-galaxy-detail__label",children:["Connected · ",i.linked_memories.length]}),D.jsx("ul",{className:"zaki-galaxy-detail__links",children:i.linked_memories.slice(0,8).map((o,l)=>D.jsxs("li",{children:[D.jsx("span",{className:"zaki-galaxy-detail__rel",children:o.link_type}),o.summary]},o.id??`${o.link_type}-${l}`))})]}):null]}):D.jsx("p",{className:"zaki-galaxy-detail__muted",children:"This memory is no longer available."})]}):null}function $f(n){return typeof n!="number"?null:n>=.8?"high confidence":n>=.5?"medium confidence":"low confidence"}function Jf(n){const e=n>1e12?n:n*1e3,t=Math.floor((Date.now()-e)/864e5);if(!Number.isFinite(t)||t<0)return"";if(t===0)return"today";if(t===1)return"1d ago";if(t<30)return`${t}d ago`;const i=Math.floor(t/30);return i<12?`${i}mo ago`:`${Math.floor(i/12)}y ago`}function QE(n){const e=n<1e12?n*1e3:n,t=Math.floor((Date.now()-e)/864e5);return t<=0?"today":t===1?"yesterday":t<30?`${t}d ago`:t<365?`${Math.floor(t/30)}mo ago`:`${Math.floor(t/365)}y ago`}const ew=ae.forwardRef(function({userId:e,selectedIds:t,onSelectionChange:i,filters:r,selfKey:s,highlightKeys:a,view:o,fx:l,depth:c,focusId:u,onFocusChange:h,scope:f,onScopeChange:d},g){const v=_p(e,{max_nodes:r.maxNodes,exclude_orphans:r.excludeOrphans,link_types:r.linkTypes.length>0?r.linkTypes.join(","):void 0,semantic_min_weight:r.semanticEdgeThreshold}),m=Xc(e),p=ae.useMemo(()=>{var O;return x_((O=m.data)==null?void 0:O.communities)},[m.data]),y=f.kind==="overview"&&p.nodes.length>0,x=ae.useMemo(()=>{if(f.kind==="overview"){if(m.isLoading)return{nodes:[],edges:[]};if(p.nodes.length>0)return p}const O=f.kind==="cluster"?y_(v.data,f.id):v.data;return S_(O,{colorPreset:r.colorPreset,selfKey:s,semanticEdgeThreshold:r.semanticEdgeThreshold})},[f,m.isLoading,p,v.data,r.colorPreset,r.semanticEdgeThreshold,s]),_=ae.useMemo(()=>{var W;const O=new Map;for(const Y of((W=v.data)==null?void 0:W.nodes)??[])O.set(Y.id,Y.id),Y.key&&O.set(Y.key,Y.id);return O},[v.data]),S=ae.useMemo(()=>{var W;const O=new Map;for(const Y of((W=v.data)==null?void 0:W.nodes)??[])O.set(Y.id,Y.key??Y.id);return O},[v.data]),[T,E]=ae.useState(null),A=ae.useMemo(()=>{var Y,N;const O=new Map;for(const V of((Y=v.data)==null?void 0:Y.edges)??[])O.set(V.source,(O.get(V.source)??0)+1),O.set(V.target,(O.get(V.target)??0)+1);const W=new Map;for(const V of((N=v.data)==null?void 0:N.nodes)??[]){const ee=V.community_name&&!/^Cluster \d+$/.test(V.community_name);W.set(V.id,{title:V.display_label||V.summary||V.key||V.id,kind:Yc[V.kind]??V.kind,theme:ee?V.community_name:null,createdAt:V.created_at,degree:O.get(V.id)??0})}return W},[v.data]),M=ae.useMemo(()=>{var W;if(!T)return null;const O=sh(T);if(O!=null){const Y=(W=m.data)==null?void 0:W.communities.find(N=>N.community_id===O);return Y?{title:Y.name,kind:"Theme",theme:null,createdAt:void 0,degree:0,memberCount:Y.member_count}:null}return A.get(T)??null},[T,A,m.data]),b=ae.useMemo(()=>a.map(O=>_.get(O)).filter(O=>!!O),[a,_]),L=ae.useMemo(()=>{const O=r.search.trim().toLowerCase();return O?x.nodes.filter(W=>W.label.toLowerCase().includes(O)||W.id.toLowerCase().includes(O)).map(W=>W.id):null},[r.search,x]),P=ae.useMemo(()=>{var W,Y;if(f.kind!=="cluster")return null;const O=((Y=(W=m.data)==null?void 0:W.communities.find(N=>N.community_id===f.id))==null?void 0:Y.member_count)??null;return{shown:x.nodes.length,total:O}},[f,m.data,x.nodes.length]);ae.useEffect(()=>{u&&!x.nodes.some(O=>O.id===u)&&h(null,null)},[x,u,h]),ae.useEffect(()=>{T&&!x.nodes.some(O=>O.id===T)&&E(null)},[x,T]);const I=ae.useCallback((O,W)=>{var N;if(y){const V=sh(O);if(V!=null){const ee=(N=m.data)==null?void 0:N.communities.find(z=>z.community_id===V);d({kind:"cluster",id:V,name:(ee==null?void 0:ee.name)??`Cluster ${V}`})}return}if(W){i(t.includes(O)?t.filter(V=>V!==O):[...t,O]);return}const Y=u===O?null:O;h(Y,Y?S.get(Y)??Y:null)},[y,m.data,d,i,t,u,h,S]),[F,K]=ae.useState(GT);ae.useEffect(()=>{if(typeof window>"u"||typeof window.matchMedia!="function")return;const O=window.matchMedia("(prefers-reduced-motion: reduce)"),W=()=>K(O.matches);return W(),O.addEventListener("change",W),()=>O.removeEventListener("change",W)},[]);const G=ae.useMemo(()=>zT(l,x.nodes.length,F),[l,x.nodes.length,F]),$=ae.useMemo(()=>({view:o,quality:G,nodeScale:r.nodeSizeScale,labelFade:r.textFadeThreshold,forces:{center:r.gravity,repel:r.nodeRepulsion,linkDistance:r.idealEdgeLength,linkStrength:r.edgeElasticity},selectedIds:t,focusId:u,focusDepth:c,highlightIds:b,searchIds:L,onSelect:I,onHover:E}),[o,G,r.nodeSizeScale,r.textFadeThreshold,r.gravity,r.nodeRepulsion,r.idealEdgeLength,r.edgeElasticity,t,u,c,b,L,I]);return D.jsxs(D.Fragment,{children:[D.jsx(JE,{ref:g,model:x,options:$,className:"zaki-brain-v2__galaxy"}),L?D.jsxs("div",{className:"zaki-galaxy-searchcount",role:"status",children:[L.length," ",L.length===1?"match":"matches"]}):P&&P.total!=null?D.jsx("div",{className:"zaki-galaxy-searchcount",role:"status",children:P.shown>=P.total?`${P.total} ${P.total===1?"memory":"memories"}`:`Showing ${P.shown} of ${P.total}`}):null,u?D.jsx("div",{className:"zaki-galaxy-card zaki-galaxy-card--detail",children:D.jsx(Dm,{userId:e,memoryKey:S.get(u)??u,onClose:()=>h(null,null)})}):M?D.jsxs("div",{className:"zaki-galaxy-brief",role:"status",children:[D.jsx("div",{className:"zaki-galaxy-brief__title",children:M.title}),D.jsxs("div",{className:"zaki-galaxy-brief__meta",children:[M.kind,M.theme?` · ${M.theme}`:"",M.createdAt?` · ${QE(M.createdAt)}`:"",M.memberCount!=null?` · ${M.memberCount} memories`:` · ${M.degree} connection${M.degree===1?"":"s"}`]}),D.jsx("div",{className:"zaki-galaxy-brief__hint",children:"Click to open · Shift-drag to spin"})]}):null]})}),tw=365*24*3600;function Qf(){return Math.floor(Date.now()/1e3)}function nw({userId:n}){const{t:e}=si(),t=ae.useRef(Qf()),i=t.current-tw,[r,s]=ae.useState(t.current),a=r>=t.current,o=a?void 0:r,{data:l,fetchNextPage:c,hasNextPage:u,isFetchingNextPage:h,isLoading:f,isError:d}=yp(n,{to:o}),g=ae.useMemo(()=>(l==null?void 0:l.pages.flatMap(S=>S.entries))??[],[l]),v=ae.useMemo(()=>{const S=[];for(const T of g){const E=new Date(T.created_at*1e3).toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"}),A=S[S.length-1];A&&A.label===E?A.entries.push(T):S.push({label:E,entries:[T]})}return S},[g]),m=ae.useRef(null),p=ae.useRef(h);ae.useEffect(()=>{p.current=h},[h]),ae.useEffect(()=>{const S=m.current;if(!S)return;const T=new IntersectionObserver(E=>{for(const A of E)A.isIntersecting&&u&&!p.current&&c()},{rootMargin:"200px"});return T.observe(S),()=>T.disconnect()},[u,c]);const y=ae.useCallback(S=>{s(Number(S.target.value))},[]),x=ae.useCallback(()=>{t.current=Qf(),s(t.current)},[]),_=ae.useMemo(()=>a?e("brain.timeline.slider.now"):e("brain.timeline.slider.asOf",{date:new Date(r*1e3).toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}),[a,r,e]);return f?D.jsx("div",{className:"py-6 text-sm text-zaki-muted",children:"…"}):d?D.jsx("div",{className:"py-6 text-center text-sm text-zaki-muted",children:e("brain.error.loadFailed")}):D.jsxs("div",{className:"relative",children:[D.jsxs("div",{className:"mb-5 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-4 py-3",children:[D.jsxs("div",{className:"mb-2 flex items-center justify-between",children:[D.jsx("span",{className:"text-[11px] font-semibold uppercase tracking-wider text-zaki-muted",children:e("brain.timeline.slider.label")}),D.jsxs("span",{className:"flex items-center gap-2",children:[D.jsx("span",{className:`text-xs font-medium tabular-nums transition-colors ${a?"text-zaki-muted":"text-zaki-brand"}`,children:_}),!a&&D.jsx("button",{type:"button",onClick:x,"aria-label":e("brain.timeline.slider.resetAria"),className:"rounded px-1.5 py-0.5 text-[10px] font-medium text-zaki-brand ring-1 ring-zaki-brand-40 hover:bg-zaki-brand-10 focus:outline-none focus:ring-2",children:e("brain.timeline.slider.now")})]})]}),D.jsx("input",{type:"range",min:i,max:t.current,step:3600,value:r,onChange:y,"aria-label":e("brain.timeline.slider.label"),"aria-valuetext":_,className:"h-1.5 w-full cursor-pointer appearance-none rounded-[2px] bg-zaki-border accent-zaki-brand"}),D.jsxs("div",{className:"mt-1 flex justify-between text-[9px] text-zaki-muted",children:[D.jsx("span",{children:new Date(i*1e3).toLocaleDateString(void 0,{month:"short",year:"numeric"})}),D.jsx("span",{children:e("brain.timeline.slider.now")})]})]}),v.map(S=>{var T;return D.jsxs("section",{className:"mb-6",children:[D.jsx("h3",{className:"sticky top-0 z-10 -mx-2 bg-zaki-base/95 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zaki-muted",children:S.label}),D.jsx("ul",{className:"mt-2 space-y-2",children:S.entries.map(E=>D.jsx(iw,{entry:E,t:e},E.id))})]},((T=S.entries[0])==null?void 0:T.id)??S.label)}),D.jsx("div",{ref:m,className:"h-8"}),h&&D.jsx("div",{className:"py-4 text-center text-xs text-zaki-muted",children:e("brain.timeline.loading")}),!u&&g.length>0&&D.jsx("div",{className:"py-4 text-center text-xs text-zaki-muted",children:e("brain.timeline.end")})]})}function iw({entry:n,t:e}){const t=n.valid_to!==null,i=n.kind==="core"||n.kind==="daily"||n.kind==="conversation"?e(`brain.timeline.kindLabel.${n.kind}`):n.kind;return D.jsxs("li",{className:`rounded-[2px] bg-zaki-raised p-3 ${t?"opacity-50":""}`,children:[D.jsxs("div",{className:"flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted",children:[D.jsx("span",{children:i}),t&&D.jsx("span",{className:"rounded-[2px] bg-zaki-base px-1.5 py-0.5 text-zaki-muted",children:e("brain.timeline.superseded")})]}),D.jsx("p",{className:"mt-1 text-sm text-zaki-text",children:n.summary})]})}const rw=/\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i,sw=24;function cl(n){return n.display_label||n.summary||n.key||n.id}function aw({userId:n,graph:e,graphLoading:t}){const i=Xc(n),[r,s]=ae.useState(null),[a,o]=ae.useState(null),l=ae.useMemo(()=>(e==null?void 0:e.nodes)??[],[e]),c=ae.useMemo(()=>{const g=new Map;for(const m of l){const p=m.community_id??null;if(p==null)continue;const y=g.get(p);y?y.push(m):g.set(p,[m])}const v=m=>m.importance??m.importance_score??0;for(const m of g.values())m.sort((p,y)=>v(y)-v(p));return g},[l]),u=ae.useMemo(()=>{var x;const g=(((x=i.data)==null?void 0:x.communities)??[]).filter(_=>_.member_count>0&&!rw.test(_.name)),v=_=>{const S=c.get(_.community_id)??[],T=_.name_source==="llm",E=T?_.name:S[0]?cl(S[0]):"Untitled theme";return{id:_.community_id,title:E,named:T,count:_.member_count,sample:S.slice(0,3).map(cl),color:no(_.community_id)}},m=(_,S)=>S.count-_.count,p=g.filter(_=>_.name_source==="llm").map(v).sort(m),y=g.filter(_=>_.name_source!=="llm").map(v).sort(m);return[...p,...y]},[i.data,c]),h=u.slice(0,sw),f=Math.max(0,u.length-h.length),d=i.isLoading||t;return D.jsxs("div",{className:"zaki-brain-home","data-testid":"brain-home",children:[D.jsxs("section",{className:"zaki-brain-home__section","aria-label":"Themes",children:[D.jsxs("h2",{className:"zaki-brain-home__heading",children:["Themes",u.length>0&&D.jsx("span",{className:"zaki-brain-home__count",children:u.length})]}),d?D.jsx("p",{className:"zaki-brain-home__muted",children:"Loading your themes…"}):h.length===0?D.jsx("p",{className:"zaki-brain-home__muted",children:"No themes yet."}):D.jsx("div",{className:"zaki-brain-home__cards",children:h.map(g=>{const v=r===g.id,m=c.get(g.id)??[];return D.jsxs("div",{className:`zaki-brain-home__card${v?" is-expanded":""}`,children:[D.jsxs("button",{type:"button",className:"zaki-brain-home__card-head",onClick:()=>s(v?null:g.id),"aria-expanded":v,children:[D.jsx("span",{className:"zaki-brain-home__swatch",style:{background:g.color},"aria-hidden":!0}),D.jsxs("span",{className:"zaki-brain-home__card-title",title:g.title,children:[g.title,!g.named&&D.jsx("span",{className:"zaki-brain-home__tag",children:"untitled"})]}),D.jsx("span",{className:"zaki-brain-home__card-count",children:g.count})]}),!v&&g.sample.length>0&&D.jsx("p",{className:"zaki-brain-home__sample",children:g.sample.join(" · ")}),v&&D.jsx("ul",{className:"zaki-brain-home__members",children:m.map(p=>D.jsx("li",{children:D.jsx("button",{type:"button",className:"zaki-brain-home__member",onClick:()=>o(p.key??p.id),children:cl(p)})},p.id))})]},g.id)})}),f>0&&D.jsxs("p",{className:"zaki-brain-home__muted",children:["+ ",f," more ",f===1?"theme":"themes"," — open Explore to see them all."]})]}),D.jsxs("section",{className:"zaki-brain-home__section","aria-label":"Timeline",children:[D.jsx("h2",{className:"zaki-brain-home__heading",children:"Timeline"}),D.jsx(nw,{userId:n})]}),a&&D.jsx("div",{className:"zaki-brain-home__drawer",role:"dialog","aria-label":"Memory detail",children:D.jsx(Dm,{userId:n,memoryKey:a,onClose:()=>o(null)})})]})}const ow=[{key:"labels",label:"Labels"},{key:"threads",label:"Edges"}];function ed({view:n,onViewChange:e,fx:t,onToggleFx:i,depth:r,onDepthChange:s,hasFocus:a,onFit:o,scope:l,onScopeChange:c}){return D.jsxs("div",{className:"zaki-galaxy-panel","data-testid":"brain-display-panel",children:[D.jsx(lw,{scope:l,onScopeChange:c}),D.jsxs("div",{className:"zaki-galaxy-panel__group",children:[D.jsx("span",{className:"zaki-galaxy-panel__label",children:"View"}),D.jsx(e_,{ariaLabel:"Graph view mode",value:n,onChange:e,fullWidth:!0,options:[{id:"spatial",label:"3D"},{id:"tactical",label:"Flat"}]})]}),D.jsxs("div",{className:"zaki-galaxy-panel__group",children:[D.jsx("span",{className:"zaki-galaxy-panel__label",children:"Display"}),D.jsx("div",{className:"zaki-galaxy-panel__toggles",children:ow.map(u=>D.jsx("button",{type:"button",className:"zaki-galaxy-panel__toggle","aria-pressed":t[u.key],onClick:()=>i(u.key),children:u.label},u.key))})]}),a&&D.jsxs("div",{className:"zaki-galaxy-panel__group",children:[D.jsxs("label",{className:"zaki-galaxy-panel__label",htmlFor:"brain-focus-depth",children:["Focus depth · ",r]}),D.jsx("input",{id:"brain-focus-depth",className:"zaki-galaxy-panel__range",type:"range",min:1,max:5,step:1,value:r,onChange:u=>s(Number(u.target.value))})]}),D.jsx("div",{className:"zaki-galaxy-panel__controls",children:D.jsx("button",{type:"button",className:"v2-btn v2-btn--sm",onClick:o,children:"Recenter view"})})]})}function lw({scope:n,onScopeChange:e}){if(n.kind==="overview")return D.jsxs("div",{className:"zaki-galaxy-panel__scope",children:[D.jsx("span",{className:"zaki-galaxy-panel__scope-title",children:"Clusters"}),D.jsx("span",{className:"zaki-galaxy-panel__scope-hint",children:"Tap a cluster to open it"}),D.jsx("button",{type:"button",className:"zaki-galaxy-panel__scope-link",onClick:()=>e({kind:"all"}),children:"Explore everything →"})]});const t=n.kind==="cluster"?n.name:"Everything";return D.jsxs("div",{className:"zaki-galaxy-panel__scope",children:[D.jsx("button",{type:"button",className:"zaki-galaxy-panel__scope-back",onClick:()=>e({kind:"overview"}),children:"← All clusters"}),D.jsx("span",{className:"zaki-galaxy-panel__scope-title",title:t,children:t})]})}const uu=ae.createContext({});function hu(n){const e=ae.useRef(null);return e.current===null&&(e.current=n()),e.current}const Lm=typeof window<"u",Um=Lm?ae.useLayoutEffect:ae.useEffect,co=ae.createContext(null);function fu(n,e){n.indexOf(e)===-1&&n.push(e)}function du(n,e){const t=n.indexOf(e);t>-1&&n.splice(t,1)}const Vn=(n,e,t)=>t>e?e:t<n?n:t;let pu=()=>{};const ri={},Nm=n=>/^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(n);function Im(n){return typeof n=="object"&&n!==null}const Fm=n=>/^0[^.\s]+$/u.test(n);function mu(n){let e;return()=>(e===void 0&&(e=n()),e)}const Mn=n=>n,cw=(n,e)=>t=>e(n(t)),ks=(...n)=>n.reduce(cw),Cs=(n,e,t)=>{const i=e-n;return i===0?1:(t-n)/i};class gu{constructor(){this.subscriptions=[]}add(e){return fu(this.subscriptions,e),()=>du(this.subscriptions,e)}notify(e,t,i){const r=this.subscriptions.length;if(r)if(r===1)this.subscriptions[0](e,t,i);else for(let s=0;s<r;s++){const a=this.subscriptions[s];a&&a(e,t,i)}}getSize(){return this.subscriptions.length}clear(){this.subscriptions.length=0}}const ti=n=>n*1e3,bn=n=>n/1e3;function Om(n,e){return e?n*(1e3/e):0}const km=(n,e,t)=>(((1-3*t+3*e)*n+(3*t-6*e))*n+3*e)*n,uw=1e-7,hw=12;function fw(n,e,t,i,r){let s,a,o=0;do a=e+(t-e)/2,s=km(a,i,r)-n,s>0?t=a:e=a;while(Math.abs(s)>uw&&++o<hw);return a}function Bs(n,e,t,i){if(n===e&&t===i)return Mn;const r=s=>fw(s,0,1,n,t);return s=>s===0||s===1?s:km(r(s),e,i)}const Bm=n=>e=>e<=.5?n(2*e)/2:(2-n(2*(1-e)))/2,zm=n=>e=>1-n(1-e),Vm=Bs(.33,1.53,.69,.99),vu=zm(Vm),Gm=Bm(vu),Hm=n=>(n*=2)<1?.5*vu(n):.5*(2-Math.pow(2,-10*(n-1))),_u=n=>1-Math.sin(Math.acos(n)),Wm=zm(_u),jm=Bm(_u),dw=Bs(.42,0,1,1),pw=Bs(0,0,.58,1),Xm=Bs(.42,0,.58,1),mw=n=>Array.isArray(n)&&typeof n[0]!="number",Ym=n=>Array.isArray(n)&&typeof n[0]=="number",gw={linear:Mn,easeIn:dw,easeInOut:Xm,easeOut:pw,circIn:_u,circInOut:jm,circOut:Wm,backIn:vu,backInOut:Gm,backOut:Vm,anticipate:Hm},vw=n=>typeof n=="string",td=n=>{if(Ym(n)){pu(n.length===4);const[e,t,i,r]=n;return Bs(e,t,i,r)}else if(vw(n))return gw[n];return n},Sa=["setup","read","resolveKeyframes","preUpdate","update","preRender","render","postRender"];function _w(n,e){let t=new Set,i=new Set,r=!1,s=!1;const a=new WeakSet;let o={delta:0,timestamp:0,isProcessing:!1};function l(u){a.has(u)&&(c.schedule(u),n()),u(o)}const c={schedule:(u,h=!1,f=!1)=>{const g=f&&r?t:i;return h&&a.add(u),g.has(u)||g.add(u),u},cancel:u=>{i.delete(u),a.delete(u)},process:u=>{if(o=u,r){s=!0;return}r=!0,[t,i]=[i,t],t.forEach(l),t.clear(),r=!1,s&&(s=!1,c.process(u))}};return c}const xw=40;function qm(n,e){let t=!1,i=!0;const r={delta:0,timestamp:0,isProcessing:!1},s=()=>t=!0,a=Sa.reduce((x,_)=>(x[_]=_w(s),x),{}),{setup:o,read:l,resolveKeyframes:c,preUpdate:u,update:h,preRender:f,render:d,postRender:g}=a,v=()=>{const x=ri.useManualTiming?r.timestamp:performance.now();t=!1,ri.useManualTiming||(r.delta=i?1e3/60:Math.max(Math.min(x-r.timestamp,xw),1)),r.timestamp=x,r.isProcessing=!0,o.process(r),l.process(r),c.process(r),u.process(r),h.process(r),f.process(r),d.process(r),g.process(r),r.isProcessing=!1,t&&e&&(i=!1,n(v))},m=()=>{t=!0,i=!0,r.isProcessing||n(v)};return{schedule:Sa.reduce((x,_)=>{const S=a[_];return x[_]=(T,E=!1,A=!1)=>(t||m(),S.schedule(T,E,A)),x},{}),cancel:x=>{for(let _=0;_<Sa.length;_++)a[Sa[_]].cancel(x)},state:r,steps:a}}const{schedule:pt,cancel:Ti,state:Nt,steps:ul}=qm(typeof requestAnimationFrame<"u"?requestAnimationFrame:Mn,!0);let Ia;function yw(){Ia=void 0}const Xt={now:()=>(Ia===void 0&&Xt.set(Nt.isProcessing||ri.useManualTiming?Nt.timestamp:performance.now()),Ia),set:n=>{Ia=n,queueMicrotask(yw)}},Km=n=>e=>typeof e=="string"&&e.startsWith(n),Zm=Km("--"),Sw=Km("var(--"),xu=n=>Sw(n)?bw.test(n.split("/*")[0].trim()):!1,bw=/var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;function nd(n){return typeof n!="string"?!1:n.split("/*")[0].includes("var(--")}const Gr={test:n=>typeof n=="number",parse:parseFloat,transform:n=>n},Rs={...Gr,transform:n=>Vn(0,1,n)},ba={...Gr,default:1},Ss=n=>Math.round(n*1e5)/1e5,yu=/-?(?:\d+(?:\.\d+)?|\.\d+)/gu;function Mw(n){return n==null}const Tw=/^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu,Su=(n,e)=>t=>!!(typeof t=="string"&&Tw.test(t)&&t.startsWith(n)||e&&!Mw(t)&&Object.prototype.hasOwnProperty.call(t,e)),$m=(n,e,t)=>i=>{if(typeof i!="string")return i;const[r,s,a,o]=i.match(yu);return{[n]:parseFloat(r),[e]:parseFloat(s),[t]:parseFloat(a),alpha:o!==void 0?parseFloat(o):1}},Ew=n=>Vn(0,255,n),hl={...Gr,transform:n=>Math.round(Ew(n))},Gi={test:Su("rgb","red"),parse:$m("red","green","blue"),transform:({red:n,green:e,blue:t,alpha:i=1})=>"rgba("+hl.transform(n)+", "+hl.transform(e)+", "+hl.transform(t)+", "+Ss(Rs.transform(i))+")"};function ww(n){let e="",t="",i="",r="";return n.length>5?(e=n.substring(1,3),t=n.substring(3,5),i=n.substring(5,7),r=n.substring(7,9)):(e=n.substring(1,2),t=n.substring(2,3),i=n.substring(3,4),r=n.substring(4,5),e+=e,t+=t,i+=i,r+=r),{red:parseInt(e,16),green:parseInt(t,16),blue:parseInt(i,16),alpha:r?parseInt(r,16)/255:1}}const Tc={test:Su("#"),parse:ww,transform:Gi.transform},zs=n=>({test:e=>typeof e=="string"&&e.endsWith(n)&&e.split(" ").length===1,parse:parseFloat,transform:e=>`${e}${n}`}),gi=zs("deg"),zn=zs("%"),Fe=zs("px"),Aw=zs("vh"),Cw=zs("vw"),id={...zn,parse:n=>zn.parse(n)/100,transform:n=>zn.transform(n*100)},Sr={test:Su("hsl","hue"),parse:$m("hue","saturation","lightness"),transform:({hue:n,saturation:e,lightness:t,alpha:i=1})=>"hsla("+Math.round(n)+", "+zn.transform(Ss(e))+", "+zn.transform(Ss(t))+", "+Ss(Rs.transform(i))+")"},bt={test:n=>Gi.test(n)||Tc.test(n)||Sr.test(n),parse:n=>Gi.test(n)?Gi.parse(n):Sr.test(n)?Sr.parse(n):Tc.parse(n),transform:n=>typeof n=="string"?n:n.hasOwnProperty("red")?Gi.transform(n):Sr.transform(n),getAnimatableNone:n=>{const e=bt.parse(n);return e.alpha=0,bt.transform(e)}},Rw=/(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;function Pw(n){var e,t;return isNaN(n)&&typeof n=="string"&&(((e=n.match(yu))==null?void 0:e.length)||0)+(((t=n.match(Rw))==null?void 0:t.length)||0)>0}const Jm="number",Qm="color",Dw="var",Lw="var(",rd="${}",Uw=/var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;function Ps(n){const e=n.toString(),t=[],i={color:[],number:[],var:[]},r=[];let s=0;const o=e.replace(Uw,l=>(bt.test(l)?(i.color.push(s),r.push(Qm),t.push(bt.parse(l))):l.startsWith(Lw)?(i.var.push(s),r.push(Dw),t.push(l)):(i.number.push(s),r.push(Jm),t.push(parseFloat(l))),++s,rd)).split(rd);return{values:t,split:o,indexes:i,types:r}}function eg(n){return Ps(n).values}function tg(n){const{split:e,types:t}=Ps(n),i=e.length;return r=>{let s="";for(let a=0;a<i;a++)if(s+=e[a],r[a]!==void 0){const o=t[a];o===Jm?s+=Ss(r[a]):o===Qm?s+=bt.transform(r[a]):s+=r[a]}return s}}const Nw=n=>typeof n=="number"?0:bt.test(n)?bt.getAnimatableNone(n):n;function Iw(n){const e=eg(n);return tg(n)(e.map(Nw))}const Ei={test:Pw,parse:eg,createTransformer:tg,getAnimatableNone:Iw};function fl(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*(2/3-t)*6:n}function Fw({hue:n,saturation:e,lightness:t,alpha:i}){n/=360,e/=100,t/=100;let r=0,s=0,a=0;if(!e)r=s=a=t;else{const o=t<.5?t*(1+e):t+e-t*e,l=2*t-o;r=fl(l,o,n+1/3),s=fl(l,o,n),a=fl(l,o,n-1/3)}return{red:Math.round(r*255),green:Math.round(s*255),blue:Math.round(a*255),alpha:i}}function qa(n,e){return t=>t>0?e:n}const vt=(n,e,t)=>n+(e-n)*t,dl=(n,e,t)=>{const i=n*n,r=t*(e*e-i)+i;return r<0?0:Math.sqrt(r)},Ow=[Tc,Gi,Sr],kw=n=>Ow.find(e=>e.test(n));function sd(n){const e=kw(n);if(!e)return!1;let t=e.parse(n);return e===Sr&&(t=Fw(t)),t}const ad=(n,e)=>{const t=sd(n),i=sd(e);if(!t||!i)return qa(n,e);const r={...t};return s=>(r.red=dl(t.red,i.red,s),r.green=dl(t.green,i.green,s),r.blue=dl(t.blue,i.blue,s),r.alpha=vt(t.alpha,i.alpha,s),Gi.transform(r))},Ec=new Set(["none","hidden"]);function Bw(n,e){return Ec.has(n)?t=>t<=0?n:e:t=>t>=1?e:n}function zw(n,e){return t=>vt(n,e,t)}function bu(n){return typeof n=="number"?zw:typeof n=="string"?xu(n)?qa:bt.test(n)?ad:Hw:Array.isArray(n)?ng:typeof n=="object"?bt.test(n)?ad:Vw:qa}function ng(n,e){const t=[...n],i=t.length,r=n.map((s,a)=>bu(s)(s,e[a]));return s=>{for(let a=0;a<i;a++)t[a]=r[a](s);return t}}function Vw(n,e){const t={...n,...e},i={};for(const r in t)n[r]!==void 0&&e[r]!==void 0&&(i[r]=bu(n[r])(n[r],e[r]));return r=>{for(const s in i)t[s]=i[s](r);return t}}function Gw(n,e){const t=[],i={color:0,var:0,number:0};for(let r=0;r<e.values.length;r++){const s=e.types[r],a=n.indexes[s][i[s]],o=n.values[a]??0;t[r]=o,i[s]++}return t}const Hw=(n,e)=>{const t=Ei.createTransformer(e),i=Ps(n),r=Ps(e);return i.indexes.var.length===r.indexes.var.length&&i.indexes.color.length===r.indexes.color.length&&i.indexes.number.length>=r.indexes.number.length?Ec.has(n)&&!r.values.length||Ec.has(e)&&!i.values.length?Bw(n,e):ks(ng(Gw(i,r),r.values),t):qa(n,e)};function ig(n,e,t){return typeof n=="number"&&typeof e=="number"&&typeof t=="number"?vt(n,e,t):bu(n)(n,e)}const Ww=n=>{const e=({timestamp:t})=>n(t);return{start:(t=!0)=>pt.update(e,t),stop:()=>Ti(e),now:()=>Nt.isProcessing?Nt.timestamp:Xt.now()}},rg=(n,e,t=10)=>{let i="";const r=Math.max(Math.round(e/t),2);for(let s=0;s<r;s++)i+=Math.round(n(s/(r-1))*1e4)/1e4+", ";return`linear(${i.substring(0,i.length-2)})`},Ka=2e4;function Mu(n){let e=0;const t=50;let i=n.next(e);for(;!i.done&&e<Ka;)e+=t,i=n.next(e);return e>=Ka?1/0:e}function jw(n,e=100,t){const i=t({...n,keyframes:[0,e]}),r=Math.min(Mu(i),Ka);return{type:"keyframes",ease:s=>i.next(r*s).value/e,duration:bn(r)}}const Xw=5;function sg(n,e,t){const i=Math.max(e-Xw,0);return Om(t-n(i),e-i)}const xt={stiffness:100,damping:10,mass:1,velocity:0,duration:800,bounce:.3,visualDuration:.3,restSpeed:{granular:.01,default:2},restDelta:{granular:.005,default:.5},minDuration:.01,maxDuration:10,minDamping:.05,maxDamping:1},pl=.001;function Yw({duration:n=xt.duration,bounce:e=xt.bounce,velocity:t=xt.velocity,mass:i=xt.mass}){let r,s,a=1-e;a=Vn(xt.minDamping,xt.maxDamping,a),n=Vn(xt.minDuration,xt.maxDuration,bn(n)),a<1?(r=c=>{const u=c*a,h=u*n,f=u-t,d=wc(c,a),g=Math.exp(-h);return pl-f/d*g},s=c=>{const h=c*a*n,f=h*t+t,d=Math.pow(a,2)*Math.pow(c,2)*n,g=Math.exp(-h),v=wc(Math.pow(c,2),a);return(-r(c)+pl>0?-1:1)*((f-d)*g)/v}):(r=c=>{const u=Math.exp(-c*n),h=(c-t)*n+1;return-pl+u*h},s=c=>{const u=Math.exp(-c*n),h=(t-c)*(n*n);return u*h});const o=5/n,l=Kw(r,s,o);if(n=ti(n),isNaN(l))return{stiffness:xt.stiffness,damping:xt.damping,duration:n};{const c=Math.pow(l,2)*i;return{stiffness:c,damping:a*2*Math.sqrt(i*c),duration:n}}}const qw=12;function Kw(n,e,t){let i=t;for(let r=1;r<qw;r++)i=i-n(i)/e(i);return i}function wc(n,e){return n*Math.sqrt(1-e*e)}const Zw=["duration","bounce"],$w=["stiffness","damping","mass"];function od(n,e){return e.some(t=>n[t]!==void 0)}function Jw(n){let e={velocity:xt.velocity,stiffness:xt.stiffness,damping:xt.damping,mass:xt.mass,isResolvedFromDuration:!1,...n};if(!od(n,$w)&&od(n,Zw))if(n.visualDuration){const t=n.visualDuration,i=2*Math.PI/(t*1.2),r=i*i,s=2*Vn(.05,1,1-(n.bounce||0))*Math.sqrt(r);e={...e,mass:xt.mass,stiffness:r,damping:s}}else{const t=Yw(n);e={...e,...t,mass:xt.mass},e.isResolvedFromDuration=!0}return e}function Za(n=xt.visualDuration,e=xt.bounce){const t=typeof n!="object"?{visualDuration:n,keyframes:[0,1],bounce:e}:n;let{restSpeed:i,restDelta:r}=t;const s=t.keyframes[0],a=t.keyframes[t.keyframes.length-1],o={done:!1,value:s},{stiffness:l,damping:c,mass:u,duration:h,velocity:f,isResolvedFromDuration:d}=Jw({...t,velocity:-bn(t.velocity||0)}),g=f||0,v=c/(2*Math.sqrt(l*u)),m=a-s,p=bn(Math.sqrt(l/u)),y=Math.abs(m)<5;i||(i=y?xt.restSpeed.granular:xt.restSpeed.default),r||(r=y?xt.restDelta.granular:xt.restDelta.default);let x;if(v<1){const S=wc(p,v);x=T=>{const E=Math.exp(-v*p*T);return a-E*((g+v*p*m)/S*Math.sin(S*T)+m*Math.cos(S*T))}}else if(v===1)x=S=>a-Math.exp(-p*S)*(m+(g+p*m)*S);else{const S=p*Math.sqrt(v*v-1);x=T=>{const E=Math.exp(-v*p*T),A=Math.min(S*T,300);return a-E*((g+v*p*m)*Math.sinh(A)+S*m*Math.cosh(A))/S}}const _={calculatedDuration:d&&h||null,next:S=>{const T=x(S);if(d)o.done=S>=h;else{let E=S===0?g:0;v<1&&(E=S===0?ti(g):sg(x,S,T));const A=Math.abs(E)<=i,M=Math.abs(a-T)<=r;o.done=A&&M}return o.value=o.done?a:T,o},toString:()=>{const S=Math.min(Mu(_),Ka),T=rg(E=>_.next(S*E).value,S,30);return S+"ms "+T},toTransition:()=>{}};return _}Za.applyToOptions=n=>{const e=jw(n,100,Za);return n.ease=e.ease,n.duration=ti(e.duration),n.type="keyframes",n};function Ac({keyframes:n,velocity:e=0,power:t=.8,timeConstant:i=325,bounceDamping:r=10,bounceStiffness:s=500,modifyTarget:a,min:o,max:l,restDelta:c=.5,restSpeed:u}){const h=n[0],f={done:!1,value:h},d=A=>o!==void 0&&A<o||l!==void 0&&A>l,g=A=>o===void 0?l:l===void 0||Math.abs(o-A)<Math.abs(l-A)?o:l;let v=t*e;const m=h+v,p=a===void 0?m:a(m);p!==m&&(v=p-h);const y=A=>-v*Math.exp(-A/i),x=A=>p+y(A),_=A=>{const M=y(A),b=x(A);f.done=Math.abs(M)<=c,f.value=f.done?p:b};let S,T;const E=A=>{d(f.value)&&(S=A,T=Za({keyframes:[f.value,g(f.value)],velocity:sg(x,A,f.value),damping:r,stiffness:s,restDelta:c,restSpeed:u}))};return E(0),{calculatedDuration:null,next:A=>{let M=!1;return!T&&S===void 0&&(M=!0,_(A),E(A)),S!==void 0&&A>=S?T.next(A-S):(!M&&_(A),f)}}}function Qw(n,e,t){const i=[],r=t||ri.mix||ig,s=n.length-1;for(let a=0;a<s;a++){let o=r(n[a],n[a+1]);if(e){const l=Array.isArray(e)?e[a]||Mn:e;o=ks(l,o)}i.push(o)}return i}function eA(n,e,{clamp:t=!0,ease:i,mixer:r}={}){const s=n.length;if(pu(s===e.length),s===1)return()=>e[0];if(s===2&&e[0]===e[1])return()=>e[1];const a=n[0]===n[1];n[0]>n[s-1]&&(n=[...n].reverse(),e=[...e].reverse());const o=Qw(e,i,r),l=o.length,c=u=>{if(a&&u<n[0])return e[0];let h=0;if(l>1)for(;h<n.length-2&&!(u<n[h+1]);h++);const f=Cs(n[h],n[h+1],u);return o[h](f)};return t?u=>c(Vn(n[0],n[s-1],u)):c}function tA(n,e){const t=n[n.length-1];for(let i=1;i<=e;i++){const r=Cs(0,e,i);n.push(vt(t,1,r))}}function nA(n){const e=[0];return tA(e,n.length-1),e}function iA(n,e){return n.map(t=>t*e)}function rA(n,e){return n.map(()=>e||Xm).splice(0,n.length-1)}function bs({duration:n=300,keyframes:e,times:t,ease:i="easeInOut"}){const r=mw(i)?i.map(td):td(i),s={done:!1,value:e[0]},a=iA(t&&t.length===e.length?t:nA(e),n),o=eA(a,e,{ease:Array.isArray(r)?r:rA(e,r)});return{calculatedDuration:n,next:l=>(s.value=o(l),s.done=l>=n,s)}}const sA=n=>n!==null;function Tu(n,{repeat:e,repeatType:t="loop"},i,r=1){const s=n.filter(sA),o=r<0||e&&t!=="loop"&&e%2===1?0:s.length-1;return!o||i===void 0?s[o]:i}const aA={decay:Ac,inertia:Ac,tween:bs,keyframes:bs,spring:Za};function ag(n){typeof n.type=="string"&&(n.type=aA[n.type])}class Eu{constructor(){this.updateFinished()}get finished(){return this._finished}updateFinished(){this._finished=new Promise(e=>{this.resolve=e})}notifyFinished(){this.resolve()}then(e,t){return this.finished.then(e,t)}}const oA=n=>n/100;class wu extends Eu{constructor(e){super(),this.state="idle",this.startTime=null,this.isStopped=!1,this.currentTime=0,this.holdTime=null,this.playbackSpeed=1,this.stop=()=>{var i,r;const{motionValue:t}=this.options;t&&t.updatedAt!==Xt.now()&&this.tick(Xt.now()),this.isStopped=!0,this.state!=="idle"&&(this.teardown(),(r=(i=this.options).onStop)==null||r.call(i))},this.options=e,this.initAnimation(),this.play(),e.autoplay===!1&&this.pause()}initAnimation(){const{options:e}=this;ag(e);const{type:t=bs,repeat:i=0,repeatDelay:r=0,repeatType:s,velocity:a=0}=e;let{keyframes:o}=e;const l=t||bs;l!==bs&&typeof o[0]!="number"&&(this.mixKeyframes=ks(oA,ig(o[0],o[1])),o=[0,100]);const c=l({...e,keyframes:o});s==="mirror"&&(this.mirroredGenerator=l({...e,keyframes:[...o].reverse(),velocity:-a})),c.calculatedDuration===null&&(c.calculatedDuration=Mu(c));const{calculatedDuration:u}=c;this.calculatedDuration=u,this.resolvedDuration=u+r,this.totalDuration=this.resolvedDuration*(i+1)-r,this.generator=c}updateTime(e){const t=Math.round(e-this.startTime)*this.playbackSpeed;this.holdTime!==null?this.currentTime=this.holdTime:this.currentTime=t}tick(e,t=!1){const{generator:i,totalDuration:r,mixKeyframes:s,mirroredGenerator:a,resolvedDuration:o,calculatedDuration:l}=this;if(this.startTime===null)return i.next(0);const{delay:c=0,keyframes:u,repeat:h,repeatType:f,repeatDelay:d,type:g,onUpdate:v,finalKeyframe:m}=this.options;this.speed>0?this.startTime=Math.min(this.startTime,e):this.speed<0&&(this.startTime=Math.min(e-r/this.speed,this.startTime)),t?this.currentTime=e:this.updateTime(e);const p=this.currentTime-c*(this.playbackSpeed>=0?1:-1),y=this.playbackSpeed>=0?p<0:p>r;this.currentTime=Math.max(p,0),this.state==="finished"&&this.holdTime===null&&(this.currentTime=r);let x=this.currentTime,_=i;if(h){const A=Math.min(this.currentTime,r)/o;let M=Math.floor(A),b=A%1;!b&&A>=1&&(b=1),b===1&&M--,M=Math.min(M,h+1),!!(M%2)&&(f==="reverse"?(b=1-b,d&&(b-=d/o)):f==="mirror"&&(_=a)),x=Vn(0,1,b)*o}const S=y?{done:!1,value:u[0]}:_.next(x);s&&(S.value=s(S.value));let{done:T}=S;!y&&l!==null&&(T=this.playbackSpeed>=0?this.currentTime>=r:this.currentTime<=0);const E=this.holdTime===null&&(this.state==="finished"||this.state==="running"&&T);return E&&g!==Ac&&(S.value=Tu(u,this.options,m,this.speed)),v&&v(S.value),E&&this.finish(),S}then(e,t){return this.finished.then(e,t)}get duration(){return bn(this.calculatedDuration)}get iterationDuration(){const{delay:e=0}=this.options||{};return this.duration+bn(e)}get time(){return bn(this.currentTime)}set time(e){var t;e=ti(e),this.currentTime=e,this.startTime===null||this.holdTime!==null||this.playbackSpeed===0?this.holdTime=e:this.driver&&(this.startTime=this.driver.now()-e/this.playbackSpeed),(t=this.driver)==null||t.start(!1)}get speed(){return this.playbackSpeed}set speed(e){this.updateTime(Xt.now());const t=this.playbackSpeed!==e;this.playbackSpeed=e,t&&(this.time=bn(this.currentTime))}play(){var r,s;if(this.isStopped)return;const{driver:e=Ww,startTime:t}=this.options;this.driver||(this.driver=e(a=>this.tick(a))),(s=(r=this.options).onPlay)==null||s.call(r);const i=this.driver.now();this.state==="finished"?(this.updateFinished(),this.startTime=i):this.holdTime!==null?this.startTime=i-this.holdTime:this.startTime||(this.startTime=t??i),this.state==="finished"&&this.speed<0&&(this.startTime+=this.calculatedDuration),this.holdTime=null,this.state="running",this.driver.start()}pause(){this.state="paused",this.updateTime(Xt.now()),this.holdTime=this.currentTime}complete(){this.state!=="running"&&this.play(),this.state="finished",this.holdTime=null}finish(){var e,t;this.notifyFinished(),this.teardown(),this.state="finished",(t=(e=this.options).onComplete)==null||t.call(e)}cancel(){var e,t;this.holdTime=null,this.startTime=0,this.tick(0),this.teardown(),(t=(e=this.options).onCancel)==null||t.call(e)}teardown(){this.state="idle",this.stopDriver(),this.startTime=this.holdTime=null}stopDriver(){this.driver&&(this.driver.stop(),this.driver=void 0)}sample(e){return this.startTime=0,this.tick(e,!0)}attachTimeline(e){var t;return this.options.allowFlatten&&(this.options.type="keyframes",this.options.ease="linear",this.initAnimation()),(t=this.driver)==null||t.stop(),e.observe(this)}}function lA(n){for(let e=1;e<n.length;e++)n[e]??(n[e]=n[e-1])}const Hi=n=>n*180/Math.PI,Cc=n=>{const e=Hi(Math.atan2(n[1],n[0]));return Rc(e)},cA={x:4,y:5,translateX:4,translateY:5,scaleX:0,scaleY:3,scale:n=>(Math.abs(n[0])+Math.abs(n[3]))/2,rotate:Cc,rotateZ:Cc,skewX:n=>Hi(Math.atan(n[1])),skewY:n=>Hi(Math.atan(n[2])),skew:n=>(Math.abs(n[1])+Math.abs(n[2]))/2},Rc=n=>(n=n%360,n<0&&(n+=360),n),ld=Cc,cd=n=>Math.sqrt(n[0]*n[0]+n[1]*n[1]),ud=n=>Math.sqrt(n[4]*n[4]+n[5]*n[5]),uA={x:12,y:13,z:14,translateX:12,translateY:13,translateZ:14,scaleX:cd,scaleY:ud,scale:n=>(cd(n)+ud(n))/2,rotateX:n=>Rc(Hi(Math.atan2(n[6],n[5]))),rotateY:n=>Rc(Hi(Math.atan2(-n[2],n[0]))),rotateZ:ld,rotate:ld,skewX:n=>Hi(Math.atan(n[4])),skewY:n=>Hi(Math.atan(n[1])),skew:n=>(Math.abs(n[1])+Math.abs(n[4]))/2};function Pc(n){return n.includes("scale")?1:0}function Dc(n,e){if(!n||n==="none")return Pc(e);const t=n.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);let i,r;if(t)i=uA,r=t;else{const o=n.match(/^matrix\(([-\d.e\s,]+)\)$/u);i=cA,r=o}if(!r)return Pc(e);const s=i[e],a=r[1].split(",").map(fA);return typeof s=="function"?s(a):a[s]}const hA=(n,e)=>{const{transform:t="none"}=getComputedStyle(n);return Dc(t,e)};function fA(n){return parseFloat(n.trim())}const Hr=["transformPerspective","x","y","z","translateX","translateY","translateZ","scale","scaleX","scaleY","rotate","rotateX","rotateY","rotateZ","skew","skewX","skewY"],Wr=new Set(Hr),hd=n=>n===Gr||n===Fe,dA=new Set(["x","y","z"]),pA=Hr.filter(n=>!dA.has(n));function mA(n){const e=[];return pA.forEach(t=>{const i=n.getValue(t);i!==void 0&&(e.push([t,i.get()]),i.set(t.startsWith("scale")?1:0))}),e}const yi={width:({x:n},{paddingLeft:e="0",paddingRight:t="0"})=>n.max-n.min-parseFloat(e)-parseFloat(t),height:({y:n},{paddingTop:e="0",paddingBottom:t="0"})=>n.max-n.min-parseFloat(e)-parseFloat(t),top:(n,{top:e})=>parseFloat(e),left:(n,{left:e})=>parseFloat(e),bottom:({y:n},{top:e})=>parseFloat(e)+(n.max-n.min),right:({x:n},{left:e})=>parseFloat(e)+(n.max-n.min),x:(n,{transform:e})=>Dc(e,"x"),y:(n,{transform:e})=>Dc(e,"y")};yi.translateX=yi.x;yi.translateY=yi.y;const ji=new Set;let Lc=!1,Uc=!1,Nc=!1;function og(){if(Uc){const n=Array.from(ji).filter(i=>i.needsMeasurement),e=new Set(n.map(i=>i.element)),t=new Map;e.forEach(i=>{const r=mA(i);r.length&&(t.set(i,r),i.render())}),n.forEach(i=>i.measureInitialState()),e.forEach(i=>{i.render();const r=t.get(i);r&&r.forEach(([s,a])=>{var o;(o=i.getValue(s))==null||o.set(a)})}),n.forEach(i=>i.measureEndState()),n.forEach(i=>{i.suspendedScrollY!==void 0&&window.scrollTo(0,i.suspendedScrollY)})}Uc=!1,Lc=!1,ji.forEach(n=>n.complete(Nc)),ji.clear()}function lg(){ji.forEach(n=>{n.readKeyframes(),n.needsMeasurement&&(Uc=!0)})}function gA(){Nc=!0,lg(),og(),Nc=!1}class Au{constructor(e,t,i,r,s,a=!1){this.state="pending",this.isAsync=!1,this.needsMeasurement=!1,this.unresolvedKeyframes=[...e],this.onComplete=t,this.name=i,this.motionValue=r,this.element=s,this.isAsync=a}scheduleResolve(){this.state="scheduled",this.isAsync?(ji.add(this),Lc||(Lc=!0,pt.read(lg),pt.resolveKeyframes(og))):(this.readKeyframes(),this.complete())}readKeyframes(){const{unresolvedKeyframes:e,name:t,element:i,motionValue:r}=this;if(e[0]===null){const s=r==null?void 0:r.get(),a=e[e.length-1];if(s!==void 0)e[0]=s;else if(i&&t){const o=i.readValue(t,a);o!=null&&(e[0]=o)}e[0]===void 0&&(e[0]=a),r&&s===void 0&&r.set(e[0])}lA(e)}setFinalKeyframe(){}measureInitialState(){}renderEndStyles(){}measureEndState(){}complete(e=!1){this.state="complete",this.onComplete(this.unresolvedKeyframes,this.finalKeyframe,e),ji.delete(this)}cancel(){this.state==="scheduled"&&(ji.delete(this),this.state="pending")}resume(){this.state==="pending"&&this.scheduleResolve()}}const vA=n=>n.startsWith("--");function _A(n,e,t){vA(e)?n.style.setProperty(e,t):n.style[e]=t}const xA=mu(()=>window.ScrollTimeline!==void 0),yA={};function SA(n,e){const t=mu(n);return()=>yA[e]??t()}const cg=SA(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0},"linearEasing"),vs=([n,e,t,i])=>`cubic-bezier(${n}, ${e}, ${t}, ${i})`,fd={linear:"linear",ease:"ease",easeIn:"ease-in",easeOut:"ease-out",easeInOut:"ease-in-out",circIn:vs([0,.65,.55,1]),circOut:vs([.55,0,1,.45]),backIn:vs([.31,.01,.66,-.59]),backOut:vs([.33,1.53,.69,.99])};function ug(n,e){if(n)return typeof n=="function"?cg()?rg(n,e):"ease-out":Ym(n)?vs(n):Array.isArray(n)?n.map(t=>ug(t,e)||fd.easeOut):fd[n]}function bA(n,e,t,{delay:i=0,duration:r=300,repeat:s=0,repeatType:a="loop",ease:o="easeOut",times:l}={},c=void 0){const u={[e]:t};l&&(u.offset=l);const h=ug(o,r);Array.isArray(h)&&(u.easing=h);const f={delay:i,duration:r,easing:Array.isArray(h)?"linear":h,fill:"both",iterations:s+1,direction:a==="reverse"?"alternate":"normal"};return c&&(f.pseudoElement=c),n.animate(u,f)}function hg(n){return typeof n=="function"&&"applyToOptions"in n}function MA({type:n,...e}){return hg(n)&&cg()?n.applyToOptions(e):(e.duration??(e.duration=300),e.ease??(e.ease="easeOut"),e)}class TA extends Eu{constructor(e){if(super(),this.finishedTime=null,this.isStopped=!1,this.manualStartTime=null,!e)return;const{element:t,name:i,keyframes:r,pseudoElement:s,allowFlatten:a=!1,finalKeyframe:o,onComplete:l}=e;this.isPseudoElement=!!s,this.allowFlatten=a,this.options=e,pu(typeof e.type!="string");const c=MA(e);this.animation=bA(t,i,r,c,s),c.autoplay===!1&&this.animation.pause(),this.animation.onfinish=()=>{if(this.finishedTime=this.time,!s){const u=Tu(r,this.options,o,this.speed);this.updateMotionValue?this.updateMotionValue(u):_A(t,i,u),this.animation.cancel()}l==null||l(),this.notifyFinished()}}play(){this.isStopped||(this.manualStartTime=null,this.animation.play(),this.state==="finished"&&this.updateFinished())}pause(){this.animation.pause()}complete(){var e,t;(t=(e=this.animation).finish)==null||t.call(e)}cancel(){try{this.animation.cancel()}catch{}}stop(){if(this.isStopped)return;this.isStopped=!0;const{state:e}=this;e==="idle"||e==="finished"||(this.updateMotionValue?this.updateMotionValue():this.commitStyles(),this.isPseudoElement||this.cancel())}commitStyles(){var e,t;this.isPseudoElement||(t=(e=this.animation).commitStyles)==null||t.call(e)}get duration(){var t,i;const e=((i=(t=this.animation.effect)==null?void 0:t.getComputedTiming)==null?void 0:i.call(t).duration)||0;return bn(Number(e))}get iterationDuration(){const{delay:e=0}=this.options||{};return this.duration+bn(e)}get time(){return bn(Number(this.animation.currentTime)||0)}set time(e){this.manualStartTime=null,this.finishedTime=null,this.animation.currentTime=ti(e)}get speed(){return this.animation.playbackRate}set speed(e){e<0&&(this.finishedTime=null),this.animation.playbackRate=e}get state(){return this.finishedTime!==null?"finished":this.animation.playState}get startTime(){return this.manualStartTime??Number(this.animation.startTime)}set startTime(e){this.manualStartTime=this.animation.startTime=e}attachTimeline({timeline:e,observe:t}){var i;return this.allowFlatten&&((i=this.animation.effect)==null||i.updateTiming({easing:"linear"})),this.animation.onfinish=null,e&&xA()?(this.animation.timeline=e,Mn):t(this)}}const fg={anticipate:Hm,backInOut:Gm,circInOut:jm};function EA(n){return n in fg}function wA(n){typeof n.ease=="string"&&EA(n.ease)&&(n.ease=fg[n.ease])}const ml=10;class AA extends TA{constructor(e){wA(e),ag(e),super(e),e.startTime!==void 0&&(this.startTime=e.startTime),this.options=e}updateMotionValue(e){const{motionValue:t,onUpdate:i,onComplete:r,element:s,...a}=this.options;if(!t)return;if(e!==void 0){t.set(e);return}const o=new wu({...a,autoplay:!1}),l=Math.max(ml,Xt.now()-this.startTime),c=Vn(0,ml,l-ml);t.setWithVelocity(o.sample(Math.max(0,l-c)).value,o.sample(l).value,c),o.stop()}}const dd=(n,e)=>e==="zIndex"?!1:!!(typeof n=="number"||Array.isArray(n)||typeof n=="string"&&(Ei.test(n)||n==="0")&&!n.startsWith("url("));function CA(n){const e=n[0];if(n.length===1)return!0;for(let t=0;t<n.length;t++)if(n[t]!==e)return!0}function RA(n,e,t,i){const r=n[0];if(r===null)return!1;if(e==="display"||e==="visibility")return!0;const s=n[n.length-1],a=dd(r,e),o=dd(s,e);return!a||!o?!1:CA(n)||(t==="spring"||hg(t))&&i}function Ic(n){n.duration=0,n.type="keyframes"}const PA=new Set(["opacity","clipPath","filter","transform"]),DA=mu(()=>Object.hasOwnProperty.call(Element.prototype,"animate"));function LA(n){var u;const{motionValue:e,name:t,repeatDelay:i,repeatType:r,damping:s,type:a}=n;if(!(((u=e==null?void 0:e.owner)==null?void 0:u.current)instanceof HTMLElement))return!1;const{onUpdate:l,transformTemplate:c}=e.owner.getProps();return DA()&&t&&PA.has(t)&&(t!=="transform"||!c)&&!l&&!i&&r!=="mirror"&&s!==0&&a!=="inertia"}const UA=40;class NA extends Eu{constructor({autoplay:e=!0,delay:t=0,type:i="keyframes",repeat:r=0,repeatDelay:s=0,repeatType:a="loop",keyframes:o,name:l,motionValue:c,element:u,...h}){var g;super(),this.stop=()=>{var v,m;this._animation&&(this._animation.stop(),(v=this.stopTimeline)==null||v.call(this)),(m=this.keyframeResolver)==null||m.cancel()},this.createdAt=Xt.now();const f={autoplay:e,delay:t,type:i,repeat:r,repeatDelay:s,repeatType:a,name:l,motionValue:c,element:u,...h},d=(u==null?void 0:u.KeyframeResolver)||Au;this.keyframeResolver=new d(o,(v,m,p)=>this.onKeyframesResolved(v,m,f,!p),l,c,u),(g=this.keyframeResolver)==null||g.scheduleResolve()}onKeyframesResolved(e,t,i,r){this.keyframeResolver=void 0;const{name:s,type:a,velocity:o,delay:l,isHandoff:c,onUpdate:u}=i;this.resolvedAt=Xt.now(),RA(e,s,a,o)||((ri.instantAnimations||!l)&&(u==null||u(Tu(e,i,t))),e[0]=e[e.length-1],Ic(i),i.repeat=0);const f={startTime:r?this.resolvedAt?this.resolvedAt-this.createdAt>UA?this.resolvedAt:this.createdAt:this.createdAt:void 0,finalKeyframe:t,...i,keyframes:e},d=!c&&LA(f)?new AA({...f,element:f.motionValue.owner.current}):new wu(f);d.finished.then(()=>this.notifyFinished()).catch(Mn),this.pendingTimeline&&(this.stopTimeline=d.attachTimeline(this.pendingTimeline),this.pendingTimeline=void 0),this._animation=d}get finished(){return this._animation?this.animation.finished:this._finished}then(e,t){return this.finished.finally(e).then(()=>{})}get animation(){var e;return this._animation||((e=this.keyframeResolver)==null||e.resume(),gA()),this._animation}get duration(){return this.animation.duration}get iterationDuration(){return this.animation.iterationDuration}get time(){return this.animation.time}set time(e){this.animation.time=e}get speed(){return this.animation.speed}get state(){return this.animation.state}set speed(e){this.animation.speed=e}get startTime(){return this.animation.startTime}attachTimeline(e){return this._animation?this.stopTimeline=this.animation.attachTimeline(e):this.pendingTimeline=e,()=>this.stop()}play(){this.animation.play()}pause(){this.animation.pause()}complete(){this.animation.complete()}cancel(){var e;this._animation&&this.animation.cancel(),(e=this.keyframeResolver)==null||e.cancel()}}const IA=/^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;function FA(n){const e=IA.exec(n);if(!e)return[,];const[,t,i,r]=e;return[`--${t??i}`,r]}function dg(n,e,t=1){const[i,r]=FA(n);if(!i)return;const s=window.getComputedStyle(e).getPropertyValue(i);if(s){const a=s.trim();return Nm(a)?parseFloat(a):a}return xu(r)?dg(r,e,t+1):r}function Cu(n,e){return(n==null?void 0:n[e])??(n==null?void 0:n.default)??n}const OA={type:"spring",stiffness:500,damping:25,restSpeed:10},kA=n=>({type:"spring",stiffness:550,damping:n===0?2*Math.sqrt(550):30,restSpeed:10}),BA={type:"keyframes",duration:.8},zA={type:"keyframes",ease:[.25,.1,.35,1],duration:.3},VA=(n,{keyframes:e})=>e.length>2?BA:Wr.has(n)?n.startsWith("scale")?kA(e[1]):OA:zA;function GA({when:n,delay:e,delayChildren:t,staggerChildren:i,staggerDirection:r,repeat:s,repeatType:a,repeatDelay:o,from:l,elapsed:c,...u}){return!!Object.keys(u).length}const HA=n=>n!==null;function WA(n,{repeat:e,repeatType:t="loop"},i){const r=n.filter(HA),s=e&&t!=="loop"&&e%2===1?0:r.length-1;return r[s]}function pg(n,e,t,i=0,r=1){const s=Array.from(n).sort((c,u)=>c.sortNodePosition(u)).indexOf(e),a=n.size,o=(a-1)*i;return typeof t=="function"?t(s,a):r===1?s*i:o-s*i}const Ru=(n,e,t,i={},r,s)=>a=>{const o=Cu(i,n)||{},l=o.delay||i.delay||0;let{elapsed:c=0}=i;c=c-ti(l);const u={keyframes:Array.isArray(t)?t:[null,t],ease:"easeOut",velocity:e.getVelocity(),...o,delay:-c,onUpdate:f=>{e.set(f),o.onUpdate&&o.onUpdate(f)},onComplete:()=>{a(),o.onComplete&&o.onComplete()},name:n,motionValue:e,element:s?void 0:r};GA(o)||Object.assign(u,VA(n,u)),u.duration&&(u.duration=ti(u.duration)),u.repeatDelay&&(u.repeatDelay=ti(u.repeatDelay)),u.from!==void 0&&(u.keyframes[0]=u.from);let h=!1;if((u.type===!1||u.duration===0&&!u.repeatDelay)&&(Ic(u),u.delay===0&&(h=!0)),(ri.instantAnimations||ri.skipAnimations)&&(h=!0,Ic(u),u.delay=0),u.allowFlatten=!o.type&&!o.ease,h&&!s&&e.get()!==void 0){const f=WA(u.keyframes,o);if(f!==void 0){pt.update(()=>{u.onUpdate(f),u.onComplete()});return}}return o.isSync?new wu(u):new NA(u)},mg=new Set(["width","height","top","left","right","bottom",...Hr]),pd=30,jA=n=>!isNaN(parseFloat(n));class XA{constructor(e,t={}){this.canTrackVelocity=null,this.events={},this.updateAndNotify=i=>{var s;const r=Xt.now();if(this.updatedAt!==r&&this.setPrevFrameValue(),this.prev=this.current,this.setCurrent(i),this.current!==this.prev&&((s=this.events.change)==null||s.notify(this.current),this.dependents))for(const a of this.dependents)a.dirty()},this.hasAnimated=!1,this.setCurrent(e),this.owner=t.owner}setCurrent(e){this.current=e,this.updatedAt=Xt.now(),this.canTrackVelocity===null&&e!==void 0&&(this.canTrackVelocity=jA(this.current))}setPrevFrameValue(e=this.current){this.prevFrameValue=e,this.prevUpdatedAt=this.updatedAt}onChange(e){return this.on("change",e)}on(e,t){this.events[e]||(this.events[e]=new gu);const i=this.events[e].add(t);return e==="change"?()=>{i(),pt.read(()=>{this.events.change.getSize()||this.stop()})}:i}clearListeners(){for(const e in this.events)this.events[e].clear()}attach(e,t){this.passiveEffect=e,this.stopPassiveEffect=t}set(e){this.passiveEffect?this.passiveEffect(e,this.updateAndNotify):this.updateAndNotify(e)}setWithVelocity(e,t,i){this.set(t),this.prev=void 0,this.prevFrameValue=e,this.prevUpdatedAt=this.updatedAt-i}jump(e,t=!0){this.updateAndNotify(e),this.prev=e,this.prevUpdatedAt=this.prevFrameValue=void 0,t&&this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}dirty(){var e;(e=this.events.change)==null||e.notify(this.current)}addDependent(e){this.dependents||(this.dependents=new Set),this.dependents.add(e)}removeDependent(e){this.dependents&&this.dependents.delete(e)}get(){return this.current}getPrevious(){return this.prev}getVelocity(){const e=Xt.now();if(!this.canTrackVelocity||this.prevFrameValue===void 0||e-this.updatedAt>pd)return 0;const t=Math.min(this.updatedAt-this.prevUpdatedAt,pd);return Om(parseFloat(this.current)-parseFloat(this.prevFrameValue),t)}start(e){return this.stop(),new Promise(t=>{this.hasAnimated=!0,this.animation=e(t),this.events.animationStart&&this.events.animationStart.notify()}).then(()=>{this.events.animationComplete&&this.events.animationComplete.notify(),this.clearAnimation()})}stop(){this.animation&&(this.animation.stop(),this.events.animationCancel&&this.events.animationCancel.notify()),this.clearAnimation()}isAnimating(){return!!this.animation}clearAnimation(){delete this.animation}destroy(){var e,t;(e=this.dependents)==null||e.clear(),(t=this.events.destroy)==null||t.notify(),this.clearListeners(),this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}}function Br(n,e){return new XA(n,e)}function md(n){const e=[{},{}];return n==null||n.values.forEach((t,i)=>{e[0][i]=t.get(),e[1][i]=t.getVelocity()}),e}function Pu(n,e,t,i){if(typeof e=="function"){const[r,s]=md(i);e=e(t!==void 0?t:n.custom,r,s)}if(typeof e=="string"&&(e=n.variants&&n.variants[e]),typeof e=="function"){const[r,s]=md(i);e=e(t!==void 0?t:n.custom,r,s)}return e}function Cr(n,e,t){const i=n.getProps();return Pu(i,e,t!==void 0?t:i.custom,n)}const Fc=n=>Array.isArray(n);function YA(n,e,t){n.hasValue(e)?n.getValue(e).set(t):n.addValue(e,Br(t))}function qA(n){return Fc(n)?n[n.length-1]||0:n}function KA(n,e){const t=Cr(n,e);let{transitionEnd:i={},transition:r={},...s}=t||{};s={...s,...i};for(const a in s){const o=qA(s[a]);YA(n,a,o)}}const Vt=n=>!!(n&&n.getVelocity);function ZA(n){return!!(Vt(n)&&n.add)}function Oc(n,e){const t=n.getValue("willChange");if(ZA(t))return t.add(e);if(!t&&ri.WillChange){const i=new ri.WillChange("auto");n.addValue("willChange",i),i.add(e)}}function Du(n){return n.replace(/([A-Z])/g,e=>`-${e.toLowerCase()}`)}const $A="framerAppearId",gg="data-"+Du($A);function vg(n){return n.props[gg]}function JA({protectedKeys:n,needsAnimating:e},t){const i=n.hasOwnProperty(t)&&e[t]!==!0;return e[t]=!1,i}function _g(n,e,{delay:t=0,transitionOverride:i,type:r}={}){let{transition:s=n.getDefaultTransition(),transitionEnd:a,...o}=e;i&&(s=i);const l=[],c=r&&n.animationState&&n.animationState.getState()[r];for(const u in o){const h=n.getValue(u,n.latestValues[u]??null),f=o[u];if(f===void 0||c&&JA(c,u))continue;const d={delay:t,...Cu(s||{},u)},g=h.get();if(g!==void 0&&!h.isAnimating&&!Array.isArray(f)&&f===g&&!d.velocity)continue;let v=!1;if(window.MotionHandoffAnimation){const p=vg(n);if(p){const y=window.MotionHandoffAnimation(p,u,pt);y!==null&&(d.startTime=y,v=!0)}}Oc(n,u),h.start(Ru(u,h,f,n.shouldReduceMotion&&mg.has(u)?{type:!1}:d,n,v));const m=h.animation;m&&l.push(m)}return a&&Promise.all(l).then(()=>{pt.update(()=>{a&&KA(n,a)})}),l}function kc(n,e,t={}){var l;const i=Cr(n,e,t.type==="exit"?(l=n.presenceContext)==null?void 0:l.custom:void 0);let{transition:r=n.getDefaultTransition()||{}}=i||{};t.transitionOverride&&(r=t.transitionOverride);const s=i?()=>Promise.all(_g(n,i,t)):()=>Promise.resolve(),a=n.variantChildren&&n.variantChildren.size?(c=0)=>{const{delayChildren:u=0,staggerChildren:h,staggerDirection:f}=r;return QA(n,e,c,u,h,f,t)}:()=>Promise.resolve(),{when:o}=r;if(o){const[c,u]=o==="beforeChildren"?[s,a]:[a,s];return c().then(()=>u())}else return Promise.all([s(),a(t.delay)])}function QA(n,e,t=0,i=0,r=0,s=1,a){const o=[];for(const l of n.variantChildren)l.notify("AnimationStart",e),o.push(kc(l,e,{...a,delay:t+(typeof i=="function"?0:i)+pg(n.variantChildren,l,i,r,s)}).then(()=>l.notify("AnimationComplete",e)));return Promise.all(o)}function e2(n,e,t={}){n.notify("AnimationStart",e);let i;if(Array.isArray(e)){const r=e.map(s=>kc(n,s,t));i=Promise.all(r)}else if(typeof e=="string")i=kc(n,e,t);else{const r=typeof e=="function"?Cr(n,e,t.custom):e;i=Promise.all(_g(n,r,t))}return i.then(()=>{n.notify("AnimationComplete",e)})}const t2={test:n=>n==="auto",parse:n=>n},xg=n=>e=>e.test(n),yg=[Gr,Fe,zn,gi,Cw,Aw,t2],gd=n=>yg.find(xg(n));function n2(n){return typeof n=="number"?n===0:n!==null?n==="none"||n==="0"||Fm(n):!0}const i2=new Set(["brightness","contrast","saturate","opacity"]);function r2(n){const[e,t]=n.slice(0,-1).split("(");if(e==="drop-shadow")return n;const[i]=t.match(yu)||[];if(!i)return n;const r=t.replace(i,"");let s=i2.has(e)?1:0;return i!==t&&(s*=100),e+"("+s+r+")"}const s2=/\b([a-z-]*)\(.*?\)/gu,Bc={...Ei,getAnimatableNone:n=>{const e=n.match(s2);return e?e.map(r2).join(" "):n}},vd={...Gr,transform:Math.round},a2={rotate:gi,rotateX:gi,rotateY:gi,rotateZ:gi,scale:ba,scaleX:ba,scaleY:ba,scaleZ:ba,skew:gi,skewX:gi,skewY:gi,distance:Fe,translateX:Fe,translateY:Fe,translateZ:Fe,x:Fe,y:Fe,z:Fe,perspective:Fe,transformPerspective:Fe,opacity:Rs,originX:id,originY:id,originZ:Fe},Lu={borderWidth:Fe,borderTopWidth:Fe,borderRightWidth:Fe,borderBottomWidth:Fe,borderLeftWidth:Fe,borderRadius:Fe,radius:Fe,borderTopLeftRadius:Fe,borderTopRightRadius:Fe,borderBottomRightRadius:Fe,borderBottomLeftRadius:Fe,width:Fe,maxWidth:Fe,height:Fe,maxHeight:Fe,top:Fe,right:Fe,bottom:Fe,left:Fe,inset:Fe,insetBlock:Fe,insetBlockStart:Fe,insetBlockEnd:Fe,insetInline:Fe,insetInlineStart:Fe,insetInlineEnd:Fe,padding:Fe,paddingTop:Fe,paddingRight:Fe,paddingBottom:Fe,paddingLeft:Fe,paddingBlock:Fe,paddingBlockStart:Fe,paddingBlockEnd:Fe,paddingInline:Fe,paddingInlineStart:Fe,paddingInlineEnd:Fe,margin:Fe,marginTop:Fe,marginRight:Fe,marginBottom:Fe,marginLeft:Fe,marginBlock:Fe,marginBlockStart:Fe,marginBlockEnd:Fe,marginInline:Fe,marginInlineStart:Fe,marginInlineEnd:Fe,backgroundPositionX:Fe,backgroundPositionY:Fe,...a2,zIndex:vd,fillOpacity:Rs,strokeOpacity:Rs,numOctaves:vd},o2={...Lu,color:bt,backgroundColor:bt,outlineColor:bt,fill:bt,stroke:bt,borderColor:bt,borderTopColor:bt,borderRightColor:bt,borderBottomColor:bt,borderLeftColor:bt,filter:Bc,WebkitFilter:Bc},Sg=n=>o2[n];function bg(n,e){let t=Sg(n);return t!==Bc&&(t=Ei),t.getAnimatableNone?t.getAnimatableNone(e):void 0}const l2=new Set(["auto","none","0"]);function c2(n,e,t){let i=0,r;for(;i<n.length&&!r;){const s=n[i];typeof s=="string"&&!l2.has(s)&&Ps(s).values.length&&(r=n[i]),i++}if(r&&t)for(const s of e)n[s]=bg(t,r)}class u2 extends Au{constructor(e,t,i,r,s){super(e,t,i,r,s,!0)}readKeyframes(){const{unresolvedKeyframes:e,element:t,name:i}=this;if(!t||!t.current)return;super.readKeyframes();for(let u=0;u<e.length;u++){let h=e[u];if(typeof h=="string"&&(h=h.trim(),xu(h))){const f=dg(h,t.current);f!==void 0&&(e[u]=f),u===e.length-1&&(this.finalKeyframe=h)}}if(this.resolveNoneKeyframes(),!mg.has(i)||e.length!==2)return;const[r,s]=e,a=gd(r),o=gd(s),l=nd(r),c=nd(s);if(l!==c&&yi[i]){this.needsMeasurement=!0;return}if(a!==o)if(hd(a)&&hd(o))for(let u=0;u<e.length;u++){const h=e[u];typeof h=="string"&&(e[u]=parseFloat(h))}else yi[i]&&(this.needsMeasurement=!0)}resolveNoneKeyframes(){const{unresolvedKeyframes:e,name:t}=this,i=[];for(let r=0;r<e.length;r++)(e[r]===null||n2(e[r]))&&i.push(r);i.length&&c2(e,i,t)}measureInitialState(){const{element:e,unresolvedKeyframes:t,name:i}=this;if(!e||!e.current)return;i==="height"&&(this.suspendedScrollY=window.pageYOffset),this.measuredOrigin=yi[i](e.measureViewportBox(),window.getComputedStyle(e.current)),t[0]=this.measuredOrigin;const r=t[t.length-1];r!==void 0&&e.getValue(i,r).jump(r,!1)}measureEndState(){var o;const{element:e,name:t,unresolvedKeyframes:i}=this;if(!e||!e.current)return;const r=e.getValue(t);r&&r.jump(this.measuredOrigin,!1);const s=i.length-1,a=i[s];i[s]=yi[t](e.measureViewportBox(),window.getComputedStyle(e.current)),a!==null&&this.finalKeyframe===void 0&&(this.finalKeyframe=a),(o=this.removedTransforms)!=null&&o.length&&this.removedTransforms.forEach(([l,c])=>{e.getValue(l).set(c)}),this.resolveNoneKeyframes()}}function h2(n,e,t){if(n instanceof EventTarget)return[n];if(typeof n=="string"){let i=document;const r=(t==null?void 0:t[n])??i.querySelectorAll(n);return r?Array.from(r):[]}return Array.from(n)}const Mg=(n,e)=>e&&typeof n=="number"?e.transform(n):n;function Tg(n){return Im(n)&&"offsetHeight"in n}const{schedule:Uu}=qm(queueMicrotask,!1),Dn={x:!1,y:!1};function Eg(){return Dn.x||Dn.y}function f2(n){return n==="x"||n==="y"?Dn[n]?null:(Dn[n]=!0,()=>{Dn[n]=!1}):Dn.x||Dn.y?null:(Dn.x=Dn.y=!0,()=>{Dn.x=Dn.y=!1})}function wg(n,e){const t=h2(n),i=new AbortController,r={passive:!0,...e,signal:i.signal};return[t,r,()=>i.abort()]}function _d(n){return!(n.pointerType==="touch"||Eg())}function d2(n,e,t={}){const[i,r,s]=wg(n,t),a=o=>{if(!_d(o))return;const{target:l}=o,c=e(l,o);if(typeof c!="function"||!l)return;const u=h=>{_d(h)&&(c(h),l.removeEventListener("pointerleave",u))};l.addEventListener("pointerleave",u,r)};return i.forEach(o=>{o.addEventListener("pointerenter",a,r)}),s}const Ag=(n,e)=>e?n===e?!0:Ag(n,e.parentElement):!1,Nu=n=>n.pointerType==="mouse"?typeof n.button!="number"||n.button<=0:n.isPrimary!==!1,p2=new Set(["BUTTON","INPUT","SELECT","TEXTAREA","A"]);function Cg(n){return p2.has(n.tagName)||n.isContentEditable===!0}const Fa=new WeakSet;function xd(n){return e=>{e.key==="Enter"&&n(e)}}function gl(n,e){n.dispatchEvent(new PointerEvent("pointer"+e,{isPrimary:!0,bubbles:!0}))}const m2=(n,e)=>{const t=n.currentTarget;if(!t)return;const i=xd(()=>{if(Fa.has(t))return;gl(t,"down");const r=xd(()=>{gl(t,"up")}),s=()=>gl(t,"cancel");t.addEventListener("keyup",r,e),t.addEventListener("blur",s,e)});t.addEventListener("keydown",i,e),t.addEventListener("blur",()=>t.removeEventListener("keydown",i),e)};function yd(n){return Nu(n)&&!Eg()}function g2(n,e,t={}){const[i,r,s]=wg(n,t),a=o=>{const l=o.currentTarget;if(!yd(o))return;Fa.add(l);const c=e(l,o),u=(d,g)=>{window.removeEventListener("pointerup",h),window.removeEventListener("pointercancel",f),Fa.has(l)&&Fa.delete(l),yd(d)&&typeof c=="function"&&c(d,{success:g})},h=d=>{u(d,l===window||l===document||t.useGlobalTarget||Ag(l,d.target))},f=d=>{u(d,!1)};window.addEventListener("pointerup",h,r),window.addEventListener("pointercancel",f,r)};return i.forEach(o=>{(t.useGlobalTarget?window:o).addEventListener("pointerdown",a,r),Tg(o)&&(o.addEventListener("focus",c=>m2(c,r)),!Cg(o)&&!o.hasAttribute("tabindex")&&(o.tabIndex=0))}),s}function Rg(n){return Im(n)&&"ownerSVGElement"in n}function v2(n){return Rg(n)&&n.tagName==="svg"}const _2=[...yg,bt,Ei],x2=n=>_2.find(xg(n)),Sd=()=>({translate:0,scale:1,origin:0,originPoint:0}),br=()=>({x:Sd(),y:Sd()}),bd=()=>({min:0,max:0}),Tt=()=>({x:bd(),y:bd()}),zc={current:null},Pg={current:!1},y2=typeof window<"u";function S2(){if(Pg.current=!0,!!y2)if(window.matchMedia){const n=window.matchMedia("(prefers-reduced-motion)"),e=()=>zc.current=n.matches;n.addEventListener("change",e),e()}else zc.current=!1}const b2=new WeakMap;function uo(n){return n!==null&&typeof n=="object"&&typeof n.start=="function"}function Ds(n){return typeof n=="string"||Array.isArray(n)}const Iu=["animate","whileInView","whileFocus","whileHover","whileTap","whileDrag","exit"],Fu=["initial",...Iu];function ho(n){return uo(n.animate)||Fu.some(e=>Ds(n[e]))}function Dg(n){return!!(ho(n)||n.variants)}function M2(n,e,t){for(const i in e){const r=e[i],s=t[i];if(Vt(r))n.addValue(i,r);else if(Vt(s))n.addValue(i,Br(r,{owner:n}));else if(s!==r)if(n.hasValue(i)){const a=n.getValue(i);a.liveStyle===!0?a.jump(r):a.hasAnimated||a.set(r)}else{const a=n.getStaticValue(i);n.addValue(i,Br(a!==void 0?a:r,{owner:n}))}}for(const i in t)e[i]===void 0&&n.removeValue(i);return e}const Md=["AnimationStart","AnimationComplete","Update","BeforeLayoutMeasure","LayoutMeasure","LayoutAnimationStart","LayoutAnimationComplete"];let $a={};function Lg(n){$a=n}function T2(){return $a}class E2{scrapeMotionValuesFromProps(e,t,i){return{}}constructor({parent:e,props:t,presenceContext:i,reducedMotionConfig:r,blockInitialAnimation:s,visualState:a},o={}){this.current=null,this.children=new Set,this.isVariantNode=!1,this.isControllingVariants=!1,this.shouldReduceMotion=null,this.values=new Map,this.KeyframeResolver=Au,this.features={},this.valueSubscriptions=new Map,this.prevMotionValues={},this.events={},this.propEventSubscriptions={},this.notifyUpdate=()=>this.notify("Update",this.latestValues),this.render=()=>{this.current&&(this.triggerBuild(),this.renderInstance(this.current,this.renderState,this.props.style,this.projection))},this.renderScheduledAt=0,this.scheduleRender=()=>{const f=Xt.now();this.renderScheduledAt<f&&(this.renderScheduledAt=f,pt.render(this.render,!1,!0))};const{latestValues:l,renderState:c}=a;this.latestValues=l,this.baseTarget={...l},this.initialValues=t.initial?{...l}:{},this.renderState=c,this.parent=e,this.props=t,this.presenceContext=i,this.depth=e?e.depth+1:0,this.reducedMotionConfig=r,this.options=o,this.blockInitialAnimation=!!s,this.isControllingVariants=ho(t),this.isVariantNode=Dg(t),this.isVariantNode&&(this.variantChildren=new Set),this.manuallyAnimateOnMount=!!(e&&e.current);const{willChange:u,...h}=this.scrapeMotionValuesFromProps(t,{},this);for(const f in h){const d=h[f];l[f]!==void 0&&Vt(d)&&d.set(l[f])}}mount(e){var t;this.current=e,b2.set(e,this),this.projection&&!this.projection.instance&&this.projection.mount(e),this.parent&&this.isVariantNode&&!this.isControllingVariants&&(this.removeFromVariantTree=this.parent.addVariantChild(this)),this.values.forEach((i,r)=>this.bindToMotionValue(r,i)),this.reducedMotionConfig==="never"?this.shouldReduceMotion=!1:this.reducedMotionConfig==="always"?this.shouldReduceMotion=!0:(Pg.current||S2(),this.shouldReduceMotion=zc.current),(t=this.parent)==null||t.addChild(this),this.update(this.props,this.presenceContext)}unmount(){var e;this.projection&&this.projection.unmount(),Ti(this.notifyUpdate),Ti(this.render),this.valueSubscriptions.forEach(t=>t()),this.valueSubscriptions.clear(),this.removeFromVariantTree&&this.removeFromVariantTree(),(e=this.parent)==null||e.removeChild(this);for(const t in this.events)this.events[t].clear();for(const t in this.features){const i=this.features[t];i&&(i.unmount(),i.isMounted=!1)}this.current=null}addChild(e){this.children.add(e),this.enteringChildren??(this.enteringChildren=new Set),this.enteringChildren.add(e)}removeChild(e){this.children.delete(e),this.enteringChildren&&this.enteringChildren.delete(e)}bindToMotionValue(e,t){this.valueSubscriptions.has(e)&&this.valueSubscriptions.get(e)();const i=Wr.has(e);i&&this.onBindTransform&&this.onBindTransform();const r=t.on("change",a=>{this.latestValues[e]=a,this.props.onUpdate&&pt.preRender(this.notifyUpdate),i&&this.projection&&(this.projection.isTransformDirty=!0),this.scheduleRender()});let s;typeof window<"u"&&window.MotionCheckAppearSync&&(s=window.MotionCheckAppearSync(this,e,t)),this.valueSubscriptions.set(e,()=>{r(),s&&s(),t.owner&&t.stop()})}sortNodePosition(e){return!this.current||!this.sortInstanceNodePosition||this.type!==e.type?0:this.sortInstanceNodePosition(this.current,e.current)}updateFeatures(){let e="animation";for(e in $a){const t=$a[e];if(!t)continue;const{isEnabled:i,Feature:r}=t;if(!this.features[e]&&r&&i(this.props)&&(this.features[e]=new r(this)),this.features[e]){const s=this.features[e];s.isMounted?s.update():(s.mount(),s.isMounted=!0)}}}triggerBuild(){this.build(this.renderState,this.latestValues,this.props)}measureViewportBox(){return this.current?this.measureInstanceViewportBox(this.current,this.props):Tt()}getStaticValue(e){return this.latestValues[e]}setStaticValue(e,t){this.latestValues[e]=t}update(e,t){(e.transformTemplate||this.props.transformTemplate)&&this.scheduleRender(),this.prevProps=this.props,this.props=e,this.prevPresenceContext=this.presenceContext,this.presenceContext=t;for(let i=0;i<Md.length;i++){const r=Md[i];this.propEventSubscriptions[r]&&(this.propEventSubscriptions[r](),delete this.propEventSubscriptions[r]);const s="on"+r,a=e[s];a&&(this.propEventSubscriptions[r]=this.on(r,a))}this.prevMotionValues=M2(this,this.scrapeMotionValuesFromProps(e,this.prevProps||{},this),this.prevMotionValues),this.handleChildMotionValue&&this.handleChildMotionValue()}getProps(){return this.props}getVariant(e){return this.props.variants?this.props.variants[e]:void 0}getDefaultTransition(){return this.props.transition}getTransformPagePoint(){return this.props.transformPagePoint}getClosestVariantNode(){return this.isVariantNode?this:this.parent?this.parent.getClosestVariantNode():void 0}addVariantChild(e){const t=this.getClosestVariantNode();if(t)return t.variantChildren&&t.variantChildren.add(e),()=>t.variantChildren.delete(e)}addValue(e,t){const i=this.values.get(e);t!==i&&(i&&this.removeValue(e),this.bindToMotionValue(e,t),this.values.set(e,t),this.latestValues[e]=t.get())}removeValue(e){this.values.delete(e);const t=this.valueSubscriptions.get(e);t&&(t(),this.valueSubscriptions.delete(e)),delete this.latestValues[e],this.removeValueFromRenderState(e,this.renderState)}hasValue(e){return this.values.has(e)}getValue(e,t){if(this.props.values&&this.props.values[e])return this.props.values[e];let i=this.values.get(e);return i===void 0&&t!==void 0&&(i=Br(t===null?void 0:t,{owner:this}),this.addValue(e,i)),i}readValue(e,t){let i=this.latestValues[e]!==void 0||!this.current?this.latestValues[e]:this.getBaseTargetFromProps(this.props,e)??this.readValueFromInstance(this.current,e,this.options);return i!=null&&(typeof i=="string"&&(Nm(i)||Fm(i))?i=parseFloat(i):!x2(i)&&Ei.test(t)&&(i=bg(e,t)),this.setBaseTarget(e,Vt(i)?i.get():i)),Vt(i)?i.get():i}setBaseTarget(e,t){this.baseTarget[e]=t}getBaseTarget(e){var s;const{initial:t}=this.props;let i;if(typeof t=="string"||typeof t=="object"){const a=Pu(this.props,t,(s=this.presenceContext)==null?void 0:s.custom);a&&(i=a[e])}if(t&&i!==void 0)return i;const r=this.getBaseTargetFromProps(this.props,e);return r!==void 0&&!Vt(r)?r:this.initialValues[e]!==void 0&&i===void 0?void 0:this.baseTarget[e]}on(e,t){return this.events[e]||(this.events[e]=new gu),this.events[e].add(t)}notify(e,...t){this.events[e]&&this.events[e].notify(...t)}scheduleRenderMicrotask(){Uu.render(this.render)}}class wi{constructor(e){this.isMounted=!1,this.node=e}update(){}}class Ug extends E2{constructor(){super(...arguments),this.KeyframeResolver=u2}sortInstanceNodePosition(e,t){return e.compareDocumentPosition(t)&2?1:-1}getBaseTargetFromProps(e,t){const i=e.style;return i?i[t]:void 0}removeValueFromRenderState(e,{vars:t,style:i}){delete t[e],delete i[e]}handleChildMotionValue(){this.childSubscription&&(this.childSubscription(),delete this.childSubscription);const{children:e}=this.props;Vt(e)&&(this.childSubscription=e.on("change",t=>{this.current&&(this.current.textContent=`${t}`)}))}}function Ng({top:n,left:e,right:t,bottom:i}){return{x:{min:e,max:t},y:{min:n,max:i}}}function w2({x:n,y:e}){return{top:e.min,right:n.max,bottom:e.max,left:n.min}}function A2(n,e){if(!e)return n;const t=e({x:n.left,y:n.top}),i=e({x:n.right,y:n.bottom});return{top:t.y,left:t.x,bottom:i.y,right:i.x}}function vl(n){return n===void 0||n===1}function Vc({scale:n,scaleX:e,scaleY:t}){return!vl(n)||!vl(e)||!vl(t)}function Oi(n){return Vc(n)||Ig(n)||n.z||n.rotate||n.rotateX||n.rotateY||n.skewX||n.skewY}function Ig(n){return Td(n.x)||Td(n.y)}function Td(n){return n&&n!=="0%"}function Ja(n,e,t){const i=n-t,r=e*i;return t+r}function Ed(n,e,t,i,r){return r!==void 0&&(n=Ja(n,r,i)),Ja(n,t,i)+e}function Gc(n,e=0,t=1,i,r){n.min=Ed(n.min,e,t,i,r),n.max=Ed(n.max,e,t,i,r)}function Fg(n,{x:e,y:t}){Gc(n.x,e.translate,e.scale,e.originPoint),Gc(n.y,t.translate,t.scale,t.originPoint)}const wd=.999999999999,Ad=1.0000000000001;function C2(n,e,t,i=!1){const r=t.length;if(!r)return;e.x=e.y=1;let s,a;for(let o=0;o<r;o++){s=t[o],a=s.projectionDelta;const{visualElement:l}=s.options;l&&l.props.style&&l.props.style.display==="contents"||(i&&s.options.layoutScroll&&s.scroll&&s!==s.root&&Tr(n,{x:-s.scroll.offset.x,y:-s.scroll.offset.y}),a&&(e.x*=a.x.scale,e.y*=a.y.scale,Fg(n,a)),i&&Oi(s.latestValues)&&Tr(n,s.latestValues))}e.x<Ad&&e.x>wd&&(e.x=1),e.y<Ad&&e.y>wd&&(e.y=1)}function Mr(n,e){n.min=n.min+e,n.max=n.max+e}function Cd(n,e,t,i,r=.5){const s=vt(n.min,n.max,r);Gc(n,e,t,s,i)}function Tr(n,e){Cd(n.x,e.x,e.scaleX,e.scale,e.originX),Cd(n.y,e.y,e.scaleY,e.scale,e.originY)}function Og(n,e){return Ng(A2(n.getBoundingClientRect(),e))}function R2(n,e,t){const i=Og(n,t),{scroll:r}=e;return r&&(Mr(i.x,r.offset.x),Mr(i.y,r.offset.y)),i}const P2={x:"translateX",y:"translateY",z:"translateZ",transformPerspective:"perspective"},D2=Hr.length;function L2(n,e,t){let i="",r=!0;for(let s=0;s<D2;s++){const a=Hr[s],o=n[a];if(o===void 0)continue;let l=!0;if(typeof o=="number"?l=o===(a.startsWith("scale")?1:0):l=parseFloat(o)===0,!l||t){const c=Mg(o,Lu[a]);if(!l){r=!1;const u=P2[a]||a;i+=`${u}(${c}) `}t&&(e[a]=c)}}return i=i.trim(),t?i=t(e,r?"":i):r&&(i="none"),i}function Ou(n,e,t){const{style:i,vars:r,transformOrigin:s}=n;let a=!1,o=!1;for(const l in e){const c=e[l];if(Wr.has(l)){a=!0;continue}else if(Zm(l)){r[l]=c;continue}else{const u=Mg(c,Lu[l]);l.startsWith("origin")?(o=!0,s[l]=u):i[l]=u}}if(e.transform||(a||t?i.transform=L2(e,n.transform,t):i.transform&&(i.transform="none")),o){const{originX:l="50%",originY:c="50%",originZ:u=0}=s;i.transformOrigin=`${l} ${c} ${u}`}}function kg(n,{style:e,vars:t},i,r){const s=n.style;let a;for(a in e)s[a]=e[a];r==null||r.applyProjectionStyles(s,i);for(a in t)s.setProperty(a,t[a])}function Rd(n,e){return e.max===e.min?0:n/(e.max-e.min)*100}const hs={correct:(n,e)=>{if(!e.target)return n;if(typeof n=="string")if(Fe.test(n))n=parseFloat(n);else return n;const t=Rd(n,e.target.x),i=Rd(n,e.target.y);return`${t}% ${i}%`}},U2={correct:(n,{treeScale:e,projectionDelta:t})=>{const i=n,r=Ei.parse(n);if(r.length>5)return i;const s=Ei.createTransformer(n),a=typeof r[0]!="number"?1:0,o=t.x.scale*e.x,l=t.y.scale*e.y;r[0+a]/=o,r[1+a]/=l;const c=vt(o,l,.5);return typeof r[2+a]=="number"&&(r[2+a]/=c),typeof r[3+a]=="number"&&(r[3+a]/=c),s(r)}},Hc={borderRadius:{...hs,applyTo:["borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius"]},borderTopLeftRadius:hs,borderTopRightRadius:hs,borderBottomLeftRadius:hs,borderBottomRightRadius:hs,boxShadow:U2};function Bg(n,{layout:e,layoutId:t}){return Wr.has(n)||n.startsWith("origin")||(e||t!==void 0)&&(!!Hc[n]||n==="opacity")}function ku(n,e,t){var a;const i=n.style,r=e==null?void 0:e.style,s={};if(!i)return s;for(const o in i)(Vt(i[o])||r&&Vt(r[o])||Bg(o,n)||((a=t==null?void 0:t.getValue(o))==null?void 0:a.liveStyle)!==void 0)&&(s[o]=i[o]);return s}function N2(n){return window.getComputedStyle(n)}class I2 extends Ug{constructor(){super(...arguments),this.type="html",this.renderInstance=kg}readValueFromInstance(e,t){var i;if(Wr.has(t))return(i=this.projection)!=null&&i.isProjecting?Pc(t):hA(e,t);{const r=N2(e),s=(Zm(t)?r.getPropertyValue(t):r[t])||0;return typeof s=="string"?s.trim():s}}measureInstanceViewportBox(e,{transformPagePoint:t}){return Og(e,t)}build(e,t,i){Ou(e,t,i.transformTemplate)}scrapeMotionValuesFromProps(e,t,i){return ku(e,t,i)}}const F2={offset:"stroke-dashoffset",array:"stroke-dasharray"},O2={offset:"strokeDashoffset",array:"strokeDasharray"};function k2(n,e,t=1,i=0,r=!0){n.pathLength=1;const s=r?F2:O2;n[s.offset]=Fe.transform(-i);const a=Fe.transform(e),o=Fe.transform(t);n[s.array]=`${a} ${o}`}const B2=["offsetDistance","offsetPath","offsetRotate","offsetAnchor"];function zg(n,{attrX:e,attrY:t,attrScale:i,pathLength:r,pathSpacing:s=1,pathOffset:a=0,...o},l,c,u){if(Ou(n,o,c),l){n.style.viewBox&&(n.attrs.viewBox=n.style.viewBox);return}n.attrs=n.style,n.style={};const{attrs:h,style:f}=n;h.transform&&(f.transform=h.transform,delete h.transform),(f.transform||h.transformOrigin)&&(f.transformOrigin=h.transformOrigin??"50% 50%",delete h.transformOrigin),f.transform&&(f.transformBox=(u==null?void 0:u.transformBox)??"fill-box",delete h.transformBox);for(const d of B2)h[d]!==void 0&&(f[d]=h[d],delete h[d]);e!==void 0&&(h.x=e),t!==void 0&&(h.y=t),i!==void 0&&(h.scale=i),r!==void 0&&k2(h,r,s,a,!1)}const Vg=new Set(["baseFrequency","diffuseConstant","kernelMatrix","kernelUnitLength","keySplines","keyTimes","limitingConeAngle","markerHeight","markerWidth","numOctaves","targetX","targetY","surfaceScale","specularConstant","specularExponent","stdDeviation","tableValues","viewBox","gradientTransform","pathLength","startOffset","textLength","lengthAdjust"]),Gg=n=>typeof n=="string"&&n.toLowerCase()==="svg";function z2(n,e,t,i){kg(n,e,void 0,i);for(const r in e.attrs)n.setAttribute(Vg.has(r)?r:Du(r),e.attrs[r])}function Hg(n,e,t){const i=ku(n,e,t);for(const r in n)if(Vt(n[r])||Vt(e[r])){const s=Hr.indexOf(r)!==-1?"attr"+r.charAt(0).toUpperCase()+r.substring(1):r;i[s]=n[r]}return i}class V2 extends Ug{constructor(){super(...arguments),this.type="svg",this.isSVGTag=!1,this.measureInstanceViewportBox=Tt}getBaseTargetFromProps(e,t){return e[t]}readValueFromInstance(e,t){if(Wr.has(t)){const i=Sg(t);return i&&i.default||0}return t=Vg.has(t)?t:Du(t),e.getAttribute(t)}scrapeMotionValuesFromProps(e,t,i){return Hg(e,t,i)}build(e,t,i){zg(e,t,this.isSVGTag,i.transformTemplate,i.style)}renderInstance(e,t,i,r){z2(e,t,i,r)}mount(e){this.isSVGTag=Gg(e.tagName),super.mount(e)}}const G2=Fu.length;function Wg(n){if(!n)return;if(!n.isControllingVariants){const t=n.parent?Wg(n.parent)||{}:{};return n.props.initial!==void 0&&(t.initial=n.props.initial),t}const e={};for(let t=0;t<G2;t++){const i=Fu[t],r=n.props[i];(Ds(r)||r===!1)&&(e[i]=r)}return e}function jg(n,e){if(!Array.isArray(e))return!1;const t=e.length;if(t!==n.length)return!1;for(let i=0;i<t;i++)if(e[i]!==n[i])return!1;return!0}const H2=[...Iu].reverse(),W2=Iu.length;function j2(n){return e=>Promise.all(e.map(({animation:t,options:i})=>e2(n,t,i)))}function X2(n){let e=j2(n),t=Pd(),i=!0;const r=l=>(c,u)=>{var f;const h=Cr(n,u,l==="exit"?(f=n.presenceContext)==null?void 0:f.custom:void 0);if(h){const{transition:d,transitionEnd:g,...v}=h;c={...c,...v,...g}}return c};function s(l){e=l(n)}function a(l){const{props:c}=n,u=Wg(n.parent)||{},h=[],f=new Set;let d={},g=1/0;for(let m=0;m<W2;m++){const p=H2[m],y=t[p],x=c[p]!==void 0?c[p]:u[p],_=Ds(x),S=p===l?y.isActive:null;S===!1&&(g=m);let T=x===u[p]&&x!==c[p]&&_;if(T&&i&&n.manuallyAnimateOnMount&&(T=!1),y.protectedKeys={...d},!y.isActive&&S===null||!x&&!y.prevProp||uo(x)||typeof x=="boolean")continue;const E=Y2(y.prevProp,x);let A=E||p===l&&y.isActive&&!T&&_||m>g&&_,M=!1;const b=Array.isArray(x)?x:[x];let L=b.reduce(r(p),{});S===!1&&(L={});const{prevResolvedValues:P={}}=y,I={...P,...L},F=$=>{A=!0,f.has($)&&(M=!0,f.delete($)),y.needsAnimating[$]=!0;const O=n.getValue($);O&&(O.liveStyle=!1)};for(const $ in I){const O=L[$],W=P[$];if(d.hasOwnProperty($))continue;let Y=!1;Fc(O)&&Fc(W)?Y=!jg(O,W):Y=O!==W,Y?O!=null?F($):f.add($):O!==void 0&&f.has($)?F($):y.protectedKeys[$]=!0}y.prevProp=x,y.prevResolvedValues=L,y.isActive&&(d={...d,...L}),i&&n.blockInitialAnimation&&(A=!1);const K=T&&E;A&&(!K||M)&&h.push(...b.map($=>{const O={type:p};if(typeof $=="string"&&i&&!K&&n.manuallyAnimateOnMount&&n.parent){const{parent:W}=n,Y=Cr(W,$);if(W.enteringChildren&&Y){const{delayChildren:N}=Y.transition||{};O.delay=pg(W.enteringChildren,n,N)}}return{animation:$,options:O}}))}if(f.size){const m={};if(typeof c.initial!="boolean"){const p=Cr(n,Array.isArray(c.initial)?c.initial[0]:c.initial);p&&p.transition&&(m.transition=p.transition)}f.forEach(p=>{const y=n.getBaseTarget(p),x=n.getValue(p);x&&(x.liveStyle=!0),m[p]=y??null}),h.push({animation:m})}let v=!!h.length;return i&&(c.initial===!1||c.initial===c.animate)&&!n.manuallyAnimateOnMount&&(v=!1),i=!1,v?e(h):Promise.resolve()}function o(l,c){var h;if(t[l].isActive===c)return Promise.resolve();(h=n.variantChildren)==null||h.forEach(f=>{var d;return(d=f.animationState)==null?void 0:d.setActive(l,c)}),t[l].isActive=c;const u=a(l);for(const f in t)t[f].protectedKeys={};return u}return{animateChanges:a,setActive:o,setAnimateFunction:s,getState:()=>t,reset:()=>{t=Pd()}}}function Y2(n,e){return typeof e=="string"?e!==n:Array.isArray(e)?!jg(e,n):!1}function Ni(n=!1){return{isActive:n,protectedKeys:{},needsAnimating:{},prevResolvedValues:{}}}function Pd(){return{animate:Ni(!0),whileInView:Ni(),whileHover:Ni(),whileTap:Ni(),whileDrag:Ni(),whileFocus:Ni(),exit:Ni()}}const Xg=1e-4,q2=1-Xg,K2=1+Xg,Yg=.01,Z2=0-Yg,$2=0+Yg;function Yt(n){return n.max-n.min}function J2(n,e,t){return Math.abs(n-e)<=t}function Dd(n,e,t,i=.5){n.origin=i,n.originPoint=vt(e.min,e.max,n.origin),n.scale=Yt(t)/Yt(e),n.translate=vt(t.min,t.max,n.origin)-n.originPoint,(n.scale>=q2&&n.scale<=K2||isNaN(n.scale))&&(n.scale=1),(n.translate>=Z2&&n.translate<=$2||isNaN(n.translate))&&(n.translate=0)}function Ms(n,e,t,i){Dd(n.x,e.x,t.x,i?i.originX:void 0),Dd(n.y,e.y,t.y,i?i.originY:void 0)}function Ld(n,e,t){n.min=t.min+e.min,n.max=n.min+Yt(e)}function Q2(n,e,t){Ld(n.x,e.x,t.x),Ld(n.y,e.y,t.y)}function Ud(n,e,t){n.min=e.min-t.min,n.max=n.min+Yt(e)}function Qa(n,e,t){Ud(n.x,e.x,t.x),Ud(n.y,e.y,t.y)}function Nd(n,e,t,i,r){return n-=e,n=Ja(n,1/t,i),r!==void 0&&(n=Ja(n,1/r,i)),n}function eC(n,e=0,t=1,i=.5,r,s=n,a=n){if(zn.test(e)&&(e=parseFloat(e),e=vt(a.min,a.max,e/100)-a.min),typeof e!="number")return;let o=vt(s.min,s.max,i);n===s&&(o-=e),n.min=Nd(n.min,e,t,o,r),n.max=Nd(n.max,e,t,o,r)}function Id(n,e,[t,i,r],s,a){eC(n,e[t],e[i],e[r],e.scale,s,a)}const tC=["x","scaleX","originX"],nC=["y","scaleY","originY"];function Fd(n,e,t,i){Id(n.x,e,tC,t?t.x:void 0,i?i.x:void 0),Id(n.y,e,nC,t?t.y:void 0,i?i.y:void 0)}function Od(n,e){n.min=e.min,n.max=e.max}function Pn(n,e){Od(n.x,e.x),Od(n.y,e.y)}function kd(n,e){n.translate=e.translate,n.scale=e.scale,n.originPoint=e.originPoint,n.origin=e.origin}function Bd(n){return n.translate===0&&n.scale===1}function qg(n){return Bd(n.x)&&Bd(n.y)}function zd(n,e){return n.min===e.min&&n.max===e.max}function iC(n,e){return zd(n.x,e.x)&&zd(n.y,e.y)}function Vd(n,e){return Math.round(n.min)===Math.round(e.min)&&Math.round(n.max)===Math.round(e.max)}function Kg(n,e){return Vd(n.x,e.x)&&Vd(n.y,e.y)}function Gd(n){return Yt(n.x)/Yt(n.y)}function Hd(n,e){return n.translate===e.translate&&n.scale===e.scale&&n.originPoint===e.originPoint}function vn(n){return[n("x"),n("y")]}function rC(n,e,t){let i="";const r=n.x.translate/e.x,s=n.y.translate/e.y,a=(t==null?void 0:t.z)||0;if((r||s||a)&&(i=`translate3d(${r}px, ${s}px, ${a}px) `),(e.x!==1||e.y!==1)&&(i+=`scale(${1/e.x}, ${1/e.y}) `),t){const{transformPerspective:c,rotate:u,rotateX:h,rotateY:f,skewX:d,skewY:g}=t;c&&(i=`perspective(${c}px) ${i}`),u&&(i+=`rotate(${u}deg) `),h&&(i+=`rotateX(${h}deg) `),f&&(i+=`rotateY(${f}deg) `),d&&(i+=`skewX(${d}deg) `),g&&(i+=`skewY(${g}deg) `)}const o=n.x.scale*e.x,l=n.y.scale*e.y;return(o!==1||l!==1)&&(i+=`scale(${o}, ${l})`),i||"none"}const Zg=["TopLeft","TopRight","BottomLeft","BottomRight"],sC=Zg.length,Wd=n=>typeof n=="string"?parseFloat(n):n,jd=n=>typeof n=="number"||Fe.test(n);function aC(n,e,t,i,r,s){r?(n.opacity=vt(0,t.opacity??1,oC(i)),n.opacityExit=vt(e.opacity??1,0,lC(i))):s&&(n.opacity=vt(e.opacity??1,t.opacity??1,i));for(let a=0;a<sC;a++){const o=`border${Zg[a]}Radius`;let l=Xd(e,o),c=Xd(t,o);if(l===void 0&&c===void 0)continue;l||(l=0),c||(c=0),l===0||c===0||jd(l)===jd(c)?(n[o]=Math.max(vt(Wd(l),Wd(c),i),0),(zn.test(c)||zn.test(l))&&(n[o]+="%")):n[o]=c}(e.rotate||t.rotate)&&(n.rotate=vt(e.rotate||0,t.rotate||0,i))}function Xd(n,e){return n[e]!==void 0?n[e]:n.borderRadius}const oC=$g(0,.5,Wm),lC=$g(.5,.95,Mn);function $g(n,e,t){return i=>i<n?0:i>e?1:t(Cs(n,e,i))}function cC(n,e){const t=Xt.now(),i=({timestamp:r})=>{const s=r-t;s>=e&&(Ti(i),n(s-e))};return pt.setup(i,!0),()=>Ti(i)}function Ls(n,e,t,i={passive:!0}){return n.addEventListener(e,t,i),()=>n.removeEventListener(e,t)}function Oa(n){return Vt(n)?n.get():n}function uC(n,e,t){const i=Vt(n)?n:Br(n);return i.start(Ru("",i,e,t)),i.animation}const hC=(n,e)=>n.depth-e.depth;class fC{constructor(){this.children=[],this.isDirty=!1}add(e){fu(this.children,e),this.isDirty=!0}remove(e){du(this.children,e),this.isDirty=!0}forEach(e){this.isDirty&&this.children.sort(hC),this.isDirty=!1,this.children.forEach(e)}}class dC{constructor(){this.members=[]}add(e){fu(this.members,e),e.scheduleRender()}remove(e){if(du(this.members,e),e===this.prevLead&&(this.prevLead=void 0),e===this.lead){const t=this.members[this.members.length-1];t&&this.promote(t)}}relegate(e){const t=this.members.findIndex(r=>e===r);if(t===0)return!1;let i;for(let r=t;r>=0;r--){const s=this.members[r];if(s.isPresent!==!1){i=s;break}}return i?(this.promote(i),!0):!1}promote(e,t){const i=this.lead;if(e!==i&&(this.prevLead=i,this.lead=e,e.show(),i)){i.instance&&i.scheduleRender(),e.scheduleRender(),e.resumeFrom=i,t&&(e.resumeFrom.preserveOpacity=!0),i.snapshot&&(e.snapshot=i.snapshot,e.snapshot.latestValues=i.animationValues||i.latestValues),e.root&&e.root.isUpdating&&(e.isLayoutDirty=!0);const{crossfade:r}=e.options;r===!1&&i.hide()}}exitAnimationComplete(){this.members.forEach(e=>{const{options:t,resumingFrom:i}=e;t.onExitComplete&&t.onExitComplete(),i&&i.options.onExitComplete&&i.options.onExitComplete()})}scheduleRender(){this.members.forEach(e=>{e.instance&&e.scheduleRender(!1)})}removeLeadSnapshot(){this.lead&&this.lead.snapshot&&(this.lead.snapshot=void 0)}}const ka={hasAnimatedSinceResize:!0,hasEverUpdated:!1},_l=["","X","Y","Z"],pC=1e3;let mC=0;function xl(n,e,t,i){const{latestValues:r}=e;r[n]&&(t[n]=r[n],e.setStaticValue(n,0),i&&(i[n]=0))}function Jg(n){if(n.hasCheckedOptimisedAppear=!0,n.root===n)return;const{visualElement:e}=n.options;if(!e)return;const t=vg(e);if(window.MotionHasOptimisedAnimation(t,"transform")){const{layout:r,layoutId:s}=n.options;window.MotionCancelOptimisedAnimation(t,"transform",pt,!(r||s))}const{parent:i}=n;i&&!i.hasCheckedOptimisedAppear&&Jg(i)}function Qg({attachResizeListener:n,defaultParent:e,measureScroll:t,checkIsScrollRoot:i,resetTransform:r}){return class{constructor(a={},o=e==null?void 0:e()){this.id=mC++,this.animationId=0,this.animationCommitId=0,this.children=new Set,this.options={},this.isTreeAnimating=!1,this.isAnimationBlocked=!1,this.isLayoutDirty=!1,this.isProjectionDirty=!1,this.isSharedProjectionDirty=!1,this.isTransformDirty=!1,this.updateManuallyBlocked=!1,this.updateBlockedByResize=!1,this.isUpdating=!1,this.isSVG=!1,this.needsReset=!1,this.shouldResetTransform=!1,this.hasCheckedOptimisedAppear=!1,this.treeScale={x:1,y:1},this.eventHandlers=new Map,this.hasTreeAnimated=!1,this.layoutVersion=0,this.updateScheduled=!1,this.scheduleUpdate=()=>this.update(),this.projectionUpdateScheduled=!1,this.checkUpdateFailed=()=>{this.isUpdating&&(this.isUpdating=!1,this.clearAllSnapshots())},this.updateProjection=()=>{this.projectionUpdateScheduled=!1,this.nodes.forEach(_C),this.nodes.forEach(bC),this.nodes.forEach(MC),this.nodes.forEach(xC)},this.resolvedRelativeTargetAt=0,this.linkedParentVersion=0,this.hasProjected=!1,this.isVisible=!0,this.animationProgress=0,this.sharedNodes=new Map,this.latestValues=a,this.root=o?o.root||o:this,this.path=o?[...o.path,o]:[],this.parent=o,this.depth=o?o.depth+1:0;for(let l=0;l<this.path.length;l++)this.path[l].shouldResetTransform=!0;this.root===this&&(this.nodes=new fC)}addEventListener(a,o){return this.eventHandlers.has(a)||this.eventHandlers.set(a,new gu),this.eventHandlers.get(a).add(o)}notifyListeners(a,...o){const l=this.eventHandlers.get(a);l&&l.notify(...o)}hasListeners(a){return this.eventHandlers.has(a)}mount(a){if(this.instance)return;this.isSVG=Rg(a)&&!v2(a),this.instance=a;const{layoutId:o,layout:l,visualElement:c}=this.options;if(c&&!c.current&&c.mount(a),this.root.nodes.add(this),this.parent&&this.parent.children.add(this),this.root.hasTreeAnimated&&(l||o)&&(this.isLayoutDirty=!0),n){let u,h=0;const f=()=>this.root.updateBlockedByResize=!1;pt.read(()=>{h=window.innerWidth}),n(a,()=>{const d=window.innerWidth;d!==h&&(h=d,this.root.updateBlockedByResize=!0,u&&u(),u=cC(f,250),ka.hasAnimatedSinceResize&&(ka.hasAnimatedSinceResize=!1,this.nodes.forEach(Kd)))})}o&&this.root.registerSharedNode(o,this),this.options.animate!==!1&&c&&(o||l)&&this.addEventListener("didUpdate",({delta:u,hasLayoutChanged:h,hasRelativeLayoutChanged:f,layout:d})=>{if(this.isTreeAnimationBlocked()){this.target=void 0,this.relativeTarget=void 0;return}const g=this.options.transition||c.getDefaultTransition()||CC,{onLayoutAnimationStart:v,onLayoutAnimationComplete:m}=c.getProps(),p=!this.targetLayout||!Kg(this.targetLayout,d),y=!h&&f;if(this.options.layoutRoot||this.resumeFrom||y||h&&(p||!this.currentAnimation)){this.resumeFrom&&(this.resumingFrom=this.resumeFrom,this.resumingFrom.resumingFrom=void 0);const x={...Cu(g,"layout"),onPlay:v,onComplete:m};(c.shouldReduceMotion||this.options.layoutRoot)&&(x.delay=0,x.type=!1),this.startAnimation(x),this.setAnimationOrigin(u,y)}else h||Kd(this),this.isLead()&&this.options.onExitComplete&&this.options.onExitComplete();this.targetLayout=d})}unmount(){this.options.layoutId&&this.willUpdate(),this.root.nodes.remove(this);const a=this.getStack();a&&a.remove(this),this.parent&&this.parent.children.delete(this),this.instance=void 0,this.eventHandlers.clear(),Ti(this.updateProjection)}blockUpdate(){this.updateManuallyBlocked=!0}unblockUpdate(){this.updateManuallyBlocked=!1}isUpdateBlocked(){return this.updateManuallyBlocked||this.updateBlockedByResize}isTreeAnimationBlocked(){return this.isAnimationBlocked||this.parent&&this.parent.isTreeAnimationBlocked()||!1}startUpdate(){this.isUpdateBlocked()||(this.isUpdating=!0,this.nodes&&this.nodes.forEach(TC),this.animationId++)}getTransformTemplate(){const{visualElement:a}=this.options;return a&&a.getProps().transformTemplate}willUpdate(a=!0){if(this.root.hasTreeAnimated=!0,this.root.isUpdateBlocked()){this.options.onExitComplete&&this.options.onExitComplete();return}if(window.MotionCancelOptimisedAnimation&&!this.hasCheckedOptimisedAppear&&Jg(this),!this.root.isUpdating&&this.root.startUpdate(),this.isLayoutDirty)return;this.isLayoutDirty=!0;for(let u=0;u<this.path.length;u++){const h=this.path[u];h.shouldResetTransform=!0,h.updateScroll("snapshot"),h.options.layoutRoot&&h.willUpdate(!1)}const{layoutId:o,layout:l}=this.options;if(o===void 0&&!l)return;const c=this.getTransformTemplate();this.prevTransformTemplateValue=c?c(this.latestValues,""):void 0,this.updateSnapshot(),a&&this.notifyListeners("willUpdate")}update(){if(this.updateScheduled=!1,this.isUpdateBlocked()){this.unblockUpdate(),this.clearAllSnapshots(),this.nodes.forEach(Yd);return}if(this.animationId<=this.animationCommitId){this.nodes.forEach(qd);return}this.animationCommitId=this.animationId,this.isUpdating?(this.isUpdating=!1,this.nodes.forEach(SC),this.nodes.forEach(gC),this.nodes.forEach(vC)):this.nodes.forEach(qd),this.clearAllSnapshots();const o=Xt.now();Nt.delta=Vn(0,1e3/60,o-Nt.timestamp),Nt.timestamp=o,Nt.isProcessing=!0,ul.update.process(Nt),ul.preRender.process(Nt),ul.render.process(Nt),Nt.isProcessing=!1}didUpdate(){this.updateScheduled||(this.updateScheduled=!0,Uu.read(this.scheduleUpdate))}clearAllSnapshots(){this.nodes.forEach(yC),this.sharedNodes.forEach(EC)}scheduleUpdateProjection(){this.projectionUpdateScheduled||(this.projectionUpdateScheduled=!0,pt.preRender(this.updateProjection,!1,!0))}scheduleCheckAfterUnmount(){pt.postRender(()=>{this.isLayoutDirty?this.root.didUpdate():this.root.checkUpdateFailed()})}updateSnapshot(){this.snapshot||!this.instance||(this.snapshot=this.measure(),this.snapshot&&!Yt(this.snapshot.measuredBox.x)&&!Yt(this.snapshot.measuredBox.y)&&(this.snapshot=void 0))}updateLayout(){if(!this.instance||(this.updateScroll(),!(this.options.alwaysMeasureLayout&&this.isLead())&&!this.isLayoutDirty))return;if(this.resumeFrom&&!this.resumeFrom.instance)for(let l=0;l<this.path.length;l++)this.path[l].updateScroll();const a=this.layout;this.layout=this.measure(!1),this.layoutVersion++,this.layoutCorrected=Tt(),this.isLayoutDirty=!1,this.projectionDelta=void 0,this.notifyListeners("measure",this.layout.layoutBox);const{visualElement:o}=this.options;o&&o.notify("LayoutMeasure",this.layout.layoutBox,a?a.layoutBox:void 0)}updateScroll(a="measure"){let o=!!(this.options.layoutScroll&&this.instance);if(this.scroll&&this.scroll.animationId===this.root.animationId&&this.scroll.phase===a&&(o=!1),o&&this.instance){const l=i(this.instance);this.scroll={animationId:this.root.animationId,phase:a,isRoot:l,offset:t(this.instance),wasRoot:this.scroll?this.scroll.isRoot:l}}}resetTransform(){if(!r)return;const a=this.isLayoutDirty||this.shouldResetTransform||this.options.alwaysMeasureLayout,o=this.projectionDelta&&!qg(this.projectionDelta),l=this.getTransformTemplate(),c=l?l(this.latestValues,""):void 0,u=c!==this.prevTransformTemplateValue;a&&this.instance&&(o||Oi(this.latestValues)||u)&&(r(this.instance,c),this.shouldResetTransform=!1,this.scheduleRender())}measure(a=!0){const o=this.measurePageBox();let l=this.removeElementScroll(o);return a&&(l=this.removeTransform(l)),RC(l),{animationId:this.root.animationId,measuredBox:o,layoutBox:l,latestValues:{},source:this.id}}measurePageBox(){var c;const{visualElement:a}=this.options;if(!a)return Tt();const o=a.measureViewportBox();if(!(((c=this.scroll)==null?void 0:c.wasRoot)||this.path.some(PC))){const{scroll:u}=this.root;u&&(Mr(o.x,u.offset.x),Mr(o.y,u.offset.y))}return o}removeElementScroll(a){var l;const o=Tt();if(Pn(o,a),(l=this.scroll)!=null&&l.wasRoot)return o;for(let c=0;c<this.path.length;c++){const u=this.path[c],{scroll:h,options:f}=u;u!==this.root&&h&&f.layoutScroll&&(h.wasRoot&&Pn(o,a),Mr(o.x,h.offset.x),Mr(o.y,h.offset.y))}return o}applyTransform(a,o=!1){const l=Tt();Pn(l,a);for(let c=0;c<this.path.length;c++){const u=this.path[c];!o&&u.options.layoutScroll&&u.scroll&&u!==u.root&&Tr(l,{x:-u.scroll.offset.x,y:-u.scroll.offset.y}),Oi(u.latestValues)&&Tr(l,u.latestValues)}return Oi(this.latestValues)&&Tr(l,this.latestValues),l}removeTransform(a){const o=Tt();Pn(o,a);for(let l=0;l<this.path.length;l++){const c=this.path[l];if(!c.instance||!Oi(c.latestValues))continue;Vc(c.latestValues)&&c.updateSnapshot();const u=Tt(),h=c.measurePageBox();Pn(u,h),Fd(o,c.latestValues,c.snapshot?c.snapshot.layoutBox:void 0,u)}return Oi(this.latestValues)&&Fd(o,this.latestValues),o}setTargetDelta(a){this.targetDelta=a,this.root.scheduleUpdateProjection(),this.isProjectionDirty=!0}setOptions(a){this.options={...this.options,...a,crossfade:a.crossfade!==void 0?a.crossfade:!0}}clearMeasurements(){this.scroll=void 0,this.layout=void 0,this.snapshot=void 0,this.prevTransformTemplateValue=void 0,this.targetDelta=void 0,this.target=void 0,this.isLayoutDirty=!1}forceRelativeParentToResolveTarget(){this.relativeParent&&this.relativeParent.resolvedRelativeTargetAt!==Nt.timestamp&&this.relativeParent.resolveTargetDelta(!0)}resolveTargetDelta(a=!1){var d;const o=this.getLead();this.isProjectionDirty||(this.isProjectionDirty=o.isProjectionDirty),this.isTransformDirty||(this.isTransformDirty=o.isTransformDirty),this.isSharedProjectionDirty||(this.isSharedProjectionDirty=o.isSharedProjectionDirty);const l=!!this.resumingFrom||this!==o;if(!(a||l&&this.isSharedProjectionDirty||this.isProjectionDirty||(d=this.parent)!=null&&d.isProjectionDirty||this.attemptToResolveRelativeTarget||this.root.updateBlockedByResize))return;const{layout:u,layoutId:h}=this.options;if(!this.layout||!(u||h))return;this.resolvedRelativeTargetAt=Nt.timestamp;const f=this.getClosestProjectingParent();f&&this.linkedParentVersion!==f.layoutVersion&&!f.options.layoutRoot&&this.removeRelativeTarget(),!this.targetDelta&&!this.relativeTarget&&(f&&f.layout?this.createRelativeTarget(f,this.layout.layoutBox,f.layout.layoutBox):this.removeRelativeTarget()),!(!this.relativeTarget&&!this.targetDelta)&&(this.target||(this.target=Tt(),this.targetWithTransforms=Tt()),this.relativeTarget&&this.relativeTargetOrigin&&this.relativeParent&&this.relativeParent.target?(this.forceRelativeParentToResolveTarget(),Q2(this.target,this.relativeTarget,this.relativeParent.target)):this.targetDelta?(this.resumingFrom?this.target=this.applyTransform(this.layout.layoutBox):Pn(this.target,this.layout.layoutBox),Fg(this.target,this.targetDelta)):Pn(this.target,this.layout.layoutBox),this.attemptToResolveRelativeTarget&&(this.attemptToResolveRelativeTarget=!1,f&&!!f.resumingFrom==!!this.resumingFrom&&!f.options.layoutScroll&&f.target&&this.animationProgress!==1?this.createRelativeTarget(f,this.target,f.target):this.relativeParent=this.relativeTarget=void 0))}getClosestProjectingParent(){if(!(!this.parent||Vc(this.parent.latestValues)||Ig(this.parent.latestValues)))return this.parent.isProjecting()?this.parent:this.parent.getClosestProjectingParent()}isProjecting(){return!!((this.relativeTarget||this.targetDelta||this.options.layoutRoot)&&this.layout)}createRelativeTarget(a,o,l){this.relativeParent=a,this.linkedParentVersion=a.layoutVersion,this.forceRelativeParentToResolveTarget(),this.relativeTarget=Tt(),this.relativeTargetOrigin=Tt(),Qa(this.relativeTargetOrigin,o,l),Pn(this.relativeTarget,this.relativeTargetOrigin)}removeRelativeTarget(){this.relativeParent=this.relativeTarget=void 0}calcProjection(){var g;const a=this.getLead(),o=!!this.resumingFrom||this!==a;let l=!0;if((this.isProjectionDirty||(g=this.parent)!=null&&g.isProjectionDirty)&&(l=!1),o&&(this.isSharedProjectionDirty||this.isTransformDirty)&&(l=!1),this.resolvedRelativeTargetAt===Nt.timestamp&&(l=!1),l)return;const{layout:c,layoutId:u}=this.options;if(this.isTreeAnimating=!!(this.parent&&this.parent.isTreeAnimating||this.currentAnimation||this.pendingAnimation),this.isTreeAnimating||(this.targetDelta=this.relativeTarget=void 0),!this.layout||!(c||u))return;Pn(this.layoutCorrected,this.layout.layoutBox);const h=this.treeScale.x,f=this.treeScale.y;C2(this.layoutCorrected,this.treeScale,this.path,o),a.layout&&!a.target&&(this.treeScale.x!==1||this.treeScale.y!==1)&&(a.target=a.layout.layoutBox,a.targetWithTransforms=Tt());const{target:d}=a;if(!d){this.prevProjectionDelta&&(this.createProjectionDeltas(),this.scheduleRender());return}!this.projectionDelta||!this.prevProjectionDelta?this.createProjectionDeltas():(kd(this.prevProjectionDelta.x,this.projectionDelta.x),kd(this.prevProjectionDelta.y,this.projectionDelta.y)),Ms(this.projectionDelta,this.layoutCorrected,d,this.latestValues),(this.treeScale.x!==h||this.treeScale.y!==f||!Hd(this.projectionDelta.x,this.prevProjectionDelta.x)||!Hd(this.projectionDelta.y,this.prevProjectionDelta.y))&&(this.hasProjected=!0,this.scheduleRender(),this.notifyListeners("projectionUpdate",d))}hide(){this.isVisible=!1}show(){this.isVisible=!0}scheduleRender(a=!0){var o;if((o=this.options.visualElement)==null||o.scheduleRender(),a){const l=this.getStack();l&&l.scheduleRender()}this.resumingFrom&&!this.resumingFrom.instance&&(this.resumingFrom=void 0)}createProjectionDeltas(){this.prevProjectionDelta=br(),this.projectionDelta=br(),this.projectionDeltaWithTransform=br()}setAnimationOrigin(a,o=!1){const l=this.snapshot,c=l?l.latestValues:{},u={...this.latestValues},h=br();(!this.relativeParent||!this.relativeParent.options.layoutRoot)&&(this.relativeTarget=this.relativeTargetOrigin=void 0),this.attemptToResolveRelativeTarget=!o;const f=Tt(),d=l?l.source:void 0,g=this.layout?this.layout.source:void 0,v=d!==g,m=this.getStack(),p=!m||m.members.length<=1,y=!!(v&&!p&&this.options.crossfade===!0&&!this.path.some(AC));this.animationProgress=0;let x;this.mixTargetDelta=_=>{const S=_/1e3;Zd(h.x,a.x,S),Zd(h.y,a.y,S),this.setTargetDelta(h),this.relativeTarget&&this.relativeTargetOrigin&&this.layout&&this.relativeParent&&this.relativeParent.layout&&(Qa(f,this.layout.layoutBox,this.relativeParent.layout.layoutBox),wC(this.relativeTarget,this.relativeTargetOrigin,f,S),x&&iC(this.relativeTarget,x)&&(this.isProjectionDirty=!1),x||(x=Tt()),Pn(x,this.relativeTarget)),v&&(this.animationValues=u,aC(u,c,this.latestValues,S,y,p)),this.root.scheduleUpdateProjection(),this.scheduleRender(),this.animationProgress=S},this.mixTargetDelta(this.options.layoutRoot?1e3:0)}startAnimation(a){var o,l,c;this.notifyListeners("animationStart"),(o=this.currentAnimation)==null||o.stop(),(c=(l=this.resumingFrom)==null?void 0:l.currentAnimation)==null||c.stop(),this.pendingAnimation&&(Ti(this.pendingAnimation),this.pendingAnimation=void 0),this.pendingAnimation=pt.update(()=>{ka.hasAnimatedSinceResize=!0,this.motionValue||(this.motionValue=Br(0)),this.currentAnimation=uC(this.motionValue,[0,1e3],{...a,velocity:0,isSync:!0,onUpdate:u=>{this.mixTargetDelta(u),a.onUpdate&&a.onUpdate(u)},onStop:()=>{},onComplete:()=>{a.onComplete&&a.onComplete(),this.completeAnimation()}}),this.resumingFrom&&(this.resumingFrom.currentAnimation=this.currentAnimation),this.pendingAnimation=void 0})}completeAnimation(){this.resumingFrom&&(this.resumingFrom.currentAnimation=void 0,this.resumingFrom.preserveOpacity=void 0);const a=this.getStack();a&&a.exitAnimationComplete(),this.resumingFrom=this.currentAnimation=this.animationValues=void 0,this.notifyListeners("animationComplete")}finishAnimation(){this.currentAnimation&&(this.mixTargetDelta&&this.mixTargetDelta(pC),this.currentAnimation.stop()),this.completeAnimation()}applyTransformsToTarget(){const a=this.getLead();let{targetWithTransforms:o,target:l,layout:c,latestValues:u}=a;if(!(!o||!l||!c)){if(this!==a&&this.layout&&c&&ev(this.options.animationType,this.layout.layoutBox,c.layoutBox)){l=this.target||Tt();const h=Yt(this.layout.layoutBox.x);l.x.min=a.target.x.min,l.x.max=l.x.min+h;const f=Yt(this.layout.layoutBox.y);l.y.min=a.target.y.min,l.y.max=l.y.min+f}Pn(o,l),Tr(o,u),Ms(this.projectionDeltaWithTransform,this.layoutCorrected,o,u)}}registerSharedNode(a,o){this.sharedNodes.has(a)||this.sharedNodes.set(a,new dC),this.sharedNodes.get(a).add(o);const c=o.options.initialPromotionConfig;o.promote({transition:c?c.transition:void 0,preserveFollowOpacity:c&&c.shouldPreserveFollowOpacity?c.shouldPreserveFollowOpacity(o):void 0})}isLead(){const a=this.getStack();return a?a.lead===this:!0}getLead(){var o;const{layoutId:a}=this.options;return a?((o=this.getStack())==null?void 0:o.lead)||this:this}getPrevLead(){var o;const{layoutId:a}=this.options;return a?(o=this.getStack())==null?void 0:o.prevLead:void 0}getStack(){const{layoutId:a}=this.options;if(a)return this.root.sharedNodes.get(a)}promote({needsReset:a,transition:o,preserveFollowOpacity:l}={}){const c=this.getStack();c&&c.promote(this,l),a&&(this.projectionDelta=void 0,this.needsReset=!0),o&&this.setOptions({transition:o})}relegate(){const a=this.getStack();return a?a.relegate(this):!1}resetSkewAndRotation(){const{visualElement:a}=this.options;if(!a)return;let o=!1;const{latestValues:l}=a;if((l.z||l.rotate||l.rotateX||l.rotateY||l.rotateZ||l.skewX||l.skewY)&&(o=!0),!o)return;const c={};l.z&&xl("z",a,c,this.animationValues);for(let u=0;u<_l.length;u++)xl(`rotate${_l[u]}`,a,c,this.animationValues),xl(`skew${_l[u]}`,a,c,this.animationValues);a.render();for(const u in c)a.setStaticValue(u,c[u]),this.animationValues&&(this.animationValues[u]=c[u]);a.scheduleRender()}applyProjectionStyles(a,o){if(!this.instance||this.isSVG)return;if(!this.isVisible){a.visibility="hidden";return}const l=this.getTransformTemplate();if(this.needsReset){this.needsReset=!1,a.visibility="",a.opacity="",a.pointerEvents=Oa(o==null?void 0:o.pointerEvents)||"",a.transform=l?l(this.latestValues,""):"none";return}const c=this.getLead();if(!this.projectionDelta||!this.layout||!c.target){this.options.layoutId&&(a.opacity=this.latestValues.opacity!==void 0?this.latestValues.opacity:1,a.pointerEvents=Oa(o==null?void 0:o.pointerEvents)||""),this.hasProjected&&!Oi(this.latestValues)&&(a.transform=l?l({},""):"none",this.hasProjected=!1);return}a.visibility="";const u=c.animationValues||c.latestValues;this.applyTransformsToTarget();let h=rC(this.projectionDeltaWithTransform,this.treeScale,u);l&&(h=l(u,h)),a.transform=h;const{x:f,y:d}=this.projectionDelta;a.transformOrigin=`${f.origin*100}% ${d.origin*100}% 0`,c.animationValues?a.opacity=c===this?u.opacity??this.latestValues.opacity??1:this.preserveOpacity?this.latestValues.opacity:u.opacityExit:a.opacity=c===this?u.opacity!==void 0?u.opacity:"":u.opacityExit!==void 0?u.opacityExit:0;for(const g in Hc){if(u[g]===void 0)continue;const{correct:v,applyTo:m,isCSSVariable:p}=Hc[g],y=h==="none"?u[g]:v(u[g],c);if(m){const x=m.length;for(let _=0;_<x;_++)a[m[_]]=y}else p?this.options.visualElement.renderState.vars[g]=y:a[g]=y}this.options.layoutId&&(a.pointerEvents=c===this?Oa(o==null?void 0:o.pointerEvents)||"":"none")}clearSnapshot(){this.resumeFrom=this.snapshot=void 0}resetTree(){this.root.nodes.forEach(a=>{var o;return(o=a.currentAnimation)==null?void 0:o.stop()}),this.root.nodes.forEach(Yd),this.root.sharedNodes.clear()}}}function gC(n){n.updateLayout()}function vC(n){var t;const e=((t=n.resumeFrom)==null?void 0:t.snapshot)||n.snapshot;if(n.isLead()&&n.layout&&e&&n.hasListeners("didUpdate")){const{layoutBox:i,measuredBox:r}=n.layout,{animationType:s}=n.options,a=e.source!==n.layout.source;s==="size"?vn(h=>{const f=a?e.measuredBox[h]:e.layoutBox[h],d=Yt(f);f.min=i[h].min,f.max=f.min+d}):ev(s,e.layoutBox,i)&&vn(h=>{const f=a?e.measuredBox[h]:e.layoutBox[h],d=Yt(i[h]);f.max=f.min+d,n.relativeTarget&&!n.currentAnimation&&(n.isProjectionDirty=!0,n.relativeTarget[h].max=n.relativeTarget[h].min+d)});const o=br();Ms(o,i,e.layoutBox);const l=br();a?Ms(l,n.applyTransform(r,!0),e.measuredBox):Ms(l,i,e.layoutBox);const c=!qg(o);let u=!1;if(!n.resumeFrom){const h=n.getClosestProjectingParent();if(h&&!h.resumeFrom){const{snapshot:f,layout:d}=h;if(f&&d){const g=Tt();Qa(g,e.layoutBox,f.layoutBox);const v=Tt();Qa(v,i,d.layoutBox),Kg(g,v)||(u=!0),h.options.layoutRoot&&(n.relativeTarget=v,n.relativeTargetOrigin=g,n.relativeParent=h)}}}n.notifyListeners("didUpdate",{layout:i,snapshot:e,delta:l,layoutDelta:o,hasLayoutChanged:c,hasRelativeLayoutChanged:u})}else if(n.isLead()){const{onExitComplete:i}=n.options;i&&i()}n.options.transition=void 0}function _C(n){n.parent&&(n.isProjecting()||(n.isProjectionDirty=n.parent.isProjectionDirty),n.isSharedProjectionDirty||(n.isSharedProjectionDirty=!!(n.isProjectionDirty||n.parent.isProjectionDirty||n.parent.isSharedProjectionDirty)),n.isTransformDirty||(n.isTransformDirty=n.parent.isTransformDirty))}function xC(n){n.isProjectionDirty=n.isSharedProjectionDirty=n.isTransformDirty=!1}function yC(n){n.clearSnapshot()}function Yd(n){n.clearMeasurements()}function qd(n){n.isLayoutDirty=!1}function SC(n){const{visualElement:e}=n.options;e&&e.getProps().onBeforeLayoutMeasure&&e.notify("BeforeLayoutMeasure"),n.resetTransform()}function Kd(n){n.finishAnimation(),n.targetDelta=n.relativeTarget=n.target=void 0,n.isProjectionDirty=!0}function bC(n){n.resolveTargetDelta()}function MC(n){n.calcProjection()}function TC(n){n.resetSkewAndRotation()}function EC(n){n.removeLeadSnapshot()}function Zd(n,e,t){n.translate=vt(e.translate,0,t),n.scale=vt(e.scale,1,t),n.origin=e.origin,n.originPoint=e.originPoint}function $d(n,e,t,i){n.min=vt(e.min,t.min,i),n.max=vt(e.max,t.max,i)}function wC(n,e,t,i){$d(n.x,e.x,t.x,i),$d(n.y,e.y,t.y,i)}function AC(n){return n.animationValues&&n.animationValues.opacityExit!==void 0}const CC={duration:.45,ease:[.4,0,.1,1]},Jd=n=>typeof navigator<"u"&&navigator.userAgent&&navigator.userAgent.toLowerCase().includes(n),Qd=Jd("applewebkit/")&&!Jd("chrome/")?Math.round:Mn;function ep(n){n.min=Qd(n.min),n.max=Qd(n.max)}function RC(n){ep(n.x),ep(n.y)}function ev(n,e,t){return n==="position"||n==="preserve-aspect"&&!J2(Gd(e),Gd(t),.2)}function PC(n){var e;return n!==n.root&&((e=n.scroll)==null?void 0:e.wasRoot)}const DC=Qg({attachResizeListener:(n,e)=>Ls(n,"resize",e),measureScroll:()=>({x:document.documentElement.scrollLeft||document.body.scrollLeft,y:document.documentElement.scrollTop||document.body.scrollTop}),checkIsScrollRoot:()=>!0}),yl={current:void 0},tv=Qg({measureScroll:n=>({x:n.scrollLeft,y:n.scrollTop}),defaultParent:()=>{if(!yl.current){const n=new DC({});n.mount(window),n.setOptions({layoutScroll:!0}),yl.current=n}return yl.current},resetTransform:(n,e)=>{n.style.transform=e!==void 0?e:"none"},checkIsScrollRoot:n=>window.getComputedStyle(n).position==="fixed"}),Bu=ae.createContext({transformPagePoint:n=>n,isStatic:!1,reducedMotion:"never"});function tp(n,e){if(typeof n=="function")return n(e);n!=null&&(n.current=e)}function LC(...n){return e=>{let t=!1;const i=n.map(r=>{const s=tp(r,e);return!t&&typeof s=="function"&&(t=!0),s});if(t)return()=>{for(let r=0;r<i.length;r++){const s=i[r];typeof s=="function"?s():tp(n[r],null)}}}}function UC(...n){return ae.useCallback(LC(...n),n)}class NC extends ae.Component{getSnapshotBeforeUpdate(e){const t=this.props.childRef.current;if(t&&e.isPresent&&!this.props.isPresent){const i=t.offsetParent,r=Tg(i)&&i.offsetWidth||0,s=this.props.sizeRef.current;s.height=t.offsetHeight||0,s.width=t.offsetWidth||0,s.top=t.offsetTop,s.left=t.offsetLeft,s.right=r-s.width-s.left}return null}componentDidUpdate(){}render(){return this.props.children}}function IC({children:n,isPresent:e,anchorX:t,root:i}){var u;const r=ae.useId(),s=ae.useRef(null),a=ae.useRef({width:0,height:0,top:0,left:0,right:0}),{nonce:o}=ae.useContext(Bu),l=((u=n.props)==null?void 0:u.ref)??(n==null?void 0:n.ref),c=UC(s,l);return ae.useInsertionEffect(()=>{const{width:h,height:f,top:d,left:g,right:v}=a.current;if(e||!s.current||!h||!f)return;const m=t==="left"?`left: ${g}`:`right: ${v}`;s.current.dataset.motionPopId=r;const p=document.createElement("style");o&&(p.nonce=o);const y=i??document.head;return y.appendChild(p),p.sheet&&p.sheet.insertRule(`
          [data-motion-pop-id="${r}"] {
            position: absolute !important;
            width: ${h}px !important;
            height: ${f}px !important;
            ${m}px !important;
            top: ${d}px !important;
          }
        `),()=>{y.contains(p)&&y.removeChild(p)}},[e]),D.jsx(NC,{isPresent:e,childRef:s,sizeRef:a,children:ae.cloneElement(n,{ref:c})})}const FC=({children:n,initial:e,isPresent:t,onExitComplete:i,custom:r,presenceAffectsLayout:s,mode:a,anchorX:o,root:l})=>{const c=hu(OC),u=ae.useId();let h=!0,f=ae.useMemo(()=>(h=!1,{id:u,initial:e,isPresent:t,custom:r,onExitComplete:d=>{c.set(d,!0);for(const g of c.values())if(!g)return;i&&i()},register:d=>(c.set(d,!1),()=>c.delete(d))}),[t,c,i]);return s&&h&&(f={...f}),ae.useMemo(()=>{c.forEach((d,g)=>c.set(g,!1))},[t]),ae.useEffect(()=>{!t&&!c.size&&i&&i()},[t]),a==="popLayout"&&(n=D.jsx(IC,{isPresent:t,anchorX:o,root:l,children:n})),D.jsx(co.Provider,{value:f,children:n})};function OC(){return new Map}function nv(n=!0){const e=ae.useContext(co);if(e===null)return[!0,null];const{isPresent:t,onExitComplete:i,register:r}=e,s=ae.useId();ae.useEffect(()=>{if(n)return r(s)},[n]);const a=ae.useCallback(()=>n&&i&&i(s),[s,i,n]);return!t&&i?[!1,a]:[!0]}const Ma=n=>n.key||"";function np(n){const e=[];return ae.Children.forEach(n,t=>{ae.isValidElement(t)&&e.push(t)}),e}const kC=({children:n,custom:e,initial:t=!0,onExitComplete:i,presenceAffectsLayout:r=!0,mode:s="sync",propagate:a=!1,anchorX:o="left",root:l})=>{const[c,u]=nv(a),h=ae.useMemo(()=>np(n),[n]),f=a&&!c?[]:h.map(Ma),d=ae.useRef(!0),g=ae.useRef(h),v=hu(()=>new Map),m=ae.useRef(new Set),[p,y]=ae.useState(h),[x,_]=ae.useState(h);Um(()=>{d.current=!1,g.current=h;for(let E=0;E<x.length;E++){const A=Ma(x[E]);f.includes(A)?(v.delete(A),m.current.delete(A)):v.get(A)!==!0&&v.set(A,!1)}},[x,f.length,f.join("-")]);const S=[];if(h!==p){let E=[...h];for(let A=0;A<x.length;A++){const M=x[A],b=Ma(M);f.includes(b)||(E.splice(A,0,M),S.push(M))}return s==="wait"&&S.length&&(E=S),_(np(E)),y(h),null}const{forceRender:T}=ae.useContext(uu);return D.jsx(D.Fragment,{children:x.map(E=>{const A=Ma(E),M=a&&!c?!1:h===x||f.includes(A),b=()=>{if(m.current.has(A))return;if(m.current.add(A),v.has(A))v.set(A,!0);else return;let L=!0;v.forEach(P=>{P||(L=!1)}),L&&(T==null||T(),_(g.current),a&&(u==null||u()),i&&i())};return D.jsx(FC,{isPresent:M,initial:!d.current||t?void 0:!1,custom:e,presenceAffectsLayout:r,mode:s,root:l,onExitComplete:M?void 0:b,anchorX:o,children:E},A)})})},iv=ae.createContext({strict:!1}),ip={animation:["animate","variants","whileHover","whileTap","exit","whileInView","whileFocus","whileDrag"],exit:["exit"],drag:["drag","dragControls"],focus:["whileFocus"],hover:["whileHover","onHoverStart","onHoverEnd"],tap:["whileTap","onTap","onTapStart","onTapCancel"],pan:["onPan","onPanStart","onPanSessionStart","onPanEnd"],inView:["whileInView","onViewportEnter","onViewportLeave"],layout:["layout","layoutId"]};let rp=!1;function BC(){if(rp)return;const n={};for(const e in ip)n[e]={isEnabled:t=>ip[e].some(i=>!!t[i])};Lg(n),rp=!0}function rv(){return BC(),T2()}function zC(n){const e=rv();for(const t in n)e[t]={...e[t],...n[t]};Lg(e)}const VC=new Set(["animate","exit","variants","initial","style","values","variants","transition","transformTemplate","custom","inherit","onBeforeLayoutMeasure","onAnimationStart","onAnimationComplete","onUpdate","onDragStart","onDrag","onDragEnd","onMeasureDragConstraints","onDirectionLock","onDragTransitionEnd","_dragX","_dragY","onHoverStart","onHoverEnd","onViewportEnter","onViewportLeave","globalTapTarget","ignoreStrict","viewport"]);function eo(n){return n.startsWith("while")||n.startsWith("drag")&&n!=="draggable"||n.startsWith("layout")||n.startsWith("onTap")||n.startsWith("onPan")||n.startsWith("onLayout")||VC.has(n)}let sv=n=>!eo(n);function GC(n){typeof n=="function"&&(sv=e=>e.startsWith("on")?!eo(e):n(e))}try{GC(require("@emotion/is-prop-valid").default)}catch{}function HC(n,e,t){const i={};for(const r in n)r==="values"&&typeof n.values=="object"||(sv(r)||t===!0&&eo(r)||!e&&!eo(r)||n.draggable&&r.startsWith("onDrag"))&&(i[r]=n[r]);return i}const fo=ae.createContext({});function WC(n,e){if(ho(n)){const{initial:t,animate:i}=n;return{initial:t===!1||Ds(t)?t:void 0,animate:Ds(i)?i:void 0}}return n.inherit!==!1?e:{}}function jC(n){const{initial:e,animate:t}=WC(n,ae.useContext(fo));return ae.useMemo(()=>({initial:e,animate:t}),[sp(e),sp(t)])}function sp(n){return Array.isArray(n)?n.join(" "):n}const zu=()=>({style:{},transform:{},transformOrigin:{},vars:{}});function av(n,e,t){for(const i in e)!Vt(e[i])&&!Bg(i,t)&&(n[i]=e[i])}function XC({transformTemplate:n},e){return ae.useMemo(()=>{const t=zu();return Ou(t,e,n),Object.assign({},t.vars,t.style)},[e])}function YC(n,e){const t=n.style||{},i={};return av(i,t,n),Object.assign(i,XC(n,e)),i}function qC(n,e){const t={},i=YC(n,e);return n.drag&&n.dragListener!==!1&&(t.draggable=!1,i.userSelect=i.WebkitUserSelect=i.WebkitTouchCallout="none",i.touchAction=n.drag===!0?"none":`pan-${n.drag==="x"?"y":"x"}`),n.tabIndex===void 0&&(n.onTap||n.onTapStart||n.whileTap)&&(t.tabIndex=0),t.style=i,t}const ov=()=>({...zu(),attrs:{}});function KC(n,e,t,i){const r=ae.useMemo(()=>{const s=ov();return zg(s,e,Gg(i),n.transformTemplate,n.style),{...s.attrs,style:{...s.style}}},[e]);if(n.style){const s={};av(s,n.style,n),r.style={...s,...r.style}}return r}const ZC=["animate","circle","defs","desc","ellipse","g","image","line","filter","marker","mask","metadata","path","pattern","polygon","polyline","rect","stop","switch","symbol","svg","text","tspan","use","view"];function Vu(n){return typeof n!="string"||n.includes("-")?!1:!!(ZC.indexOf(n)>-1||/[A-Z]/u.test(n))}function $C(n,e,t,{latestValues:i},r,s=!1,a){const l=(a??Vu(n)?KC:qC)(e,i,r,n),c=HC(e,typeof n=="string",s),u=n!==ae.Fragment?{...c,...l,ref:t}:{},{children:h}=e,f=ae.useMemo(()=>Vt(h)?h.get():h,[h]);return ae.createElement(n,{...u,children:f})}function JC({scrapeMotionValuesFromProps:n,createRenderState:e},t,i,r){return{latestValues:QC(t,i,r,n),renderState:e()}}function QC(n,e,t,i){const r={},s=i(n,{});for(const f in s)r[f]=Oa(s[f]);let{initial:a,animate:o}=n;const l=ho(n),c=Dg(n);e&&c&&!l&&n.inherit!==!1&&(a===void 0&&(a=e.initial),o===void 0&&(o=e.animate));let u=t?t.initial===!1:!1;u=u||a===!1;const h=u?o:a;if(h&&typeof h!="boolean"&&!uo(h)){const f=Array.isArray(h)?h:[h];for(let d=0;d<f.length;d++){const g=Pu(n,f[d]);if(g){const{transitionEnd:v,transition:m,...p}=g;for(const y in p){let x=p[y];if(Array.isArray(x)){const _=u?x.length-1:0;x=x[_]}x!==null&&(r[y]=x)}for(const y in v)r[y]=v[y]}}}return r}const lv=n=>(e,t)=>{const i=ae.useContext(fo),r=ae.useContext(co),s=()=>JC(n,e,i,r);return t?s():hu(s)},eR=lv({scrapeMotionValuesFromProps:ku,createRenderState:zu}),tR=lv({scrapeMotionValuesFromProps:Hg,createRenderState:ov}),nR=Symbol.for("motionComponentSymbol");function iR(n,e,t){const i=ae.useRef(t);ae.useInsertionEffect(()=>{i.current=t});const r=ae.useRef(null);return ae.useCallback(s=>{var o;s&&((o=n.onMount)==null||o.call(n,s)),e&&(s?e.mount(s):e.unmount());const a=i.current;if(typeof a=="function")if(s){const l=a(s);typeof l=="function"&&(r.current=l)}else r.current?(r.current(),r.current=null):a(s);else a&&(a.current=s)},[e])}const cv=ae.createContext({});function _s(n){return n&&typeof n=="object"&&Object.prototype.hasOwnProperty.call(n,"current")}function rR(n,e,t,i,r,s){var m,p;const{visualElement:a}=ae.useContext(fo),o=ae.useContext(iv),l=ae.useContext(co),c=ae.useContext(Bu).reducedMotion,u=ae.useRef(null);i=i||o.renderer,!u.current&&i&&(u.current=i(n,{visualState:e,parent:a,props:t,presenceContext:l,blockInitialAnimation:l?l.initial===!1:!1,reducedMotionConfig:c,isSVG:s}));const h=u.current,f=ae.useContext(cv);h&&!h.projection&&r&&(h.type==="html"||h.type==="svg")&&sR(u.current,t,r,f);const d=ae.useRef(!1);ae.useInsertionEffect(()=>{h&&d.current&&h.update(t,l)});const g=t[gg],v=ae.useRef(!!g&&!((m=window.MotionHandoffIsComplete)!=null&&m.call(window,g))&&((p=window.MotionHasOptimisedAnimation)==null?void 0:p.call(window,g)));return Um(()=>{h&&(d.current=!0,window.MotionIsMounted=!0,h.updateFeatures(),h.scheduleRenderMicrotask(),v.current&&h.animationState&&h.animationState.animateChanges())}),ae.useEffect(()=>{h&&(!v.current&&h.animationState&&h.animationState.animateChanges(),v.current&&(queueMicrotask(()=>{var y;(y=window.MotionHandoffMarkAsComplete)==null||y.call(window,g)}),v.current=!1),h.enteringChildren=void 0)}),h}function sR(n,e,t,i){const{layoutId:r,layout:s,drag:a,dragConstraints:o,layoutScroll:l,layoutRoot:c,layoutCrossfade:u}=e;n.projection=new t(n.latestValues,e["data-framer-portal-id"]?void 0:uv(n.parent)),n.projection.setOptions({layoutId:r,layout:s,alwaysMeasureLayout:!!a||o&&_s(o),visualElement:n,animationType:typeof s=="string"?s:"both",initialPromotionConfig:i,crossfade:u,layoutScroll:l,layoutRoot:c})}function uv(n){if(n)return n.options.allowProjection!==!1?n.projection:uv(n.parent)}function Sl(n,{forwardMotionProps:e=!1,type:t}={},i,r){i&&zC(i);const s=t?t==="svg":Vu(n),a=s?tR:eR;function o(c,u){let h;const f={...ae.useContext(Bu),...c,layoutId:aR(c)},{isStatic:d}=f,g=jC(c),v=a(c,d);if(!d&&Lm){oR();const m=lR(f);h=m.MeasureLayout,g.visualElement=rR(n,v,f,r,m.ProjectionNode,s)}return D.jsxs(fo.Provider,{value:g,children:[h&&g.visualElement?D.jsx(h,{visualElement:g.visualElement,...f}):null,$C(n,c,iR(v,g.visualElement,u),v,d,e,s)]})}o.displayName=`motion.${typeof n=="string"?n:`create(${n.displayName??n.name??""})`}`;const l=ae.forwardRef(o);return l[nR]=n,l}function aR({layoutId:n}){const e=ae.useContext(uu).id;return e&&n!==void 0?e+"-"+n:n}function oR(n,e){ae.useContext(iv).strict}function lR(n){const e=rv(),{drag:t,layout:i}=e;if(!t&&!i)return{};const r={...t,...i};return{MeasureLayout:t!=null&&t.isEnabled(n)||i!=null&&i.isEnabled(n)?r.MeasureLayout:void 0,ProjectionNode:r.ProjectionNode}}function cR(n,e){if(typeof Proxy>"u")return Sl;const t=new Map,i=(s,a)=>Sl(s,a,n,e),r=(s,a)=>i(s,a);return new Proxy(r,{get:(s,a)=>a==="create"?i:(t.has(a)||t.set(a,Sl(a,void 0,n,e)),t.get(a))})}const uR=(n,e)=>e.isSVG??Vu(n)?new V2(e):new I2(e,{allowProjection:n!==ae.Fragment});class hR extends wi{constructor(e){super(e),e.animationState||(e.animationState=X2(e))}updateAnimationControlsSubscription(){const{animate:e}=this.node.getProps();uo(e)&&(this.unmountControls=e.subscribe(this.node))}mount(){this.updateAnimationControlsSubscription()}update(){const{animate:e}=this.node.getProps(),{animate:t}=this.node.prevProps||{};e!==t&&this.updateAnimationControlsSubscription()}unmount(){var e;this.node.animationState.reset(),(e=this.unmountControls)==null||e.call(this)}}let fR=0;class dR extends wi{constructor(){super(...arguments),this.id=fR++}update(){if(!this.node.presenceContext)return;const{isPresent:e,onExitComplete:t}=this.node.presenceContext,{isPresent:i}=this.node.prevPresenceContext||{};if(!this.node.animationState||e===i)return;const r=this.node.animationState.setActive("exit",!e);t&&!e&&r.then(()=>{t(this.id)})}mount(){const{register:e,onExitComplete:t}=this.node.presenceContext||{};t&&t(this.id),e&&(this.unmount=e(this.id))}unmount(){}}const pR={animation:{Feature:hR},exit:{Feature:dR}};function Vs(n){return{point:{x:n.pageX,y:n.pageY}}}const mR=n=>e=>Nu(e)&&n(e,Vs(e));function Ts(n,e,t,i){return Ls(n,e,mR(t),i)}const hv=({current:n})=>n?n.ownerDocument.defaultView:null,ap=(n,e)=>Math.abs(n-e);function gR(n,e){const t=ap(n.x,e.x),i=ap(n.y,e.y);return Math.sqrt(t**2+i**2)}const op=new Set(["auto","scroll"]);class fv{constructor(e,t,{transformPagePoint:i,contextWindow:r=window,dragSnapToOrigin:s=!1,distanceThreshold:a=3,element:o}={}){if(this.startEvent=null,this.lastMoveEvent=null,this.lastMoveEventInfo=null,this.handlers={},this.contextWindow=window,this.scrollPositions=new Map,this.removeScrollListeners=null,this.onElementScroll=d=>{this.handleScroll(d.target)},this.onWindowScroll=()=>{this.handleScroll(window)},this.updatePoint=()=>{if(!(this.lastMoveEvent&&this.lastMoveEventInfo))return;const d=Ml(this.lastMoveEventInfo,this.history),g=this.startEvent!==null,v=gR(d.offset,{x:0,y:0})>=this.distanceThreshold;if(!g&&!v)return;const{point:m}=d,{timestamp:p}=Nt;this.history.push({...m,timestamp:p});const{onStart:y,onMove:x}=this.handlers;g||(y&&y(this.lastMoveEvent,d),this.startEvent=this.lastMoveEvent),x&&x(this.lastMoveEvent,d)},this.handlePointerMove=(d,g)=>{this.lastMoveEvent=d,this.lastMoveEventInfo=bl(g,this.transformPagePoint),pt.update(this.updatePoint,!0)},this.handlePointerUp=(d,g)=>{this.end();const{onEnd:v,onSessionEnd:m,resumeAnimation:p}=this.handlers;if((this.dragSnapToOrigin||!this.startEvent)&&p&&p(),!(this.lastMoveEvent&&this.lastMoveEventInfo))return;const y=Ml(d.type==="pointercancel"?this.lastMoveEventInfo:bl(g,this.transformPagePoint),this.history);this.startEvent&&v&&v(d,y),m&&m(d,y)},!Nu(e))return;this.dragSnapToOrigin=s,this.handlers=t,this.transformPagePoint=i,this.distanceThreshold=a,this.contextWindow=r||window;const l=Vs(e),c=bl(l,this.transformPagePoint),{point:u}=c,{timestamp:h}=Nt;this.history=[{...u,timestamp:h}];const{onSessionStart:f}=t;f&&f(e,Ml(c,this.history)),this.removeListeners=ks(Ts(this.contextWindow,"pointermove",this.handlePointerMove),Ts(this.contextWindow,"pointerup",this.handlePointerUp),Ts(this.contextWindow,"pointercancel",this.handlePointerUp)),o&&this.startScrollTracking(o)}startScrollTracking(e){let t=e.parentElement;for(;t;){const i=getComputedStyle(t);(op.has(i.overflowX)||op.has(i.overflowY))&&this.scrollPositions.set(t,{x:t.scrollLeft,y:t.scrollTop}),t=t.parentElement}this.scrollPositions.set(window,{x:window.scrollX,y:window.scrollY}),window.addEventListener("scroll",this.onElementScroll,{capture:!0,passive:!0}),window.addEventListener("scroll",this.onWindowScroll,{passive:!0}),this.removeScrollListeners=()=>{window.removeEventListener("scroll",this.onElementScroll,{capture:!0}),window.removeEventListener("scroll",this.onWindowScroll)}}handleScroll(e){const t=this.scrollPositions.get(e);if(!t)return;const i=e===window,r=i?{x:window.scrollX,y:window.scrollY}:{x:e.scrollLeft,y:e.scrollTop},s={x:r.x-t.x,y:r.y-t.y};s.x===0&&s.y===0||(i?this.lastMoveEventInfo&&(this.lastMoveEventInfo.point.x+=s.x,this.lastMoveEventInfo.point.y+=s.y):this.history.length>0&&(this.history[0].x-=s.x,this.history[0].y-=s.y),this.scrollPositions.set(e,r),pt.update(this.updatePoint,!0))}updateHandlers(e){this.handlers=e}end(){this.removeListeners&&this.removeListeners(),this.removeScrollListeners&&this.removeScrollListeners(),this.scrollPositions.clear(),Ti(this.updatePoint)}}function bl(n,e){return e?{point:e(n.point)}:n}function lp(n,e){return{x:n.x-e.x,y:n.y-e.y}}function Ml({point:n},e){return{point:n,delta:lp(n,dv(e)),offset:lp(n,vR(e)),velocity:_R(e,.1)}}function vR(n){return n[0]}function dv(n){return n[n.length-1]}function _R(n,e){if(n.length<2)return{x:0,y:0};let t=n.length-1,i=null;const r=dv(n);for(;t>=0&&(i=n[t],!(r.timestamp-i.timestamp>ti(e)));)t--;if(!i)return{x:0,y:0};const s=bn(r.timestamp-i.timestamp);if(s===0)return{x:0,y:0};const a={x:(r.x-i.x)/s,y:(r.y-i.y)/s};return a.x===1/0&&(a.x=0),a.y===1/0&&(a.y=0),a}function xR(n,{min:e,max:t},i){return e!==void 0&&n<e?n=i?vt(e,n,i.min):Math.max(n,e):t!==void 0&&n>t&&(n=i?vt(t,n,i.max):Math.min(n,t)),n}function cp(n,e,t){return{min:e!==void 0?n.min+e:void 0,max:t!==void 0?n.max+t-(n.max-n.min):void 0}}function yR(n,{top:e,left:t,bottom:i,right:r}){return{x:cp(n.x,t,r),y:cp(n.y,e,i)}}function up(n,e){let t=e.min-n.min,i=e.max-n.max;return e.max-e.min<n.max-n.min&&([t,i]=[i,t]),{min:t,max:i}}function SR(n,e){return{x:up(n.x,e.x),y:up(n.y,e.y)}}function bR(n,e){let t=.5;const i=Yt(n),r=Yt(e);return r>i?t=Cs(e.min,e.max-i,n.min):i>r&&(t=Cs(n.min,n.max-r,e.min)),Vn(0,1,t)}function MR(n,e){const t={};return e.min!==void 0&&(t.min=e.min-n.min),e.max!==void 0&&(t.max=e.max-n.min),t}const Wc=.35;function TR(n=Wc){return n===!1?n=0:n===!0&&(n=Wc),{x:hp(n,"left","right"),y:hp(n,"top","bottom")}}function hp(n,e,t){return{min:fp(n,e),max:fp(n,t)}}function fp(n,e){return typeof n=="number"?n:n[e]||0}const ER=new WeakMap;class wR{constructor(e){this.openDragLock=null,this.isDragging=!1,this.currentDirection=null,this.originPoint={x:0,y:0},this.constraints=!1,this.hasMutatedConstraints=!1,this.elastic=Tt(),this.latestPointerEvent=null,this.latestPanInfo=null,this.visualElement=e}start(e,{snapToCursor:t=!1,distanceThreshold:i}={}){const{presenceContext:r}=this.visualElement;if(r&&r.isPresent===!1)return;const s=h=>{t?(this.stopAnimation(),this.snapToCursor(Vs(h).point)):this.pauseAnimation()},a=(h,f)=>{this.stopAnimation();const{drag:d,dragPropagation:g,onDragStart:v}=this.getProps();if(d&&!g&&(this.openDragLock&&this.openDragLock(),this.openDragLock=f2(d),!this.openDragLock))return;this.latestPointerEvent=h,this.latestPanInfo=f,this.isDragging=!0,this.currentDirection=null,this.resolveConstraints(),this.visualElement.projection&&(this.visualElement.projection.isAnimationBlocked=!0,this.visualElement.projection.target=void 0),vn(p=>{let y=this.getAxisMotionValue(p).get()||0;if(zn.test(y)){const{projection:x}=this.visualElement;if(x&&x.layout){const _=x.layout.layoutBox[p];_&&(y=Yt(_)*(parseFloat(y)/100))}}this.originPoint[p]=y}),v&&pt.postRender(()=>v(h,f)),Oc(this.visualElement,"transform");const{animationState:m}=this.visualElement;m&&m.setActive("whileDrag",!0)},o=(h,f)=>{this.latestPointerEvent=h,this.latestPanInfo=f;const{dragPropagation:d,dragDirectionLock:g,onDirectionLock:v,onDrag:m}=this.getProps();if(!d&&!this.openDragLock)return;const{offset:p}=f;if(g&&this.currentDirection===null){this.currentDirection=AR(p),this.currentDirection!==null&&v&&v(this.currentDirection);return}this.updateAxis("x",f.point,p),this.updateAxis("y",f.point,p),this.visualElement.render(),m&&m(h,f)},l=(h,f)=>{this.latestPointerEvent=h,this.latestPanInfo=f,this.stop(h,f),this.latestPointerEvent=null,this.latestPanInfo=null},c=()=>vn(h=>{var f;return this.getAnimationState(h)==="paused"&&((f=this.getAxisMotionValue(h).animation)==null?void 0:f.play())}),{dragSnapToOrigin:u}=this.getProps();this.panSession=new fv(e,{onSessionStart:s,onStart:a,onMove:o,onSessionEnd:l,resumeAnimation:c},{transformPagePoint:this.visualElement.getTransformPagePoint(),dragSnapToOrigin:u,distanceThreshold:i,contextWindow:hv(this.visualElement),element:this.visualElement.current})}stop(e,t){const i=e||this.latestPointerEvent,r=t||this.latestPanInfo,s=this.isDragging;if(this.cancel(),!s||!r||!i)return;const{velocity:a}=r;this.startAnimation(a);const{onDragEnd:o}=this.getProps();o&&pt.postRender(()=>o(i,r))}cancel(){this.isDragging=!1;const{projection:e,animationState:t}=this.visualElement;e&&(e.isAnimationBlocked=!1),this.panSession&&this.panSession.end(),this.panSession=void 0;const{dragPropagation:i}=this.getProps();!i&&this.openDragLock&&(this.openDragLock(),this.openDragLock=null),t&&t.setActive("whileDrag",!1)}updateAxis(e,t,i){const{drag:r}=this.getProps();if(!i||!Ta(e,r,this.currentDirection))return;const s=this.getAxisMotionValue(e);let a=this.originPoint[e]+i[e];this.constraints&&this.constraints[e]&&(a=xR(a,this.constraints[e],this.elastic[e])),s.set(a)}resolveConstraints(){var s;const{dragConstraints:e,dragElastic:t}=this.getProps(),i=this.visualElement.projection&&!this.visualElement.projection.layout?this.visualElement.projection.measure(!1):(s=this.visualElement.projection)==null?void 0:s.layout,r=this.constraints;e&&_s(e)?this.constraints||(this.constraints=this.resolveRefConstraints()):e&&i?this.constraints=yR(i.layoutBox,e):this.constraints=!1,this.elastic=TR(t),r!==this.constraints&&i&&this.constraints&&!this.hasMutatedConstraints&&vn(a=>{this.constraints!==!1&&this.getAxisMotionValue(a)&&(this.constraints[a]=MR(i.layoutBox[a],this.constraints[a]))})}resolveRefConstraints(){const{dragConstraints:e,onMeasureDragConstraints:t}=this.getProps();if(!e||!_s(e))return!1;const i=e.current,{projection:r}=this.visualElement;if(!r||!r.layout)return!1;const s=R2(i,r.root,this.visualElement.getTransformPagePoint());let a=SR(r.layout.layoutBox,s);if(t){const o=t(w2(a));this.hasMutatedConstraints=!!o,o&&(a=Ng(o))}return a}startAnimation(e){const{drag:t,dragMomentum:i,dragElastic:r,dragTransition:s,dragSnapToOrigin:a,onDragTransitionEnd:o}=this.getProps(),l=this.constraints||{},c=vn(u=>{if(!Ta(u,t,this.currentDirection))return;let h=l&&l[u]||{};a&&(h={min:0,max:0});const f=r?200:1e6,d=r?40:1e7,g={type:"inertia",velocity:i?e[u]:0,bounceStiffness:f,bounceDamping:d,timeConstant:750,restDelta:1,restSpeed:10,...s,...h};return this.startAxisValueAnimation(u,g)});return Promise.all(c).then(o)}startAxisValueAnimation(e,t){const i=this.getAxisMotionValue(e);return Oc(this.visualElement,e),i.start(Ru(e,i,0,t,this.visualElement,!1))}stopAnimation(){vn(e=>this.getAxisMotionValue(e).stop())}pauseAnimation(){vn(e=>{var t;return(t=this.getAxisMotionValue(e).animation)==null?void 0:t.pause()})}getAnimationState(e){var t;return(t=this.getAxisMotionValue(e).animation)==null?void 0:t.state}getAxisMotionValue(e){const t=`_drag${e.toUpperCase()}`,i=this.visualElement.getProps(),r=i[t];return r||this.visualElement.getValue(e,(i.initial?i.initial[e]:void 0)||0)}snapToCursor(e){vn(t=>{const{drag:i}=this.getProps();if(!Ta(t,i,this.currentDirection))return;const{projection:r}=this.visualElement,s=this.getAxisMotionValue(t);if(r&&r.layout){const{min:a,max:o}=r.layout.layoutBox[t],l=s.get()||0;s.set(e[t]-vt(a,o,.5)+l)}})}scalePositionWithinConstraints(){if(!this.visualElement.current)return;const{drag:e,dragConstraints:t}=this.getProps(),{projection:i}=this.visualElement;if(!_s(t)||!i||!this.constraints)return;this.stopAnimation();const r={x:0,y:0};vn(a=>{const o=this.getAxisMotionValue(a);if(o&&this.constraints!==!1){const l=o.get();r[a]=bR({min:l,max:l},this.constraints[a])}});const{transformTemplate:s}=this.visualElement.getProps();this.visualElement.current.style.transform=s?s({},""):"none",i.root&&i.root.updateScroll(),i.updateLayout(),this.resolveConstraints(),vn(a=>{if(!Ta(a,e,null))return;const o=this.getAxisMotionValue(a),{min:l,max:c}=this.constraints[a];o.set(vt(l,c,r[a]))})}addListeners(){if(!this.visualElement.current)return;ER.set(this.visualElement,this);const e=this.visualElement.current,t=Ts(e,"pointerdown",l=>{const{drag:c,dragListener:u=!0}=this.getProps();c&&u&&!Cg(l.target)&&this.start(l)}),i=()=>{const{dragConstraints:l}=this.getProps();_s(l)&&l.current&&(this.constraints=this.resolveRefConstraints())},{projection:r}=this.visualElement,s=r.addEventListener("measure",i);r&&!r.layout&&(r.root&&r.root.updateScroll(),r.updateLayout()),pt.read(i);const a=Ls(window,"resize",()=>this.scalePositionWithinConstraints()),o=r.addEventListener("didUpdate",(({delta:l,hasLayoutChanged:c})=>{this.isDragging&&c&&(vn(u=>{const h=this.getAxisMotionValue(u);h&&(this.originPoint[u]+=l[u].translate,h.set(h.get()+l[u].translate))}),this.visualElement.render())}));return()=>{a(),t(),s(),o&&o()}}getProps(){const e=this.visualElement.getProps(),{drag:t=!1,dragDirectionLock:i=!1,dragPropagation:r=!1,dragConstraints:s=!1,dragElastic:a=Wc,dragMomentum:o=!0}=e;return{...e,drag:t,dragDirectionLock:i,dragPropagation:r,dragConstraints:s,dragElastic:a,dragMomentum:o}}}function Ta(n,e,t){return(e===!0||e===n)&&(t===null||t===n)}function AR(n,e=10){let t=null;return Math.abs(n.y)>e?t="y":Math.abs(n.x)>e&&(t="x"),t}class CR extends wi{constructor(e){super(e),this.removeGroupControls=Mn,this.removeListeners=Mn,this.controls=new wR(e)}mount(){const{dragControls:e}=this.node.getProps();e&&(this.removeGroupControls=e.subscribe(this.controls)),this.removeListeners=this.controls.addListeners()||Mn}update(){const{dragControls:e}=this.node.getProps(),{dragControls:t}=this.node.prevProps||{};e!==t&&(this.removeGroupControls(),e&&(this.removeGroupControls=e.subscribe(this.controls)))}unmount(){this.removeGroupControls(),this.removeListeners()}}const dp=n=>(e,t)=>{n&&pt.postRender(()=>n(e,t))};class RR extends wi{constructor(){super(...arguments),this.removePointerDownListener=Mn}onPointerDown(e){this.session=new fv(e,this.createPanHandlers(),{transformPagePoint:this.node.getTransformPagePoint(),contextWindow:hv(this.node)})}createPanHandlers(){const{onPanSessionStart:e,onPanStart:t,onPan:i,onPanEnd:r}=this.node.getProps();return{onSessionStart:dp(e),onStart:dp(t),onMove:i,onEnd:(s,a)=>{delete this.session,r&&pt.postRender(()=>r(s,a))}}}mount(){this.removePointerDownListener=Ts(this.node.current,"pointerdown",e=>this.onPointerDown(e))}update(){this.session&&this.session.updateHandlers(this.createPanHandlers())}unmount(){this.removePointerDownListener(),this.session&&this.session.end()}}let Tl=!1;class PR extends ae.Component{componentDidMount(){const{visualElement:e,layoutGroup:t,switchLayoutGroup:i,layoutId:r}=this.props,{projection:s}=e;s&&(t.group&&t.group.add(s),i&&i.register&&r&&i.register(s),Tl&&s.root.didUpdate(),s.addEventListener("animationComplete",()=>{this.safeToRemove()}),s.setOptions({...s.options,onExitComplete:()=>this.safeToRemove()})),ka.hasEverUpdated=!0}getSnapshotBeforeUpdate(e){const{layoutDependency:t,visualElement:i,drag:r,isPresent:s}=this.props,{projection:a}=i;return a&&(a.isPresent=s,Tl=!0,r||e.layoutDependency!==t||t===void 0||e.isPresent!==s?a.willUpdate():this.safeToRemove(),e.isPresent!==s&&(s?a.promote():a.relegate()||pt.postRender(()=>{const o=a.getStack();(!o||!o.members.length)&&this.safeToRemove()}))),null}componentDidUpdate(){const{projection:e}=this.props.visualElement;e&&(e.root.didUpdate(),Uu.postRender(()=>{!e.currentAnimation&&e.isLead()&&this.safeToRemove()}))}componentWillUnmount(){const{visualElement:e,layoutGroup:t,switchLayoutGroup:i}=this.props,{projection:r}=e;Tl=!0,r&&(r.scheduleCheckAfterUnmount(),t&&t.group&&t.group.remove(r),i&&i.deregister&&i.deregister(r))}safeToRemove(){const{safeToRemove:e}=this.props;e&&e()}render(){return null}}function pv(n){const[e,t]=nv(),i=ae.useContext(uu);return D.jsx(PR,{...n,layoutGroup:i,switchLayoutGroup:ae.useContext(cv),isPresent:e,safeToRemove:t})}const DR={pan:{Feature:RR},drag:{Feature:CR,ProjectionNode:tv,MeasureLayout:pv}};function pp(n,e,t){const{props:i}=n;n.animationState&&i.whileHover&&n.animationState.setActive("whileHover",t==="Start");const r="onHover"+t,s=i[r];s&&pt.postRender(()=>s(e,Vs(e)))}class LR extends wi{mount(){const{current:e}=this.node;e&&(this.unmount=d2(e,(t,i)=>(pp(this.node,i,"Start"),r=>pp(this.node,r,"End"))))}unmount(){}}class UR extends wi{constructor(){super(...arguments),this.isActive=!1}onFocus(){let e=!1;try{e=this.node.current.matches(":focus-visible")}catch{e=!0}!e||!this.node.animationState||(this.node.animationState.setActive("whileFocus",!0),this.isActive=!0)}onBlur(){!this.isActive||!this.node.animationState||(this.node.animationState.setActive("whileFocus",!1),this.isActive=!1)}mount(){this.unmount=ks(Ls(this.node.current,"focus",()=>this.onFocus()),Ls(this.node.current,"blur",()=>this.onBlur()))}unmount(){}}function mp(n,e,t){const{props:i}=n;if(n.current instanceof HTMLButtonElement&&n.current.disabled)return;n.animationState&&i.whileTap&&n.animationState.setActive("whileTap",t==="Start");const r="onTap"+(t==="End"?"":t),s=i[r];s&&pt.postRender(()=>s(e,Vs(e)))}class NR extends wi{mount(){const{current:e}=this.node;e&&(this.unmount=g2(e,(t,i)=>(mp(this.node,i,"Start"),(r,{success:s})=>mp(this.node,r,s?"End":"Cancel")),{useGlobalTarget:this.node.props.globalTapTarget}))}unmount(){}}const jc=new WeakMap,El=new WeakMap,IR=n=>{const e=jc.get(n.target);e&&e(n)},FR=n=>{n.forEach(IR)};function OR({root:n,...e}){const t=n||document;El.has(t)||El.set(t,{});const i=El.get(t),r=JSON.stringify(e);return i[r]||(i[r]=new IntersectionObserver(FR,{root:n,...e})),i[r]}function kR(n,e,t){const i=OR(e);return jc.set(n,t),i.observe(n),()=>{jc.delete(n),i.unobserve(n)}}const BR={some:0,all:1};class zR extends wi{constructor(){super(...arguments),this.hasEnteredView=!1,this.isInView=!1}startObserver(){this.unmount();const{viewport:e={}}=this.node.getProps(),{root:t,margin:i,amount:r="some",once:s}=e,a={root:t?t.current:void 0,rootMargin:i,threshold:typeof r=="number"?r:BR[r]},o=l=>{const{isIntersecting:c}=l;if(this.isInView===c||(this.isInView=c,s&&!c&&this.hasEnteredView))return;c&&(this.hasEnteredView=!0),this.node.animationState&&this.node.animationState.setActive("whileInView",c);const{onViewportEnter:u,onViewportLeave:h}=this.node.getProps(),f=c?u:h;f&&f(l)};return kR(this.node.current,a,o)}mount(){this.startObserver()}update(){if(typeof IntersectionObserver>"u")return;const{props:e,prevProps:t}=this.node;["amount","margin","root"].some(VR(e,t))&&this.startObserver()}unmount(){}}function VR({viewport:n={}},{viewport:e={}}={}){return t=>n[t]!==e[t]}const GR={inView:{Feature:zR},tap:{Feature:NR},focus:{Feature:UR},hover:{Feature:LR}},HR={layout:{ProjectionNode:tv,MeasureLayout:pv}},WR={...pR,...GR,...DR,...HR},jR=cR(WR,uR);function XR({userId:n,open:e,selectedNodes:t,onClose:i,onSynthesized:r}){const{t:s}=si(),a=Kv(n),o=ae.useRef(null),[l,c]=ae.useState(""),[u,h]=ae.useState(""),[f,d]=ae.useState(null),[g,v]=ae.useState(!1);ae.useEffect(()=>()=>{o.current&&clearTimeout(o.current)},[]);const m=()=>{o.current&&(clearTimeout(o.current),o.current=null),i()};ae.useEffect(()=>{if(e&&!l&&t.length>0){const x=t.slice(0,2).map(_=>(_.summary.split(/[\.\!\?]/)[0]??"").trim()).filter(Boolean).join(" + ");c(x.slice(0,80))}e||(c(""),h(""),d(null))},[e,t,l]);async function p(){d(null);try{await a.mutateAsync({title:l.trim(),content:u.trim(),references:t.map(x=>x.id)}),v(!0),r==null||r(),o.current=setTimeout(()=>{v(!1),i()},800)}catch{d(s("brain.compose.errorGeneric"))}}const y=l.trim().length>0&&u.trim().length>0&&t.length>=2&&!a.isPending;return D.jsx(kC,{children:e&&D.jsxs(jR.div,{initial:{x:"100%",opacity:0},animate:{x:0,opacity:1},exit:{x:"100%",opacity:0},transition:{type:"spring",stiffness:320,damping:28},className:"absolute inset-x-3 bottom-3 z-30 flex max-h-[80%] flex-col border border-white/10 bg-black/85 sm:inset-x-auto sm:right-3 sm:top-14 sm:bottom-3 sm:w-[min(420px,calc(100%-1.5rem))] sm:max-h-[calc(100%-4.5rem)]",children:[D.jsxs("div",{className:"flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3",children:[D.jsx("h3",{className:"text-sm font-semibold text-white",children:s("brain.compose.title",{count:t.length})}),D.jsx("button",{type:"button",onClick:m,"aria-label":s("brain.compose.cancel"),className:"rounded-[2px] p-1 text-white/40 transition-colors hover:text-white",children:D.jsx(xp,{className:"size-3.5"})})]}),D.jsxs("div",{className:"flex-1 overflow-y-auto px-4 py-3",children:[t.length>0&&D.jsx("div",{className:"mb-3 flex flex-wrap gap-1.5",children:t.map(x=>D.jsx("span",{className:"max-w-[14rem] truncate rounded-[2px] bg-white/10 px-2 py-0.5 text-[11px] text-white/70",title:x.summary,children:x.summary},x.id))}),D.jsxs("label",{className:"mb-3 block",children:[D.jsx("span",{className:"block text-[10px] font-semibold uppercase tracking-wider text-white/40",children:s("brain.compose.titleField")}),D.jsx("input",{type:"text",value:l,onChange:x=>c(x.target.value),className:"mt-1 w-full rounded-[2px] border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-zaki-brand focus:ring-1 focus:ring-zaki-brand/30"})]}),D.jsxs("label",{className:"block",children:[D.jsx("span",{className:"block text-[10px] font-semibold uppercase tracking-wider text-white/40",children:s("brain.compose.contentField")}),D.jsx("textarea",{value:u,onChange:x=>h(x.target.value),rows:6,className:"mt-1 w-full resize-y rounded-[2px] border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-zaki-brand focus:ring-1 focus:ring-zaki-brand/30"})]}),f&&D.jsx("div",{className:"mt-2 text-xs text-zaki-error",children:f})]}),D.jsxs("div",{className:"flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-3",children:[g?D.jsx("span",{className:"text-xs font-semibold text-zaki-brand",children:s("brain.compose.youSynthesized")}):D.jsx("span",{className:"text-[11px] text-white/40",children:s("brain.compose.referenceCount",{defaultValue:"{{count}} references",count:t.length})}),D.jsx("button",{type:"button",disabled:!y,onClick:p,className:"rounded-[2px] border border-zaki-brand/30 bg-zaki-brand px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zaki-brand-hover disabled:opacity-50",children:a.isPending?s("brain.compose.submitting"):s("brain.compose.submit")})]})]})})}const YR=[{id:"community",label:"Theme"},{id:"kind",label:"Kind"},{id:"recency",label:"Recency"},{id:"status",label:"Status"},{id:"mono",label:"Mono"}],qR={excludeOrphans:!0,linkTypes:[],search:"",maxNodes:2e3,colorPreset:"community",semanticEdgeThreshold:.85,nodeRepulsion:140,idealEdgeLength:120,gravity:.04,edgeElasticity:.4,textFadeThreshold:.6,nodeSizeScale:1};function KR(n){return n>=.98?"Strongest only":n>=.9?"Strong":n>=.82?"Balanced":n>=.75?"Loose":"Show all"}function gp({filters:n,onChange:e}){const{t}=si(),i=(s,a)=>e({...n,[s]:a}),r=s=>{const a=n.linkTypes.includes(s)?n.linkTypes.filter(o=>o!==s):[...n.linkTypes,s];i("linkTypes",a)};return D.jsxs("aside",{className:"flex w-72 shrink-0 flex-col gap-5 overflow-y-auto rounded-[2px] border border-white/10 bg-[#181818] p-4 text-sm text-white/85","data-testid":"brain-filter-panel",children:[D.jsxs(fs,{title:t("brain.filterPanel.filters",{defaultValue:"Filters"}),children:[D.jsx(ZR,{label:t("brain.filterPanel.excludeOrphans",{defaultValue:"Hide orphans"}),value:n.excludeOrphans,onChange:s=>i("excludeOrphans",s)}),D.jsx(Ii,{label:t("brain.filterPanel.semanticThreshold",{defaultValue:"Connection strength"}),min:.7,max:1,step:.05,value:n.semanticEdgeThreshold,onChange:s=>i("semanticEdgeThreshold",s),formatValue:KR,hint:t("brain.filterPanel.semanticThresholdHint",{defaultValue:"Lines link memories that look alike. Higher = only the strongest links."})}),D.jsx($R,{label:t("brain.filterPanel.maxNodes",{defaultValue:"Max nodes"}),min:50,max:8e3,step:250,value:n.maxNodes,onChange:s=>i("maxNodes",s)})]}),D.jsxs(fs,{title:t("brain.filterPanel.linkTypes",{defaultValue:"Link types"}),children:[D.jsx("div",{className:"flex flex-wrap gap-1.5",children:Nv.map(s=>{const a=n.linkTypes.includes(s),o=Sp[s];return D.jsxs("button",{type:"button",onClick:()=>r(s),className:`flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 text-xs transition ${a?"border-white/85 bg-white/10 text-white/85":"border-white/10 text-white/55 hover:border-white/40"}`,"data-testid":`brain-link-type-pill-${s}`,children:[D.jsx("span",{className:"size-2 rounded-[1px]",style:{backgroundColor:o},"aria-hidden":!0}),s]},s)})}),n.linkTypes.length>0&&D.jsx("button",{type:"button",onClick:()=>i("linkTypes",[]),className:"mt-2 text-xs text-white/55 underline-offset-2 hover:underline",children:t("brain.filterPanel.clearLinkTypes",{defaultValue:"Clear"})})]}),D.jsx(fs,{title:t("brain.filterPanel.colorBy",{defaultValue:"Color by"}),children:D.jsx("div",{className:"flex flex-wrap gap-1",children:YR.map(({id:s,label:a})=>D.jsx("button",{type:"button",onClick:()=>i("colorPreset",s),className:`flex-1 rounded-[2px] border px-2 py-1 text-xs ${n.colorPreset===s?"border-zaki-brand bg-zaki-brand-10 text-white/85":"border-white/10 text-white/55 hover:border-white/40"}`,"data-testid":`brain-color-preset-${s}`,children:t(`brain.filterPanel.colorBy.${s}`,{defaultValue:a})},s))})}),D.jsxs(fs,{title:t("brain.filterPanel.display",{defaultValue:"Display"}),children:[D.jsx(Ii,{label:t("brain.filterPanel.nodeSize",{defaultValue:"Node size"}),min:.5,max:2,step:.1,value:n.nodeSizeScale,onChange:s=>i("nodeSizeScale",s)}),D.jsx(Ii,{label:t("brain.filterPanel.textFade",{defaultValue:"Text fade"}),min:.2,max:1.5,step:.05,value:n.textFadeThreshold,onChange:s=>i("textFadeThreshold",s)})]}),D.jsxs(fs,{title:t("brain.filterPanel.forces",{defaultValue:"Forces"}),children:[D.jsx(Ii,{label:t("brain.filterPanel.repel",{defaultValue:"Repel force"}),min:20,max:500,step:10,value:n.nodeRepulsion,onChange:s=>i("nodeRepulsion",s)}),D.jsx(Ii,{label:t("brain.filterPanel.linkDistance",{defaultValue:"Link distance"}),min:40,max:300,step:10,value:n.idealEdgeLength,onChange:s=>i("idealEdgeLength",s)}),D.jsx(Ii,{label:t("brain.filterPanel.linkForce",{defaultValue:"Link force"}),min:.02,max:1.2,step:.02,value:n.edgeElasticity,onChange:s=>i("edgeElasticity",s)}),D.jsx(Ii,{label:t("brain.filterPanel.center",{defaultValue:"Center force"}),min:0,max:.3,step:.01,value:n.gravity,onChange:s=>i("gravity",s)})]})]})}function fs({title:n,children:e}){return D.jsxs("div",{children:[D.jsx("h3",{className:"mb-2 text-xs font-medium uppercase tracking-wide text-white/55",children:n}),D.jsx("div",{className:"space-y-2",children:e})]})}function ZR({label:n,value:e,onChange:t}){return D.jsxs("label",{className:"flex cursor-pointer items-center justify-between gap-2 text-sm",children:[D.jsx("span",{className:"text-white/85",children:n}),D.jsx("input",{type:"checkbox",checked:e,onChange:i=>t(i.target.checked),className:"size-4 accent-zaki-brand"})]})}function $R({label:n,value:e,min:t,max:i,step:r,onChange:s}){return D.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm",children:[D.jsx("span",{className:"text-white/85",children:n}),D.jsx("input",{type:"number",value:e,min:t,max:i,step:r,onChange:a=>s(Number(a.target.value)),className:"w-20 rounded-zaki-md border border-white/10 bg-[#1f1f1f] px-2 py-0.5 text-sm text-white/85 focus:border-zaki-brand focus:outline-none"})]})}function Ii({label:n,value:e,min:t,max:i,step:r,onChange:s,formatValue:a,hint:o}){return D.jsxs("div",{children:[D.jsxs("div",{className:"mb-1 flex justify-between text-xs",children:[D.jsx("span",{className:"text-white/85",children:n}),D.jsx("span",{className:"text-white/55",children:a?a(e):e})]}),D.jsx("input",{type:"range",min:t,max:i,step:r,value:e,onChange:l=>s(Number(l.target.value)),className:"w-full accent-zaki-brand"}),o?D.jsx("p",{className:"mt-1 text-[11px] leading-snug text-white/40",children:o}):null]})}function JR(){return new Date().toISOString().slice(0,10)}function wl(n,e){const t=new Date(n+"T00:00:00Z");return t.setUTCDate(t.getUTCDate()+e),t.toISOString().slice(0,10)}function QR({userId:n,onHighlightKeys:e,onPick:t}){var h,f;const{t:i}=si(),[r,s]=ae.useState(JR()),[a,o]=ae.useState(!1),l=Qv(n,{date:r});ae.useEffect(()=>{if(!l.data)return;const d=[];for(const g of l.data.births)d.push(g.key);for(const g of l.data.deaths)d.push(g.key);e(d)},[l.data,e]),ae.useEffect(()=>{if(!a)return;let d=30;const g=window.setInterval(()=>{s(v=>wl(v,-1)),d-=1,d<=0&&o(!1)},1e3);return()=>window.clearInterval(g)},[a]);const c=((h=l.data)==null?void 0:h.births)??[],u=((f=l.data)==null?void 0:f.deaths)??[];return D.jsxs("section",{className:"flex flex-col gap-2 rounded-zaki-lg border border-white/10 bg-[#181818] p-3 text-sm","data-testid":"brain-time-scrubber",children:[D.jsxs("header",{className:"flex flex-wrap items-center justify-between gap-2",children:[D.jsx("h3",{className:"text-xs font-medium uppercase tracking-wide text-white/55",children:i("brain.scrubber.title",{defaultValue:"Time scrubber"})}),D.jsxs("div",{className:"flex flex-wrap items-center gap-1.5",children:[D.jsx("input",{type:"date",value:r,onChange:d=>s(d.target.value),className:"rounded-zaki-md border border-white/10 bg-[#1f1f1f] px-2 py-0.5 text-xs text-white/85 focus:border-zaki-brand focus:outline-none","data-testid":"brain-scrubber-date"}),D.jsx("button",{type:"button",onClick:()=>{s(d=>wl(d,-1))},className:"rounded-zaki-md border border-white/10 px-2 py-0.5 text-xs text-white/55 hover:text-white","aria-label":i("brain.scrubber.prevDay",{defaultValue:"Previous day"}),children:"‹"}),D.jsx("button",{type:"button",onClick:()=>{s(d=>wl(d,1))},className:"rounded-zaki-md border border-white/10 px-2 py-0.5 text-xs text-white/55 hover:text-white","aria-label":i("brain.scrubber.nextDay",{defaultValue:"Next day"}),children:"›"}),D.jsx("button",{type:"button",onClick:()=>o(d=>!d),"aria-pressed":a,title:i("brain.scrubber.animateHint",{defaultValue:"Replay the last 30 days — memories light up on the graph as they're added or archived."}),className:`rounded-zaki-md border px-2 py-0.5 text-xs transition ${a?"border-zaki-brand bg-zaki-brand-10 text-zaki-brand":"border-white/10 text-white/85 hover:border-zaki-brand"}`,"data-testid":"brain-scrubber-animate",children:a?i("brain.scrubber.stop",{defaultValue:"Stop"}):i("brain.scrubber.animate",{defaultValue:"Animate"})})]})]}),D.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[D.jsx(vp,{title:i("brain.scrubber.born",{defaultValue:"Born"}),tone:"positive",items:c,onPick:t}),D.jsx(vp,{title:i("brain.scrubber.archived",{defaultValue:"Archived"}),tone:"negative",items:u,onPick:t})]}),!l.isLoading&&c.length===0&&u.length===0?D.jsx("p",{className:"px-0.5 text-xs text-white/45",children:a?i("brain.scrubber.emptyAnimating",{defaultValue:"No memories changed on this day — keep watching as the window rewinds."}):i("brain.scrubber.empty",{defaultValue:"No memories added or archived around this date. Try Animate to scan the last 30 days."})}):null]})}function vp({title:n,tone:e,items:t,onPick:i}){const r=e==="positive"?"bg-zaki-success":"bg-zaki-warning";return D.jsxs("div",{className:"min-w-0",children:[D.jsxs("div",{className:"mb-1 flex items-center gap-1.5 text-xs text-white/55",children:[D.jsx("span",{className:`size-1.5 rounded-[1px] ${r}`,"aria-hidden":!0}),D.jsxs("span",{children:[n," ",D.jsxs("span",{className:"text-white/55",children:["(",t.length,")"]})]})]}),D.jsxs("ul",{className:"max-h-32 space-y-0.5 overflow-y-auto",children:[t.length===0&&D.jsx("li",{className:"px-1 text-xs text-white/55",children:"—"}),t.map(s=>D.jsx("li",{children:D.jsx("button",{type:"button",onClick:()=>i(s.key),className:"block w-full truncate rounded-zaki-md px-1 py-0.5 text-left text-xs text-white/85 hover:bg-white/5",children:s.summary})},`${e}-${s.key}`))]})]})}const eP=/\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i;function tP(n){return n?eP.test(n):!1}function nP({userId:n,total:e}){const{t}=si(),i=Xc(n),r=yp(n,{limit:50}),s=ae.useMemo(()=>{var f,d,g,v;const o=Date.now()/1e3-10080*60,c=(((g=(d=(f=r.data)==null?void 0:f.pages)==null?void 0:d[0])==null?void 0:g.entries)??[]).filter(m=>(m.created_at??0)>=o).length,u=(((v=i.data)==null?void 0:v.communities)??[]).slice().filter(m=>!tP(m.name)).sort((m,p)=>(p.member_count??0)-(m.member_count??0)),h=u.find(m=>m.name_source==="llm")??u[0];return{total:e,newThisWeek:c,topCommunityName:(h==null?void 0:h.name)??null,topCommunityCount:(h==null?void 0:h.member_count)??0,isLoading:i.isLoading||r.isLoading}},[e,i.data,r.data,i.isLoading,r.isLoading]);return s.isLoading||s.total===0?null:D.jsxs("div",{className:"mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3",children:[D.jsx(Al,{icon:D.jsx(Iv,{className:"size-4 text-zaki-brand"}),value:s.newThisWeek,label:t("brain.insights.newThisWeek",{defaultValue:"new this week"}),hint:s.newThisWeek===0?t("brain.insights.newThisWeekEmpty",{defaultValue:"Quiet stretch. ZAKI's caught up."}):t("brain.insights.newThisWeekHint",{defaultValue:"memories ZAKI added recently"})}),D.jsx(Al,{icon:D.jsx(qv,{className:"size-4 text-zaki-brand"}),value:s.topCommunityCount,label:s.topCommunityName?t("brain.insights.topCommunity",{defaultValue:"memories in {{name}}",name:s.topCommunityName}):t("brain.insights.topCommunityFallback",{defaultValue:"in your largest cluster"}),hint:t("brain.insights.topCommunityHint",{defaultValue:"what you and ZAKI talk about most"})}),D.jsx(Al,{icon:D.jsx(Fv,{className:"size-4 text-zaki-brand"}),value:s.total,label:t("brain.insights.total",{defaultValue:"total memories"}),hint:t("brain.insights.totalHint",{defaultValue:"every fact, preference, and conversation"})})]})}function Al({icon:n,value:e,label:t,hint:i}){return D.jsxs("div",{className:"rounded-[2px] border border-zaki-border bg-zaki-raised p-4",children:[D.jsxs("div",{className:"flex items-baseline gap-2",children:[D.jsx("span",{className:"inline-flex size-7 shrink-0 items-center justify-center rounded-[2px] bg-zaki-brand/10",children:n}),D.jsx("div",{className:"font-mono-ui text-2xl font-bold tracking-normal text-zaki-text tabular-nums",children:e.toLocaleString()})]}),D.jsx("div",{className:"mt-1 text-sm font-medium text-zaki-text",children:t}),D.jsx("div",{className:"mt-0.5 text-xs text-zaki-muted",children:i})]})}const iP=250;function rP(n){const[e,t]=ae.useState(!1);return ae.useEffect(()=>{if(typeof window>"u"||typeof window.matchMedia!="function")return;const i=window.matchMedia(n),r=()=>t(i.matches);return r(),i.addEventListener("change",r),()=>i.removeEventListener("change",r)},[n]),e}const sP=()=>rP("(max-width: 900px)");function fP(){var be,Ee,se,Ae,de,C,w,U;const{t:n}=si(),{user:e}=Ov(),t=String((e==null?void 0:e.id)??""),[i,r]=kv(),s=(()=>{const k=i.get("tab");return k==="explore"||k==="graph"?"explore":"home"})(),a=(()=>{const k=i.get("panel");return k==="filters"||k==="clusters"||k==="orphans"?k:null})(),o=i.get("q")??"",[l,c]=ae.useState(s),[u,h]=ae.useState(!1),[f,d]=ae.useState([]),[g,v]=ae.useState(!1),[m,p]=ae.useState(o),[y,x]=ae.useState(o),_=ae.useRef(null),[S,T]=ae.useState(qR),[E,A]=ae.useState([]),[M,b]=ae.useState(a),L=sP();ae.useEffect(()=>{const k=window.setTimeout(()=>x(m),iP);return()=>window.clearTimeout(k)},[m]),ae.useEffect(()=>{const k=new URLSearchParams(i);l!=="home"?k.set("tab",l):k.delete("tab"),y?k.set("q",y):k.delete("q"),M?k.set("panel",M):k.delete("panel"),k.toString()!==i.toString()&&r(k,{replace:!0})},[l,y,M]),ae.useEffect(()=>{if(l!=="explore")return;const k=X=>{var le,fe;const Z=X.target;(le=Z==null?void 0:Z.closest)!=null&&le.call(Z,"input, textarea, [contenteditable='true']")||X.metaKey||X.ctrlKey||X.altKey||X.key==="/"&&(X.preventDefault(),(fe=_.current)==null||fe.focus())};return window.addEventListener("keydown",k),()=>window.removeEventListener("keydown",k)},[l]);const P=ae.useMemo(()=>({...S,search:y}),[S,y]),I=Bv(),F=_p(t,{max_nodes:P.maxNodes,exclude_orphans:P.excludeOrphans,link_types:P.linkTypes.length>0?P.linkTypes.join(","):void 0,semantic_min_weight:P.semanticEdgeThreshold}),G=((be=Jv(t).data)==null?void 0:be.key)??null,[$,O]=ae.useState("spatial"),[W,Y]=ae.useState(BT),[N,V]=ae.useState(1),[ee,z]=ae.useState(null),j=ae.useRef(null),ne=ae.useCallback(k=>{Y(X=>({...X,[k]:!X[k]}))},[]),J=ae.useCallback(k=>{z(k)},[]),[re,me]=ae.useState({kind:"overview"}),Se=ae.useCallback(k=>{me(k),z(null)},[]),xe=ae.useMemo(()=>{var k;return(((k=F.data)==null?void 0:k.nodes)??[]).filter(X=>f.includes(X.id))},[(Ee=F.data)==null?void 0:Ee.nodes,f]);if(!t||F.isLoading)return D.jsx(zv,{});if(F.isError)return D.jsx("div",{className:"px-6 py-16 text-center text-sm text-zaki-muted",children:n("brain.error.loadFailed")});const he=((se=F.data)==null?void 0:se.total_nodes_in_corpus)??0,Ie=((Ae=F.data)==null?void 0:Ae.semantic_degraded)??!1;if(he===0)return D.jsx(t_,{onMigrate:()=>I("/")});const B=new Map;for(const k of((de=F.data)==null?void 0:de.nodes)??[])B.set(k.id,k.id),k.key&&B.set(k.key,k.id);const Pe=k=>{const X=B.get(k)??k;c("explore"),me({kind:"all"}),z(X)};return D.jsxs("div",{className:"zaki-brain-v2",children:[D.jsx(Vv,{"aria-label":n("brain.status.ariaLabel",{defaultValue:"Brain status"}),items:[{id:"scope",label:n("brain.status.scope",{defaultValue:"Scope"}),value:n("brain.status.userScoped",{defaultValue:"Personal brain"})},{id:"nodes",label:n("brain.status.memories",{defaultValue:"Memories"}),value:he.toLocaleString(),tone:"accent"},{id:"view",label:n("brain.status.view",{defaultValue:"View"}),value:l},{id:"health",label:Ie?n("brain.status.semanticDegraded",{defaultValue:"Semantic degraded"}):n("brain.status.semanticReady",{defaultValue:"Semantic ready"}),tone:Ie?"warn":"success"}]}),D.jsxs("div",{className:"zaki-brain-v2__wrap",children:[D.jsxs("header",{className:"zaki-brain-v2__hero",children:[D.jsxs("div",{children:[D.jsx("p",{children:n("brain.status.userScoped",{defaultValue:"Personal brain"})}),D.jsx("h1",{children:n("brain.title")})]}),D.jsxs("div",{className:"zaki-brain-v2__hero-meta",children:[D.jsx("span",{children:n("brain.subtitle")}),D.jsxs(Gv,{to:"/settings#settings-memory-data",className:"zaki-brain-v2__governance-link","data-testid":"brain-manage-memory-link",children:[D.jsx(Hv,{className:"size-3.5","aria-hidden":"true"}),n("brain.governance.manageLink",{defaultValue:"Memory & privacy in Settings"})]})]})]}),Ie&&!u&&D.jsx("div",{className:"zaki-brain-v2__banner",children:D.jsx(n_,{onDismiss:()=>h(!0)})}),D.jsx(nP,{userId:t,total:he}),D.jsx(Wv,{ariaLabel:n("brain.tabs.ariaLabel",{defaultValue:"Brain views"}),value:l,onChange:c,fullWidth:!0,options:[{id:"home",label:n("brain.tabs.home",{defaultValue:"Home"})},{id:"explore",label:n("brain.tabs.explore",{defaultValue:"Explore"})}]})]}),l==="home"?D.jsx("div",{className:"zaki-brain-v2__home-slot","data-testid":"brain-home-slot",children:D.jsx(aw,{userId:t,graph:F.data,graphLoading:F.isLoading})}):D.jsxs("div",{"data-testid":"brain-graph-slot",className:"zaki-brain-v2__graph-shell",children:[D.jsxs("aside",{className:"zaki-brain-v2__filters-rail","aria-label":n("brain.panel.filters",{defaultValue:"Filters"}),children:[D.jsx(ed,{view:$,onViewChange:O,fx:W,onToggleFx:ne,depth:N,onDepthChange:V,hasFocus:ee!=null,onFit:()=>{var k;return(k=j.current)==null?void 0:k.fit()},scope:re,onScopeChange:Se}),D.jsx(gp,{filters:S,onChange:T})]}),D.jsxs("section",{className:"zaki-brain-v2__graph-main",children:[D.jsx("div",{className:"zaki-brain-v2__search",children:D.jsxs("div",{children:[D.jsx("svg",{className:"pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zaki-muted",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,"aria-hidden":"true",children:D.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"})}),D.jsx("input",{ref:_,type:"search",value:m,onChange:k=>p(k.target.value),placeholder:n("brain.graph.search.placeholder"),"aria-label":n("brain.graph.search.placeholder"),className:"v2-input pl-8 pr-8","data-testid":"brain-search-input"}),!m&&D.jsx("kbd",{className:"pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded border border-zaki-border bg-zaki-raised px-1.5 py-0.5 font-mono-ui text-[10px] font-semibold text-zaki-muted sm:inline-flex","aria-hidden":"true",children:"/"}),m&&D.jsx("button",{type:"button",onClick:()=>{var k;p(""),(k=_.current)==null||k.focus()},"aria-label":n("brain.graph.search.clear"),className:"absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zaki-muted hover:text-zaki-text",children:D.jsx("svg",{className:"size-3.5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,"aria-hidden":"true",children:D.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M6 18L18 6M6 6l12 12"})})})]})}),D.jsx("div",{className:"mb-3 flex flex-wrap items-baseline justify-between gap-3 px-1 text-xs text-zaki-muted",children:D.jsxs("div",{children:[n("brain.counterStrip.showing",{defaultValue:"Showing {{visible}} of {{total}} memories",visible:((w=(C=F.data)==null?void 0:C.nodes)==null?void 0:w.length)??0,total:he}),(()=>{var ue;const k=((ue=F.data)==null?void 0:ue.edges)??[],X=S.semanticEdgeThreshold,Z=k.filter(le=>{if(le.type!=="semantic")return!0;const fe=le.weight;return typeof fe=="number"&&fe>=X}).length;return Z===0?null:D.jsxs(D.Fragment,{children:[" · ",n("brain.counterStrip.edges",{defaultValue:"{{count}} edges",count:Z})]})})()]})}),D.jsx("div",{className:"mb-3",children:D.jsx(QR,{userId:t,onHighlightKeys:A,onPick:Pe})}),D.jsxs("div",{className:"zaki-brain-v2__canvas-frame",children:[D.jsx(ew,{ref:j,userId:t,selectedIds:f,onSelectionChange:d,filters:P,selfKey:G,highlightKeys:E,view:$,fx:W,depth:N,focusId:ee,onFocusChange:J,scope:re,onScopeChange:Se}),L&&M!=="filters"&&D.jsx("button",{type:"button",className:"zaki-brain-v2__controls-toggle",onClick:()=>b("filters"),"data-testid":"brain-controls-toggle",children:n("brain.panel.controls",{defaultValue:"Controls"})}),M==="filters"&&L&&D.jsxs(aP,{onClose:()=>b(null),children:[D.jsx(ed,{view:$,onViewChange:O,fx:W,onToggleFx:ne,depth:N,onDepthChange:V,hasFocus:ee!=null,onFit:()=>{var k;return(k=j.current)==null?void 0:k.fit()},scope:re,onScopeChange:Se}),D.jsx(gp,{filters:S,onChange:T})]})]}),f.length>=2&&!g?D.jsx("button",{type:"button",onClick:()=>{v(!0),b(null)},className:"zaki-brain-v2__compose","data-testid":"brain-compose-from-selection-button",children:n("brain.compose.fromSelection",{count:f.length,defaultValue:"Compose from {{count}}"})}):null,D.jsx(XR,{userId:t,open:g,selectedNodes:xe,onClose:()=>{v(!1),d([])}}),S.colorPreset!=="mono"?D.jsx("div",{className:"zaki-brain-v2__legend-row",children:D.jsx(cP,{colorPreset:S.colorPreset,nodes:((U=F.data)==null?void 0:U.nodes)??[]})}):null]})]})]})}function aP({onClose:n,children:e}){const{t}=si();return D.jsxs("div",{className:"absolute inset-x-3 bottom-3 z-20 flex max-h-[70%] flex-col sm:inset-x-auto sm:right-3 sm:top-14 sm:max-h-[calc(100%-4.5rem)]",children:[D.jsx("button",{type:"button",onClick:n,"aria-label":t("brain.panel.close",{defaultValue:"Close panel"}),className:"absolute right-2 top-2 z-30 flex size-6 items-center justify-center rounded-[2px] bg-black/40 text-white/60 transition-colors hover:bg-black/60 hover:text-white",children:D.jsx(xp,{className:"size-3"})}),D.jsx("div",{className:"flex h-full min-h-0 overflow-hidden",children:e})]})}const oP=/\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i;function lP(n,e){if(n==="kind"){const t={};for(const i of e){const r=String(i.kind||"");r&&(t[r]=(t[r]||0)+1)}return["core","daily","conversation"].filter(i=>(t[i]??0)>0).map(i=>({key:i,color:bp[i]??"#6b7280",label:Yc[i]??i,count:t[i]}))}if(n==="recency"){const t=Date.now(),i={week:0,month:0,older:0};for(const r of e)typeof r.created_at=="number"&&i[Tp(r.created_at,t)]++;return["week","month","older"].filter(r=>i[r]>0).map(r=>({key:r,color:Mp[r],label:s_[r],count:i[r]}))}if(n==="status"){let t=0,i=0;for(const s of e)s.valid_to!=null?i++:t++;const r=[];return t&&r.push({key:"live",color:Ba.live,label:ih.live,count:t}),i&&r.push({key:"archived",color:Ba.archived,label:ih.archived,count:i}),r}if(n==="community"){const t=new Map;for(const r of e){const s=r.community_id;if(s==null)continue;const a=t.get(s)??{name:r.community_name||"",count:0};a.count++,r.community_name&&(a.name=r.community_name),t.set(s,a)}const i=r=>!r||/^Cluster \d+$/.test(r)||oP.test(r);return[...t.entries()].filter(([,r])=>!i(r.name)).sort((r,s)=>s[1].count-r[1].count).slice(0,8).map(([r,s])=>({key:String(r),color:no(r),label:s.name,count:s.count}))}return[]}function cP({colorPreset:n,nodes:e}){const t=lP(n,e);return t.length===0?null:D.jsx("div",{className:"flex flex-wrap items-center gap-2","data-testid":"brain-color-legend",children:t.map(i=>D.jsxs("span",{className:"inline-flex items-center gap-1.5 rounded-[2px] border border-zaki-border bg-zaki-raised/60 px-2 py-0.5",children:[D.jsx("span",{className:"size-2 rounded-[1px]",style:{backgroundColor:i.color},"aria-hidden":"true"}),D.jsx("span",{className:"max-w-[140px] truncate text-zaki-text",title:i.label,children:i.label}),D.jsx("span",{className:"font-mono-ui text-zaki-muted",children:i.count})]},i.key))})}export{fP as BrainPage};
