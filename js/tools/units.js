import { def, fmt } from '../core.js';
const slug = s => s.replace(/\//g,'p').replace(/\W/g,'');
const G = {
 length:{m:1,km:1e3,cm:.01,mm:.001,mi:1609.344,yd:.9144,ft:.3048,in:.0254,nmi:1852,hat:.4572},
 mass:{kg:1,g:.001,mg:1e-6,tonne:1000,lb:.45359237,oz:.028349523,stone:6.35029318,tola:.011664,maund:37.3242},
 volume:{L:1,mL:.001,m3:1000,gal:3.785411784,qt:.946352946,pint:.473176473,cup:.2365882365,floz:.0295735296,tbsp:.0147867648,tsp:.00492892159},
 area:{m2:1,km2:1e6,cm2:1e-4,hectare:1e4,acre:4046.8564224,ft2:.09290304,in2:6.4516e-4,mi2:2589988.110336,katha:66.8902,bigha:1337.804,decimal:40.4686},
 speed:{'m/s':1,'km/h':1/3.6,mph:.44704,knot:.514444,'ft/s':.3048},
 data:{B:1,KB:1024,MB:1048576,GB:1073741824,TB:1099511627776,bit:.125,Kbit:128},
 time:{s:1,ms:.001,min:60,hour:3600,day:86400,week:604800,year:31557600},
};
for (const [k,t] of Object.entries(G)) for (const f in t) for (const o in t) if (f!==o)
  def('fin',`unit-${slug(f)}-to-${slug(o)}`,`${f} to ${o} Converter`,'⇄',s=>{const v=parseFloat(s||1); return isNaN(v)?'Enter a number':`${v} ${f} = ${fmt(v*t[f]/t[o])} ${o}`},'Enter value',`${k} unit convert ${f} ${o}`);
const toK={C:v=>v+273.15,F:v=>(v-32)*5/9+273.15,K:v=>v}, fromK={C:k=>k-273.15,F:k=>(k-273.15)*9/5+32,K:k=>k};
for (const f of 'CFK') for (const o of 'CFK') if (f!==o)
  def('fin',`temp-${f}-to-${o}`,`°${f} to °${o}`,'🌡',s=>{const v=parseFloat(s||0);return `${v}°${f} = ${fmt(fromK[o](toK[f](v)))}°${o}`},'Temperature','temperature convert');
// Live currency pairs vs BDT (cached for offline)
const rates = async b => { try { const d=await (await fetch('https://open.er-api.com/v6/latest/'+b)).json(); localStorage['fx_'+b]=JSON.stringify(d); return d; } catch { return JSON.parse(localStorage['fx_'+b]||'null'); } };
for (const c of ['USD','EUR','GBP','SAR','AED','INR','MYR','SGD','CAD','AUD','JPY','CNY','KWD','QAR']) for (const [a,b] of [[c,'BDT'],['BDT',c]])
  def('fin',`fx-${a}-to-${b}`.toLowerCase(),`${a} to ${b} (Live)`,'💱',async s=>{const v=parseFloat(s||1);const d=await rates(a);return d?`${v} ${a} = ${(v*d.rates[b]).toFixed(2)} ${b}\nLive rate; last rate is cached for offline`:'Offline and no cached rate yet'},'Amount',`currency exchange rate taka ${a} ${b}`);
