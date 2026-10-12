export const TOOLS = []; const seen = new Set();
export const def = (cat,id,name,icon,run,hint='',tags='') => { if(seen.has(id)) return; seen.add(id);
  TOOLS.push({ id, cat, name, icon, hint, tags:(name+' '+tags+' '+cat).toLowerCase(), run }); };
export const nums = s => s.split(/[,\s]+/).filter(Boolean).map(Number);
export const rc = () => '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
export const fmt = n => (Math.abs(n)>=1e9||(n!==0&&Math.abs(n)<1e-4)) ? n.toExponential(6) : String(+n.toPrecision(10));
