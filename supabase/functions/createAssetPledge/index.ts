import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { StellarSDK } from './stellar-sdk'; // pseudocode import

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { user_id, asset_type, description, value } = await req.json();

  // 1. Verify KYC
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .single();
  if (!profile || profile.kyc_status !== 'approved') return new Response('KYC not approved', { status: 403 });

  // 2. Insert asset
  const { data: asset } = await supabase
    .from('assets')
    .insert({
      owner_id: profile.id,
      asset_type,
      description,
      original_value: value,
      discounted_value: value * 0.7,
      status: 'pledged',
    })
    .select()
    .single();

  // 3. Mint PLAT on Stellar
  const stellarTxHash = await StellarSDK.mintPLAT(asset.id, value * 0.7);

  // 4. Insert token record
  await supabase.from('tokens').insert({
    asset_id: asset.id,
    token_code: 'PLAT',
    issuer: Deno.env.get('PLAT_TOKEN_ISSUER'),
    amount: value * 0.7,
    tx_hash: stellarTxHash,
    created_by: profile.id,
  });

  // 5. Insert transaction log
  await supabase.from('transactions').insert({
    user_id: profile.id,
    type: 'pledge',
    amount: value * 0.7,
    token_code: 'PLAT',
    reference: `Asset pledge → Token minting (Stellar tx ${stellarTxHash})`,
  });

  return new Response(JSON.stringify({ success: true, asset_id: asset.id }), { status: 200 });
});
