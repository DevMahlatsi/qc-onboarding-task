import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function logAttempt(email: string, ip: string | null, success: boolean) {
  const { error } = await adminClient
    .from('login_attempts')
    .insert({ email, ip_address: ip, success });
  if (error) console.error('Failed to log attempt:', error);
}

async function getLockout(email: string) {
  const { data, error } = await adminClient
    .from('account_lockouts')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) console.error('Failed to read lockout:', error);
  return data;
}

async function upsertLockout(email: string, minutes: number, type: 'short' | 'long') {
  const locked_until = new Date(Date.now() + minutes * 60_000).toISOString();
  const { error } = await adminClient
    .from('account_lockouts')
    .upsert({ email, locked_until, lockout_type: type }, { onConflict: 'email' });
  if (error) console.error('Failed to set lockout:', error);
}

async function clearLockout(email: string) {
  const { error } = await adminClient.from('account_lockouts').delete().eq('email', email);
  if (error) console.error('Failed to clear lockout:', error);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { action, email, password, first_name, last_name, phone } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (action === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name, last_name, phone } }
      });
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ data }, 200);
    }

    if (action === 'login') {
      const ip = req.headers.get('x-forwarded-for');
      const normalisedEmail = String(email).trim().toLowerCase();

      
      const lockout = await getLockout(normalisedEmail);
      if (lockout && new Date(lockout.locked_until) > new Date()) {
        const minutesRemaining = Math.ceil(
          (new Date(lockout.locked_until).getTime() - Date.now()) / 60_000
        );
        return jsonResponse({
          error: `Your account is temporarily locked. Please try again in ${minutesRemaining} minutes.`
        }, 429);
      }

      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error) {
        await logAttempt(normalisedEmail, ip, true);
        if (lockout) await clearLockout(normalisedEmail);
        return jsonResponse({ data }, 200);
      }

      
      await logAttempt(normalisedEmail, ip, false);

      if (lockout && lockout.lockout_type === 'short') {
        
        await upsertLockout(normalisedEmail, 60, 'long');
        return jsonResponse({
          error: 'Your account has been locked for 1 hour due to repeated failed attempts.'
        }, 429);
      }

      const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await adminClient
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('email', normalisedEmail)
        .eq('success', false)
        .gte('attempted_at', tenMinAgo);

      if ((count ?? 0) >= 3) {
        await upsertLockout(normalisedEmail, 10, 'short');
        return jsonResponse({
          error: 'Too many failed attempts. Your account has been locked for 10 minutes.'
        }, 429);
      }

      return jsonResponse({ error: 'Invalid email or password.' }, 401);
    }

    return jsonResponse({ error: 'Unknown action.' }, 400);

  } catch (error) {
    console.error('auth-handler error:', error);
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 400);
  }
});