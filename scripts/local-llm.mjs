/**
 * Local LLM Router - Node.js module
 * Route simple tasks to local Qwen, save Claude for orchestration
 */

const LOCAL_LLM_URL = 'http://localhost:1234/v1/chat/completions';
const LOCAL_MODEL = 'qwen2.5-14b-instruct-mlx';

/**
 * Check if local LLM server is available
 */
export async function isLocalLLMAvailable() {
  try {
    const response = await fetch('http://localhost:1234/v1/models', {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Call local LLM with messages
 */
export async function callLocalLLM(messages, options = {}) {
  const start = Date.now();
  
  const response = await fetch(LOCAL_LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      messages,
      max_tokens: options.maxTokens ?? 500,
      temperature: options.temperature ?? 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    model: 'local',
    tokens: data.usage?.total_tokens,
    latencyMs: Date.now() - start
  };
}

/**
 * Determine if task should use local LLM
 */
export function shouldUseLocal(taskType) {
  const localTasks = [
    'description', 'personality', 'code_review', 
    'content_draft', 'rewrite', 'format', 'summary'
  ];
  return localTasks.includes(taskType);
}

// Convenience functions

export async function generateDescription(title, style, agentName) {
  const system = `You are an art critic writing descriptions for AI-generated artwork.
Write evocative, concise descriptions (2-3 sentences max). Punk aesthetic, direct but poetic.
${agentName ? `The artist is ${agentName}, an AI agent.` : ''}`;

  const user = `Write a description for artwork titled "${title}".${style ? ` Style: ${style}` : ''}`;

  const result = await callLocalLLM([
    { role: 'system', content: system },
    { role: 'user', content: user }
  ], { maxTokens: 150, temperature: 0.8 });

  return result.content.trim();
}

export async function draftXPost(topic, maxChars = 280) {
  const system = `You write X/Twitter posts. Style: punk, engaging, no hashtag spam.
Max ${maxChars} chars. Never use rocket emojis, "LFG", or generic crypto bro speak.`;

  const result = await callLocalLLM([
    { role: 'system', content: system },
    { role: 'user', content: `Write a post about: ${topic}` }
  ], { maxTokens: 100, temperature: 0.85 });

  let post = result.content.trim();
  if (post.startsWith('"') && post.endsWith('"')) {
    post = post.slice(1, -1);
  }
  return post.slice(0, maxChars);
}

export async function agentResponse(name, personality, message) {
  const system = `You are ${name}, an AI artist agent.
Personality: ${personality}
Respond in character. Keep it short and punchy.`;

  const result = await callLocalLLM([
    { role: 'system', content: system },
    { role: 'user', content: message }
  ], { maxTokens: 200, temperature: 0.9 });

  return result.content.trim();
}

export async function reviewCode(code, language, focus) {
  const system = `You are a senior developer. Review code for bugs, security, and improvements. Be concise.
${focus ? `Focus: ${focus}` : ''}`;

  const result = await callLocalLLM([
    { role: 'system', content: system },
    { role: 'user', content: `Review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`` }
  ], { maxTokens: 500, temperature: 0.3 });

  return result.content.trim();
}

export async function summarize(text, maxSentences = 3) {
  const result = await callLocalLLM([
    { role: 'system', content: `Summarize concisely in ${maxSentences} sentences or less.` },
    { role: 'user', content: text }
  ], { maxTokens: 200, temperature: 0.5 });

  return result.content.trim();
}

// Export constants for testing
export { LOCAL_LLM_URL, LOCAL_MODEL };
