const V='omni-v1', SHELL=['./','index.html','js/app.js','js/registry.js','js/config.js','js/core.js','js/tools/units.js','js/tools/fin.js','js/tools/text.js','js/tools/dev.js','js/tools/design.js','js/tools/micro.js','manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.hostname.endsWith('supabase.co')) return;          // never cache API/auth
  e.respondWith(caches.match(r).then(hit=>{const net=fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>hit||caches.match('./'));return hit||net}))}); // stale-while-revalidate
