import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const SYS: Record<string,string> = { summarize:'Summarize concisely.', email:'Write a professional email.', grammar:'Fix grammar, keep meaning. Output text only.',
  resume:'Rewrite as impact-driven resume bullets.', headline:'Give 10 headlines.', refactor:'Refactor this code and briefly explain changes.' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return J({ message: 'Sign in to use AI tools' }, 401);
  const { task, input } = await req.json();
  const system = SYS[task] ?? (String(task).startsWith('tr-') ? `Translate to ${String(task).slice(3)}. Output translation only.` : null);
  if (!system || typeof input !== 'string' || !input.trim() || input.length > 6000) return J({ message: 'Invalid request' }, 400);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: prof } = await admin.from('profiles').select('is_pro').eq('id', user.id).single();
  const limit = prof?.is_pro ? 200 : 5;                              // Free: 5/day, Pro: 200/day
  const { data: ok } = await admin.rpc('ai_quota', { p_user: user.id, p_limit: limit });
  if (!ok) return J({ message: `Daily AI limit (${limit}) reached. Upgrade to Pro for more.` }, 429);
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 800, system, messages: [{ role: 'user', content: input }] }) });
  const j = await r.json();
  return J({ text: j.content?.[0]?.text ?? '' });
});
