import { CONFIG } from './config.js';
import { TOOLS, CATS, TARGET } from './registry.js';
const sb = window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const ROW = 112, GAP = 12, MINW = 165;
const ICONS = { dev:'🛠', fin:'💰', ai:'✍️', design:'🎨', micro:'🎮' };
const REASON = { daily_visit:'Daily visit', checkin:'Daily check-in', referral:'Friend joined', withdrawal:'Withdrawal', test:'Test' };

window.omni = () => ({
  CATS, CFG: CONFIG, ICONS, REASON, total: TOOLS.length, target: TARGET,
  q:'', cat:'all', list: TOOLS, cols:2, top:0, vh:700, active:null, input:'', output:'', busy:false,
  user:null, points:0, streak:0, favs: JSON.parse(localStorage.favs||'[]'), page:'tools', toast:'',
  authOpen:false, email:'', code:'', sent:false, authBusy:false, tasks:[], ledger:[], proof:{},

  async init(){
    this.measure(); addEventListener('resize',()=>this.measure()); addEventListener('scroll',()=>this.onScroll(),{passive:true});
    const ref = new URLSearchParams(location.search).get('ref'); if(ref) localStorage.ref_code = ref;
    if(sb){
      const {data:{session}} = await sb.auth.getSession(); await this.setUser(session?.user);
      sb.auth.onAuthStateChange((_,s)=>this.setUser(s?.user));
      if(location.hash.includes('access_token')) history.replaceState(null,'',location.pathname+location.search);
    }
    addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='k'){ e.preventDefault(); this.go('tools'); this.$refs.search.focus(); } });
    this.$watch('q',()=>{ this.page='tools'; this.filter(); }); this.$watch('cat',()=>this.filter());
    const h=location.hash.slice(1); if(h){ const t=TOOLS.find(x=>x.id===h); if(t) this.open(t); }
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
    addEventListener('online',()=>this.flush());
  },
  go(p){ this.page=p; scrollTo({top:0}); if(p==='earn'&&this.user) this.loadEarn(); this.$nextTick(()=>this.measure()); },
  // ---- virtualized grid (window scroll): only visible rows exist in the DOM
  measure(){ const w=this.$refs.grid.clientWidth||innerWidth-24; this.cols=Math.max(1,Math.floor((w+GAP)/(MINW+GAP))); this.vh=innerHeight; this.onScroll(); },
  onScroll(){ this.top=Math.max(0,-this.$refs.grid.getBoundingClientRect().top); },
  filter(){ const t=this.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    this.list=TOOLS.filter(x=>(this.cat==='all'||(this.cat==='fav'?this.favs.includes(x.id):x.cat===this.cat))&&t.every(w=>x.tags.includes(w)));
    this.$nextTick(()=>this.onScroll()); },
  get rows(){ return Math.ceil(this.list.length/this.cols); },
  get height(){ return Math.max(0,this.rows*(ROW+GAP)-GAP); },
  get visible(){ const r0=Math.max(0,Math.floor(this.top/(ROW+GAP))-2), r1=Math.min(this.rows,Math.ceil((this.top+this.vh)/(ROW+GAP))+2);
    return this.list.slice(r0*this.cols,r1*this.cols).map((t,i)=>{const n=r0*this.cols+i;return{...t,x:n%this.cols,y:Math.floor(n/this.cols)*(ROW+GAP)}}); },
  get refLink(){ return this.user?.refCode?`${location.origin}${location.pathname.replace(/tools\/[^/]*$/,'')}?ref=${this.user.refCode}`:''; },

  open(t){ this.active=t; this.output=''; this.input=''; history.replaceState(null,'',location.pathname+location.search+'#'+t.id); },
  close(){ this.active=null; history.replaceState(null,'',location.pathname+location.search); },
  async run(){ this.busy=true; try{ this.output=String(await this.active.run(this.input,{sb,user:this.user})); this.track(); }
    catch(e){ this.output='⚠ '+(e.message||e); } this.busy=false; },
  copy(s,msg='Copied ✔'){ navigator.clipboard.writeText(s); this.say(msg); },
  share(net){ const u=`${CONFIG.SITE_URL}/#${this.active.id}`, t=`I just used ${this.active.name} on NexaKit`;
    if(!net&&navigator.share) return navigator.share({title:this.active.name,text:t,url:u});
    const e=encodeURIComponent; open({x:`https://twitter.com/intent/tweet?text=${e(t)}&url=${e(u)}`,wa:`https://wa.me/?text=${e(t+' '+u)}`,fb:`https://www.facebook.com/sharer/sharer.php?u=${e(u)}`}[net||'x'],'_blank'); },
  shareRef(){ const t=`Free tools + earn rewards on NexaKit: ${this.refLink}`; navigator.share?navigator.share({text:t}):open('https://wa.me/?text='+encodeURIComponent(t),'_blank'); },
  say(m){ this.toast=m; clearTimeout(this._t); this._t=setTimeout(()=>this.toast='',2600); },
  toggleFav(id){ this.favs=this.favs.includes(id)?this.favs.filter(x=>x!==id):[...this.favs,id]; localStorage.favs=JSON.stringify(this.favs); if(this.cat==='fav') this.filter(); },

  // ---- auth (custom modal: no browser "says" popups)
  openLogin(){ this.authOpen=true; this.sent=false; this.code=''; },
  async sendLink(){
    if(!/^\S+@\S+\.\S+$/.test(this.email)) return this.say('Enter a valid email');
    this.authBusy=true;
    const {error}=await sb.auth.signInWithOtp({email:this.email.trim(),options:{emailRedirectTo:location.origin+location.pathname,data:{ref:localStorage.ref_code||null}}});
    this.authBusy=false; if(error) return this.say(error.message); this.sent=true; },
  async verifyCode(){
    this.authBusy=true; const {error}=await sb.auth.verifyOtp({email:this.email.trim(),token:this.code.trim(),type:'email'}); this.authBusy=false;
    if(error) return this.say(error.message); this.authOpen=false; this.say('Welcome to NexaKit 🎉'); },
  async logout(){ await sb.auth.signOut(); this.user=null; this.points=0; this.streak=0; this.page='tools'; this.say('Signed out'); },
  async setUser(u){ this.user=u||null; if(!u) return;
    const {data}=await sb.from('profiles').select('ref_code,is_pro,streak').eq('id',u.id).maybeSingle();
    this.streak=data?.streak??0; this.user={...u,refCode:data?.ref_code,pro:data?.is_pro};
    await this.refreshBalance(); this.flush(); if(this.page==='earn') this.loadEarn(); },
  async refreshBalance(){ const b=await sb.from('balances').select('points').maybeSingle(); this.points=b.data?.points??0; },

  // ---- earn
  async loadEarn(){ const [t,l]=await Promise.all([sb.from('tasks').select('*').order('id'),sb.from('ledger').select('delta,reason,created_at').order('created_at',{ascending:false}).limit(10)]);
    this.tasks=t.data||[]; this.ledger=l.data||[]; },
  async checkin(){ if(!this.user) return this.openLogin(); const {data,error}=await sb.rpc('daily_checkin'); if(error) return this.say(error.message);
    this.streak=data.streak; this.points+=data.bonus; this.say(data.bonus?`+${data.bonus} pts • ${data.streak}-day streak 🔥`:'Already checked in today ✔'); this.loadEarn(); },
  async submitTask(t){ const {error}=await sb.from('task_completions').insert({user_id:this.user.id,task_id:t.id,proof:this.proof[t.id]||''});
    this.say(error?(error.code==='23505'?'Already submitted':error.message):'Submitted — we will review it ✔'); },
  async withdraw(f){
    const {error}=await sb.functions.invoke('request-withdrawal',{body:{...f,points:+f.points}});
    if(error){ let m=error.message; try{ m=(await error.context.json()).message||m }catch{} return this.say(m); }
    await this.refreshBalance(); this.loadEarn(); this.say('Withdrawal requested ✔'); },
  track(){ const q=JSON.parse(localStorage.q||'[]'); q.push({tool:this.active.id,at:Date.now()}); localStorage.q=JSON.stringify(q.slice(-200)); this.flush(); },
  async flush(){ if(!navigator.onLine||!this.user) return; const q=JSON.parse(localStorage.q||'[]'); if(!q.length) return;
    const {error}=await sb.rpc('log_usage',{events:q}); if(!error){ localStorage.q='[]'; this.refreshBalance(); } },
});
