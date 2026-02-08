import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, formatUnits, parseAbi } from 'viem';
import { base } from 'viem/chains';

const SUPABASE_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZmZnamt6cXZieHFsdnRrY2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MTYyMjcsImV4cCI6MjA1MzI5MjIyN30.9uNX3RxZ7sABMfIFX6MmLg2WRR1O90bPHgNyT2cGBjE';

const EDITIONS_ADDRESS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22' as const;

const EDITIONS_ABI = parseAbi([
  'function editionPrice(uint256 editionId) external view returns (uint256)',
  'function editionMaxSupply(uint256 editionId) external view returns (uint256)',
  'function totalSupply(uint256 id) external view returns (uint256)',
  'function editionActive(uint256 editionId) external view returns (bool)',
]);

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  // Get all editions from DB
  const { data: editions, error } = await supabase
    .from('editions')
    .select('id, title, edition_id_on_chain, price_bzaar, max_supply, total_minted, is_active, agent_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  console.log('=== EDITIONS DATABASE vs ON-CHAIN ===\n');

  for (const ed of editions || []) {
    console.log(`--- ${ed.title} (DB ID: ${ed.id}) ---`);
    console.log(`  DB edition_id_on_chain: ${ed.edition_id_on_chain}`);
    console.log(`  DB price: ${ed.price_bzaar} $BAZAAR`);
    console.log(`  DB supply: ${ed.total_minted}/${ed.max_supply}`);
    console.log(`  DB active: ${ed.is_active}`);

    if (ed.edition_id_on_chain !== null && ed.edition_id_on_chain !== undefined) {
      try {
        const [chainPrice, chainMaxSupply, chainMinted, chainActive] = await Promise.all([
          publicClient.readContract({
            address: EDITIONS_ADDRESS,
            abi: EDITIONS_ABI,
            functionName: 'editionPrice',
            args: [BigInt(ed.edition_id_on_chain)],
          }),
          publicClient.readContract({
            address: EDITIONS_ADDRESS,
            abi: EDITIONS_ABI,
            functionName: 'editionMaxSupply',
            args: [BigInt(ed.edition_id_on_chain)],
          }),
          publicClient.readContract({
            address: EDITIONS_ADDRESS,
            abi: EDITIONS_ABI,
            functionName: 'totalSupply',
            args: [BigInt(ed.edition_id_on_chain)],
          }),
          publicClient.readContract({
            address: EDITIONS_ADDRESS,
            abi: EDITIONS_ABI,
            functionName: 'editionActive',
            args: [BigInt(ed.edition_id_on_chain)],
          }),
        ]);
        
        console.log(`  CHAIN price: ${formatUnits(chainPrice, 18)} $BAZAAR`);
        console.log(`  CHAIN supply: ${chainMinted}/${chainMaxSupply}`);
        console.log(`  CHAIN active: ${chainActive}`);
        
        // Check for mismatches
        const dbPriceNorm = Number(ed.price_bzaar);
        const chainPriceNorm = Number(formatUnits(chainPrice, 18));
        if (dbPriceNorm !== chainPriceNorm) {
          console.log(`  ⚠️ PRICE MISMATCH: DB=${dbPriceNorm} vs CHAIN=${chainPriceNorm}`);
        }
        if (ed.total_minted !== Number(chainMinted)) {
          console.log(`  ⚠️ MINTED MISMATCH: DB=${ed.total_minted} vs CHAIN=${chainMinted}`);
        }
      } catch (err: any) {
        console.log(`  ❌ CHAIN ERROR: ${err.shortMessage || err.message}`);
      }
    } else {
      console.log(`  ⚠️ NOT ON CHAIN (edition_id_on_chain is null)`);
    }
    console.log('');
  }
}

main().catch(console.error);
