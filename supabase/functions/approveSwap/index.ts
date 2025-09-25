import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { StellarSDK } from './stellar-sdk';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { swap_id } = await req.json();

  // Get swap details
  const { data: swap } = await supabase.from('swaps').select('*').eq('id', swap_id).single();
  if (!swap || swap.status !== 'pending') return new Response('Invalid swap', { status: 400 });

  // Execute Stellar transfer from hot wallet
  const txHash = await StellarSDK.sendXLM(swap.user_id, swap.amount * swap.rate);

  // Update swap
  await supabase.from('swaps').update({ status: 'completed', tx_hash: txHash }).eq('id', swap_id);

  // Log transaction
  await supabase.from('transactions').insert({
    user_id: swap.user_id,
    type: 'swap',
    amount: swap.amount,
    token_code: swap.from_token,
    reference: `Swap completed → Stellar tx ${txHash}`,
  });

  return new Response(JSON.stringify({ success: true, tx_hash: txHash }), { status: 200 });
});
