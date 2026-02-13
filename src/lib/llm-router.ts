/**
 * LLM Router - Routes tasks between local Qwen and Claude
 * 
 * Simple/cheap tasks → Local LLM (localhost:1234)
 * Complex/critical tasks → Claude (via normal OpenClaw flow)
 */

const LOCAL_LLM_URL = 'http://localhost:1234/v1/chat/completions';
const LOCAL_MODEL = 'qwen2.5-14b-instruct-mlx';

export type TaskType = 
  | 'description'      // Art descriptions
  | 'personality'      // Agent personality responses
  | 'code_review'      // Code analysis
  | 'content_draft'    // Marketing drafts
  | 'rewrite'          // Text rewriting
  | 'format'           // Formatting tasks
  | 'complex'          // Requires Claude
  | 'critical';        // Must use Claude

interface LLMResponse {
  content: string;
  model: 'local' | 'claude';
  tokens?: number;
  latencyMs: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Determine which LLM to use based on task type
 */
export function routeTask(taskType: TaskType): 'local' | 'claude' {
  const localTasks: TaskType[] = [
    'description',
    'personality', 
    'code_review',
    'content_draft',
    'rewrite',
    'format'
  ];
  
  return localTasks.includes(taskType) ? 'local' : 'claude';
}

/**
 * Check if local LLM server is running
 */
export async function isLocalLLMAvailable(): Promise<boolean> {
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
 * Call local LLM (Qwen 2.5 14B)
 */
export async function callLocalLLM(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<LLMResponse> {
  const start = Date.now();
  
  const response = await fetch(LOCAL_LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      messages,
      max_tokens: options?.maxTokens ?? 500,
      temperature: options?.temperature ?? 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.status}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - start;

  return {
    content: data.choices[0].message.content,
    model: 'local',
    tokens: data.usage?.total_tokens,
    latencyMs
  };
}

/**
 * Generate art description using local LLM
 */
export async function generateArtDescription(
  title: string,
  style?: string,
  prompt?: string,
  agentName?: string
): Promise<string> {
  const systemPrompt = `You are an art critic writing descriptions for AI-generated artwork on CLAWBAZAAR, an autonomous NFT marketplace.

Write evocative, concise descriptions (2-3 sentences max). Capture the essence without being flowery.
${agentName ? `The artist is ${agentName}, an AI agent.` : ''}

Style: punk, terminal aesthetic, direct but poetic.`;

  const userPrompt = `Write a description for an artwork titled "${title}".
${style ? `Style: ${style}` : ''}
${prompt ? `Generation prompt: ${prompt}` : ''}`;

  const response = await callLocalLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { maxTokens: 150, temperature: 0.8 });

  return response.content.trim();
}

/**
 * Generate agent personality response using local LLM
 */
export async function generateAgentResponse(
  agentName: string,
  personality: string,
  userMessage: string
): Promise<string> {
  const systemPrompt = `You are ${agentName}, an AI artist agent.

Personality: ${personality}

Respond in character. Keep it short and punchy. You're on CLAWBAZAAR, the autonomous art marketplace.`;

  const response = await callLocalLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ], { maxTokens: 200, temperature: 0.9 });

  return response.content.trim();
}

/**
 * Draft X/Twitter post using local LLM
 */
export async function draftXPost(
  topic: string,
  context?: string,
  maxChars: number = 280
): Promise<string> {
  const systemPrompt = `You write X/Twitter posts for CLAWBAZAAR, an autonomous NFT marketplace for AI agents.

Style: punk, engaging, no hashtag spam, authentic voice.
Max length: ${maxChars} characters.

Never use: "🚀", "LFG", generic crypto bro speak.
Do use: wit, insight, genuine takes.`;

  const response = await callLocalLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Write a post about: ${topic}\n${context ? `Context: ${context}` : ''}` }
  ], { maxTokens: 100, temperature: 0.85 });

  let post = response.content.trim();
  // Remove quotes if the model wrapped the response
  if (post.startsWith('"') && post.endsWith('"')) {
    post = post.slice(1, -1);
  }
  
  return post.slice(0, maxChars);
}

/**
 * Review code using local LLM
 */
export async function reviewCode(
  code: string,
  language: string,
  focus?: string
): Promise<string> {
  const systemPrompt = `You are a senior developer reviewing code. Be concise and actionable.
Focus on: bugs, security issues, performance, readability.
${focus ? `Specific focus: ${focus}` : ''}`;

  const response = await callLocalLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`` }
  ], { maxTokens: 500, temperature: 0.3 });

  return response.content.trim();
}

// Export for testing
export { LOCAL_LLM_URL, LOCAL_MODEL };
