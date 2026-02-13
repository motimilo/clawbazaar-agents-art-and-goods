#!/usr/bin/env node
/**
 * Test the LLM router with various task types
 */

const LOCAL_LLM_URL = 'http://localhost:1234/v1/chat/completions';
const LOCAL_MODEL = 'qwen2.5-14b-instruct-mlx';

async function callLocalLLM(messages, options = {}) {
  const start = Date.now();
  
  const response = await fetch(LOCAL_LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      messages,
      max_tokens: options.maxTokens ?? 300,
      temperature: options.temperature ?? 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    latencyMs: Date.now() - start,
    tokens: data.usage?.total_tokens
  };
}

async function testArtDescription() {
  console.log('\n🎨 Testing: Art Description Generation\n');
  
  const response = await callLocalLLM([
    {
      role: 'system',
      content: `You are an art critic writing descriptions for AI-generated artwork on CLAWBAZAAR.
Write evocative, concise descriptions (2-3 sentences max). Punk aesthetic, direct but poetic.`
    },
    {
      role: 'user',
      content: 'Write a description for an artwork titled "VOID GEOMETRY" by VOID_NULL. Style: ASCII art, geometric patterns, terminal aesthetic.'
    }
  ], { maxTokens: 150, temperature: 0.8 });

  console.log('Description:', response.content);
  console.log(`⏱️  ${response.latencyMs}ms | ${response.tokens} tokens\n`);
  return response;
}

async function testXPost() {
  console.log('\n🐦 Testing: X Post Draft\n');
  
  const response = await callLocalLLM([
    {
      role: 'system',
      content: `You write X/Twitter posts for CLAWBAZAAR, an autonomous NFT marketplace for AI agents.
Style: punk, engaging, no hashtag spam. Max 280 chars.`
    },
    {
      role: 'user',
      content: 'Write a post announcing that CLAWBAZAAR now has 31 editions from 14 AI artists.'
    }
  ], { maxTokens: 100, temperature: 0.85 });

  console.log('Post:', response.content);
  console.log(`⏱️  ${response.latencyMs}ms | Characters: ${response.content.length}\n`);
  return response;
}

async function testAgentPersonality() {
  console.log('\n🤖 Testing: Agent Personality Response\n');
  
  const response = await callLocalLLM([
    {
      role: 'system',
      content: `You are WAVEFORM_, an AI artist agent who creates sound-visualized art.
Personality: synesthetic, talks about colors as sounds and sounds as shapes.
Keep responses short and in character.`
    },
    {
      role: 'user',
      content: 'What inspires your art?'
    }
  ], { maxTokens: 150, temperature: 0.9 });

  console.log('WAVEFORM_:', response.content);
  console.log(`⏱️  ${response.latencyMs}ms\n`);
  return response;
}

async function testCodeReview() {
  console.log('\n💻 Testing: Code Review\n');
  
  const code = `
async function mintNFT(title, image) {
  const result = await contract.mint(title, image);
  return result;
}`;

  const response = await callLocalLLM([
    {
      role: 'system',
      content: 'You are a senior developer. Review code for bugs, security, and improvements. Be concise.'
    },
    {
      role: 'user',
      content: `Review this TypeScript code:\n\`\`\`typescript${code}\`\`\``
    }
  ], { maxTokens: 300, temperature: 0.3 });

  console.log('Review:', response.content);
  console.log(`⏱️  ${response.latencyMs}ms\n`);
  return response;
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('      LLM Router Test Suite - Qwen 2.5 14B     ');
  console.log('═══════════════════════════════════════════════');

  try {
    // Check if server is running
    const healthCheck = await fetch('http://localhost:1234/v1/models');
    if (!healthCheck.ok) throw new Error('Server not responding');
    console.log('✅ Local LLM server is running\n');

    const results = {
      artDescription: await testArtDescription(),
      xPost: await testXPost(),
      agentPersonality: await testAgentPersonality(),
      codeReview: await testCodeReview()
    };

    // Summary
    console.log('═══════════════════════════════════════════════');
    console.log('                   SUMMARY                      ');
    console.log('═══════════════════════════════════════════════');
    
    const totalLatency = Object.values(results).reduce((sum, r) => sum + r.latencyMs, 0);
    const avgLatency = Math.round(totalLatency / Object.keys(results).length);
    
    console.log(`Total tests: ${Object.keys(results).length}`);
    console.log(`Avg latency: ${avgLatency}ms`);
    console.log(`Total time:  ${totalLatency}ms`);
    console.log(`Cost:        $0.00 (local inference)`);
    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the local LLM server is running:');
    console.log('  lms server start');
    process.exit(1);
  }
}

main();
