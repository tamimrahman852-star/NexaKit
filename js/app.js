import { CONFIG } from './config.js';
import { TOOLS, CATS, TARGET } from './registry.js';
const sb = window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const ROW = 104, GAP = 12;

window.omni = () => ({
  CATS, CFG: CONFIG, total: TOOLS.length, target: TARGET,
  q:'', cat:'all', list: TOOLS, cols:3, top:0, vh:600, active:null, input:'', output:'', busy:false,
  user:null, points:0, streak:0, favs:JSON.parse(localStorage.favs||'[]'), page:'tools', toast:'',
  async init(){
    this.measure(); addEventListener('resize',()=>this.measure());
    const ref = new URLSearchParams(location.search).get('ref'); if(ref) localStorage.ref_code = ref;
    if(sb){ const {data:{session}} = await sb.auth.getSession(); await this.setUser(session?.user);
      sb.auth.onAuthStateChange((_,s)=>this.setUser(s?.user)); }
    addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();this.$refs.search.focus()}});
    this.$watch('q',()=>this.filter()); this.$watch('cat',()=>this.filter());
    const h=location.hash.slice(1); if(h){const t=TOOLS.find(x=>x.id===h); if(t) this.open(t);}
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
    addEventListener('online',()=>this.flush());
  },
  measure(){ const g=this.$refs.grid; this.cols=Math.max(1,Math.floor((g.clientWidth+GAP)/(260+GAP))); this.vh=g.clientHeight; },
  filter(){ const t=this.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    this.list=TOOLS.filter(x=>(this.cat==='all'||(this.cat==='fav'?this.favs.includes(x.id):x.cat===this.cat))&&t.every(w=>x.tags.includes(w)));
    this.$refs.grid.scrollTop=0; this.top=0; },
  // virtualization: only visible rows (+2 buffer) exist in the DOM
  get rows(){ return Math.ceil(this.list.length/this.cols); },
  get height(){ return this.rows*(ROW+GAP); },
  get visible(){ const r0=Math.max(0,Math.floor(this.top/(ROW+GAP))-2), r1=Math.min(this.rows,Math.ceil((this.top+this.vh)/(ROW+GAP))+2);
    return this.list.slice(r0*this.cols,r1*this.cols).map((t,i)=>{const n=r0*this.cols+i;return{...t,x:n%this.cols,y:Math.floor(n/this.cols)*(ROW+GAP)}}); },
  open(t){ this.active=t; this.output=''; this.input=''; history.replaceState(null,'','#'+t.id); },
  async run(){ this.busy=true; try{ this.output=String(await this.active.run(this.input,{sb,user:this.user})); this.track(); }
    catch(e){ this.output='⚠ '+(e.message||e); } this.busy=false; },
  copy(s,msg='Copied'){ navigator.clipboard.writeText(s); this.say(msg); },
  share(net){ const u=encodeURIComponent(`${CONFIG.SITE_URL}/#${this.active.id}`), t=encodeURIComponent(`I just used ${this.active.name} on NexaKit`);
    if(!net&&navigator.share) return navigator.share({title:this.active.name,url:decodeURIComponent(u)});
    open({x:`https://twitter.com/intent/tweet?text=${t}&url=${u}`,wa:`https://wa.me/?text=${t}%20${u}`,fb:`https://www.facebook.com/sharer/sharer.php?u=${u}`}[net||'x'],'_blank'); },
  say(m){ this.toast=m; setTimeout(()=>this.toast='',1800); },
  async checkin(){ const {data,error}=await sb.rpc('daily_checkin'); if(error) return this.say(error.message);
    this.streak=data.streak; this.points+=data.bonus; this.say(data.bonus?`+${data.bonus} pts • ${data.streak}-day streak 🔥`:'Already checked in today ✔'); },
  toggleFav(id){ this.favs=this.favs.includes(id)?this.favs.filter(x=>x!==id):[...this.favs,id]; localStorage.favs=JSON.stringify(this.favs); if(this.cat==='fav') this.filter(); },
  async login(){ const email=prompt('Email for magic link'); if(email){ await sb.auth.signInWithOtp({email,options:{data:{ref:localStorage.ref_code||null}}}); this.say('Check your inbox'); } },
  async setUser(u){ this.user=u||null; if(!u) return; const {data}=await sb.from('profiles').select('ref_code,is_pro,streak').eq('id',u.id).single();
    this.streak=data?.streak??0; this.user={...u,refCode:data?.ref_code,pro:data?.is_pro}; const b=await sb.from('balances').select('points').maybeSingle(); this.points=b.data?.points??0; this.flush(); },
  // offline-safe usage queue: events sync (and streak/daily reward fire) when back online
  track(){ const q=JSON.parse(localStorage.q||'[]'); q.push({tool:this.active.id,at:Date.now()}); localStorage.q=JSON.stringify(q.slice(-200)); this.flush(); },
  async flush(){ if(!navigator.onLine||!this.user) return; const q=JSON.parse(localStorage.q||'[]'); if(!q.length) return;
    const {error}=await sb.rpc('log_usage',{events:q}); if(!error) localStorage.q='[]'; },
  async withdraw(f){ const {error}=await sb.functions.invoke('request-withdrawal',{body:f}); this.say(error?error.message:'Request submitted'); },
});
