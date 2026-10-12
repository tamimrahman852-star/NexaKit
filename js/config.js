export const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY', // safe to expose; RLS protects data
  SITE_URL: 'https://nexakit.app',
  CREATOR: { name: 'Tamim Rahman', number: '01762324527' },
  PAYOUT_CHANNELS: ['bKash', 'Nagad', 'Rocket', 'Binance Pay'],
  MIN_WITHDRAW: 500, // points; enforced server-side too
};
