import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

serve(async (req) => {
  const { user_id, from_token, amount } = await req.json();

  // Validate token balance
  const { data: token } = await supabase
    .from('tokens')
    .select('*')
    .eq('created_by', user_id)
    .eq('token_code', from_token)
    .single();

  if (!token || token.amount < amount) return new Response('Insufficient token balance', { status: 400 });

  // Create swap request
  const { data: swap } = await supabase
    .from('swaps')
    .insert({
      user_id,
      from_token,
      to_token: 'XLM',
      amount,
      rate: 0.35,
      status: 'pending',
    })
    .select()
    .single();

  return new Response(JSON.stringify({ success: true, swap_id: swap.id }), { status: 200 });
});
