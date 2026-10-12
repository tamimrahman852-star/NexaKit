import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return J({ message: 'Unauthorized' }, 401);
  const { channel, account, points } = await req.json();
  if (!['bKash','Nagad','Rocket','Binance Pay'].includes(channel) || !/^[\w+\-@. ]{5,64}$/.test(account) || !Number.isInteger(+points)) return J({ message: 'Invalid input' }, 400);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('request_withdrawal', { p_user: user.id, p_channel: channel, p_account: account, p_points: +points });
  return error ? J({ message: error.message }, 400) : J({ id: data });
});
