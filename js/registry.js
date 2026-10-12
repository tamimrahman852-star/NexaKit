import { TOOLS, def, nums, rc } from './core.js';
export { TOOLS };
import './tools/units.js'; import './tools/fin.js'; import './tools/text.js'; import './tools/dev.js'; import './tools/design.js'; import './tools/micro.js';
// Tool registry: each tool = {id, cat, name, icon, hint, tags, run(input,ctx) -> string|Promise<string>}
// Scale to 500 by adding def() lines or family generators. The grid is virtualized, so count doesn't affect speed.
export const CATS = { dev:'Developer & Security', fin:'Finance & Currency', ai:'AI Writing', design:'Design & Media', micro:'Micro-Task & Games' };
export const TARGET = 500;
const hex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');

// ---- A: Developer & Security
def('dev','json-format','JSON Formatter','{}',s=>JSON.stringify(JSON.parse(s),null,2),'Paste JSON','json pretty validate');
def('dev','json-min','JSON Minifier','⇢',s=>JSON.stringify(JSON.parse(s)),'Paste JSON');
def('dev','b64-enc','Base64 Encode','B64',s=>btoa(unescape(encodeURIComponent(s))));
def('dev','b64-dec','Base64 Decode','B64',s=>decodeURIComponent(escape(atob(s.trim()))));
def('dev','url-enc','URL Encode','%',encodeURIComponent);
def('dev','url-dec','URL Decode','%',decodeURIComponent);
def('dev','html-enc','HTML Entity Encode','&',s=>s.replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`));
def('dev','jwt-decode','JWT Decoder','🔑',s=>s.split('.').slice(0,2).map(p=>JSON.stringify(JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))),null,2)).join('\n\n'),'Paste JWT (decoded locally, never uploaded)');
def('dev','uuid','UUID v4 Generator','#',()=>Array.from({length:5},()=>crypto.randomUUID()).join('\n'));
def('dev','password','Password Generator','🛡',()=>Array.from({length:5},()=>[...crypto.getRandomValues(new Uint8Array(20))].map(n=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'[n%62]).join('')).join('\n'));
def('dev','regex','RegEx Tester','.*',s=>{const[l,...t]=s.split('\n');const m=l.match(/^\/(.*)\/([a-z]*)$/);if(!m)return'Line 1: /pattern/flags, then text below';return JSON.stringify([...t.join('\n').matchAll(new RegExp(m[1],m[2].includes('g')?m[2]:m[2]+'g'))].map(x=>x[0]),null,2)},'/\\d+/g then text on next lines');
for (const a of ['SHA-1','SHA-256','SHA-384','SHA-512']) // family: hash tools
  def('dev','hash-'+a.toLowerCase(),a+' Hash','#!',async s=>hex(await crypto.subtle.digest(a,new TextEncoder().encode(s))),'Text to hash');
def('dev','env-encrypt','.env Encryptor (AES-GCM)','🔒',async s=>{const[p,...r]=s.split('\n');const k=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p)),'AES-GCM',false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const c=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(r.join('\n')));return btoa(String.fromCharCode(...iv,...new Uint8Array(c)))},'Line 1 = passphrase, rest = .env contents');

// ---- B: Finance
def('fin','emi','Loan / EMI Calculator','৳',s=>{const[P,r,n]=nums(s);const i=r/1200;const e=i?P*i*(1+i)**n/((1+i)**n-1):P/n;return`EMI: ${e.toFixed(2)}\nTotal: ${(e*n).toFixed(2)}\nInterest: ${(e*n-P).toFixed(2)}`},'principal, annual %, months  e.g. 500000, 9, 60');
def('fin','vat','VAT / Tax Calculator','%',s=>{const[a,r]=nums(s);return`VAT: ${(a*r/100).toFixed(2)}\nGross: ${(a*(1+r/100)).toFixed(2)}\nNet from gross: ${(a/(1+r/100)).toFixed(2)}`},'amount, rate%');
def('fin','tip','Tip & Split Bill','🍽',s=>{const[b,t,p=1]=nums(s);const tot=b*(1+t/100);return`Total: ${tot.toFixed(2)}\nPer person: ${(tot/p).toFixed(2)}`},'bill, tip%, people');
def('fin','fx','Currency Converter','💱',async s=>{const[a,f,t]=s.trim().split(/[\s,]+/);let d;try{d=await (await fetch(`https://open.er-api.com/v6/latest/${f.toUpperCase()}`)).json();localStorage.fx_=JSON.stringify(d)}catch{d=JSON.parse(localStorage.fx_||'null');if(!d)return'Offline and no cached rates'}return`${a} ${f.toUpperCase()} = ${(a*d.rates[t.toUpperCase()]).toFixed(2)} ${t.toUpperCase()}`},'100 USD BDT');
// Family generator: one table -> N tools

// ---- C: AI suite — always via rate-limited Edge Function 'ai-proxy' (never ship model keys to the client)
const AI=(id,name,icon,sys)=>def('ai',id,name,icon,async(s,{sb})=>{const{data,error}=await sb.functions.invoke('ai-proxy',{body:{task:id,system:sys,input:s}});if(error){let m=error.message;try{m=(await error.context.json()).message||m}catch{}throw new Error(m)}return data.text},'Paste text','ai '+sys);
AI('summarize','Text Summarizer','✂','Summarize concisely.');
AI('email','Professional Email Writer','✉','Write a professional email.');
AI('grammar','Grammar Fixer','✓','Fix grammar, keep meaning.');
AI('resume','Resume Bullet Optimizer','📄','Rewrite as impact-driven resume bullets.');
AI('headline','Headline Generator','📰','Give 10 headlines.');
AI('refactor','Code Refactorer','🧹','Refactor this code; explain changes.');
for(const l of ['Bangla','Hindi','Arabic','Spanish','French','German','Chinese','Japanese']) AI('tr-'+l.toLowerCase(),'Translate → '+l,'🌐','Translate to '+l+'. Output translation only.');

// ---- D: Design
def('design','shadow','CSS Box-Shadow','▣',s=>{const[x=0,y=8,b=24,c=0.25]=nums(s);return`box-shadow: ${x}px ${y}px ${b}px rgba(0,0,0,${c});`},'x, y, blur, opacity');
def('design','gradient','Random Gradient','🌈',()=>`background: linear-gradient(135deg, ${rc()}, ${rc()});`);
def('design','palette','Random Color Palette','🎨',()=>Array.from({length:5},rc).join('\n'));
def('design','radius','Border-Radius Builder','◜',s=>`border-radius: ${nums(s).map(n=>n+'px').join(' ')};`,'1-4 px values');

// ---- E: Micro-task / utility
def('micro','refcode','Referral Link Generator','🔗',(_,{user})=>user?`${location.origin}${location.pathname}?ref=${user.refCode}`:'Sign in to get your referral link');
def('micro','pomodoro-plan','Pomodoro Planner','⏱',s=>Array.from({length:+s||4},(_,i)=>`#${i+1}: 25 focus + ${(i+1)%4?5:20} break`).join('\n'),'number of sessions');

// Heavy tools (QR, PDF, image compression) load on demand via dynamic import
export const LAZY = { qr:()=>import('./tools/qr.js'), pdf:()=>import('./tools/pdf.js') };
