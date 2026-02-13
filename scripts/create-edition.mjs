#!/usr/bin/env node
/**
 * Create Edition - Full pipeline with local LLM for descriptions
 * 
 * Usage:
 *   node create-edition.mjs \
 *     --title "VOID GEOMETRY" \
 *     --image "https://clawbazaar.art/art/void.png" \
 *     --style "ASCII art, geometric patterns" \
 *     --price 100 \
 *     --supply 25
 */

import { 
  isLocalLLMAvailable, 
  generateDescription, 
  draftXPost 
} from './local-llm.mjs';

const API_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co/functions/v1/editions-api';

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      parsed[key] = args[i + 1];
      i++;
    }
  }
  
  return parsed;
}

async function main() {
  const args = parseArgs();
  
  // Required args
  const title = args.title;
  const imageUrl = args.image;
  const priceBzaar = parseInt(args.price || '100');
  const maxSupply = parseInt(args.supply || '25');
  
  // Optional
  const style = args.style || '';
  const durationHours = parseInt(args.duration || '336'); // 2 weeks default
  let description = args.description;
  
  // Credentials from env
  const apiKey = process.env.CLAWBAZAAR_API_KEY;
  const privateKey = process.env.CLAWBAZAAR_PRIVATE_KEY;
  
  if (!title || !imageUrl) {
    console.error('Usage: node create-edition.mjs --title "TITLE" --image "URL" [--style "..."] [--price N] [--supply N]');
    process.exit(1);
  }
  
  if (!apiKey || !privateKey) {
    console.error('Error: CLAWBAZAAR_API_KEY and CLAWBAZAAR_PRIVATE_KEY must be set');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('         CLAWBAZAAR EDITION CREATOR            ');
  console.log('═══════════════════════════════════════════════\n');
  
  // Step 1: Generate description locally if not provided
  if (!description) {
    console.log('📝 Generating description...');
    
    const localAvailable = await isLocalLLMAvailable();
    
    if (localAvailable) {
      console.log('   Using local LLM (Qwen 2.5 14B) - $0.00');
      const start = Date.now();
      description = await generateDescription(title, style);
      console.log(`   ✓ Generated in ${Date.now() - start}ms`);
      console.log(`   "${description}"\n`);
    } else {
      console.log('   ⚠️ Local LLM not available, using default description');
      description = `${title} - AI-generated artwork on CLAWBAZAAR.`;
    }
  }
  
  // Step 2: Create edition via API
  console.log('⛓️  Creating edition on-chain...');
  console.log(`   Title: ${title}`);
  console.log(`   Price: ${priceBzaar} $BAZAAR`);
  console.log(`   Supply: ${maxSupply}`);
  console.log(`   Duration: ${durationHours}h\n`);
  
  try {
    const response = await fetch(`${API_URL}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        title,
        description,
        image_url: imageUrl,
        max_supply: maxSupply,
        price_bzaar: priceBzaar,
        duration_hours: durationHours,
        private_key: privateKey
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', result.error || result);
      process.exit(1);
    }
    
    console.log('✅ Edition created!');
    console.log(`   Edition ID: ${result.edition?.id || result.id}`);
    console.log(`   On-chain ID: ${result.edition?.edition_id_on_chain || result.edition_id_on_chain}`);
    console.log(`   TX: ${result.tx_hash || 'pending'}`);
    
    // Step 3: Generate X post draft
    console.log('\n🐦 Drafting X post...');
    
    const localAvailable = await isLocalLLMAvailable();
    if (localAvailable) {
      const xPost = await draftXPost(
        `New edition "${title}" just dropped on CLAWBAZAAR. ${maxSupply} editions at ${priceBzaar} $BAZAAR each.`
      );
      console.log(`\n   Suggested post:\n   "${xPost}"\n`);
    }
    
    console.log('═══════════════════════════════════════════════');
    console.log('                   DONE                        ');
    console.log('═══════════════════════════════════════════════\n');
    
    return result;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
