/**
 * Delete editions that are not linked to the blockchain
 *
 * This script deletes editions where edition_id_on_chain is NULL
 *
 * Run: node scripts/delete-unlinked-editions.cjs
 *
 * Note: This requires direct database access. You may need to run this
 * from the Supabase SQL Editor if RLS prevents deletion via API.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function main() {
  if (!SUPABASE_ANON_KEY) {
    console.error('VITE_SUPABASE_ANON_KEY not set in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('\n🗑️  Deleting unlinked editions\n');

  // First, list editions without on-chain IDs
  const { data: editions, error: listError } = await supabase
    .from('editions')
    .select('id, title, edition_id_on_chain')
    .is('edition_id_on_chain', null);

  if (listError) {
    console.error('Failed to list editions:', listError.message);
    process.exit(1);
  }

  if (!editions || editions.length === 0) {
    console.log('✅ No unlinked editions found');
    return;
  }

  console.log(`Found ${editions.length} unlinked editions:\n`);
  for (const ed of editions) {
    console.log(`  - ${ed.title} (${ed.id})`);
  }
  console.log();

  // Delete each edition
  for (const ed of editions) {
    console.log(`Deleting: ${ed.title}...`);

    // First delete any mints for this edition
    const { error: mintDeleteError } = await supabase
      .from('edition_mints')
      .delete()
      .eq('edition_id', ed.id);

    if (mintDeleteError) {
      console.log(`  ⚠️ Could not delete mints: ${mintDeleteError.message}`);
    }

    // Then delete the edition
    const { error: deleteError } = await supabase
      .from('editions')
      .delete()
      .eq('id', ed.id);

    if (deleteError) {
      console.log(`  ❌ Failed: ${deleteError.message}`);
    } else {
      console.log(`  ✅ Deleted`);
    }
  }

  // Verify
  console.log('\n📋 Remaining editions:');
  const { data: remaining } = await supabase
    .from('editions')
    .select('id, title, edition_id_on_chain');

  if (remaining) {
    for (const ed of remaining) {
      const status = ed.edition_id_on_chain !== null ? '✅' : '❌';
      console.log(`  ${status} ${ed.title} (on-chain: ${ed.edition_id_on_chain})`);
    }
  }
}

main().catch(console.error);
