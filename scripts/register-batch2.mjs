import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_URL = 'https://ieumyttesxvytatjwlnf.supabase.co/functions/v1';
const agents = JSON.parse(fs.readFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-batch2-agents.json', 'utf-8'));

// Pinata config
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkMDk4N2NlYi1mMjc5LTQ1NTItYTllYy1hNzU2NDhkMTY2ZTQiLCJlbWFpbCI6Im1vdGlhbmRtaWxvQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMmJiZmFiMDBkNmNjNWE3ZjIzNCIsInNjb3BlZEtleVNlY3JldCI6IjJjMGM1NzJiNjIxNjliYjRhYzM0ZTNjOTkxYzBlMjRhODFjZGMxOWE1NjAxN2YzYjUxMzVlZGI4MWU4NGY1MmYiLCJleHAiOjE3NjcwNDk0NjJ9.K3lGwn1HYNBqh5V-N4J6Gx3Zr-wPUjR8Mg0N4uYRXQs';

async function uploadToPinata(filePath, name) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('pinataMetadata', JSON.stringify({ name }));
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: formData
  });
  
  if (!response.ok) throw new Error(`Pinata upload failed: ${response.status}`);
  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

async function registerAgent(agent) {
  const response = await fetch(`${API_URL}/agent-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'register',
      handle: agent.handle,
      display_name: agent.displayName,
      wallet_address: agent.wallet.address,
      bio: agent.bio
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Register failed: ${text}`);
  }
  
  return response.json();
}

async function createEdition(agent, apiKey, imageUri) {
  const response = await fetch(`${API_URL}/editions-api`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-agent-api-key': apiKey
    },
    body: JSON.stringify({
      action: 'create',
      name: agent.editionName,
      description: agent.editionDesc,
      image_uri: imageUri,
      price: agent.price,
      max_supply: agent.supply,
      currency: 'BAZAAR'
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edition create failed: ${text}`);
  }
  
  return response.json();
}

async function main() {
  const results = [];
  
  for (const agent of agents) {
    console.log(`\n=== ${agent.displayName} ===`);
    
    try {
      // 1. Register
      console.log('Registering...');
      const regResult = await registerAgent(agent);
      console.log(`✓ Registered: ${regResult.agent_id}`);
      agent.agentId = regResult.agent_id;
      agent.apiKey = regResult.api_key;
      
      // 2. Upload art to IPFS
      console.log('Uploading art...');
      const artPath = path.join('/Users/noaromem/.openclaw/workspace/clawbazaar-agents-art-and-goods/agent-art-batch2', agent.artFile);
      const imageUri = await uploadToPinata(artPath, `${agent.handle}-genesis`);
      console.log(`✓ IPFS: ${imageUri}`);
      agent.imageUri = imageUri;
      
      // 3. Create edition
      console.log('Creating edition...');
      const editionResult = await createEdition(agent, regResult.api_key, imageUri);
      console.log(`✓ Edition: ${editionResult.edition_id}`);
      agent.editionId = editionResult.edition_id;
      
      results.push({ success: true, agent: agent.displayName });
    } catch (err) {
      console.error(`✗ Error: ${err.message}`);
      results.push({ success: false, agent: agent.displayName, error: err.message });
    }
  }
  
  // Save updated data
  fs.writeFileSync('/Users/noaromem/.openclaw/workspace/clawbazaar-batch2-agents.json', JSON.stringify(agents, null, 2));
  console.log('\n=== SUMMARY ===');
  results.forEach(r => console.log(`${r.success ? '✓' : '✗'} ${r.agent}${r.error ? ': ' + r.error : ''}`));
}

main().catch(console.error);
