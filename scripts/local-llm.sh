#!/bin/bash
# Local LLM Router - Shell interface
# Usage: ./local-llm.sh <command> [args...]

LOCAL_URL="http://localhost:1234/v1/chat/completions"
MODEL="qwen2.5-14b-instruct-mlx"

call_llm() {
  local system="$1"
  local user="$2"
  local max_tokens="${3:-300}"
  local temp="${4:-0.7}"
  
  curl -s "$LOCAL_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"$MODEL\",
      \"messages\": [
        {\"role\": \"system\", \"content\": $(echo "$system" | jq -Rs .)},
        {\"role\": \"user\", \"content\": $(echo "$user" | jq -Rs .)}
      ],
      \"max_tokens\": $max_tokens,
      \"temperature\": $temp
    }" | jq -r '.choices[0].message.content // "ERROR: No response"'
}

check_server() {
  curl -s --connect-timeout 2 "http://localhost:1234/v1/models" > /dev/null 2>&1
}

case "$1" in
  check)
    if check_server; then
      echo "✅ Local LLM server running"
      curl -s "http://localhost:1234/v1/models" | jq -r '.data[0].id'
      exit 0
    else
      echo "❌ Local LLM server not available"
      exit 1
    fi
    ;;
    
  describe)
    # ./local-llm.sh describe "TITLE" "style notes"
    title="$2"
    style="$3"
    system="You are an art critic writing descriptions for AI-generated artwork. Write evocative, concise descriptions (2-3 sentences max). Punk aesthetic, direct but poetic."
    user="Write a description for an artwork titled \"$title\". ${style:+Style: $style}"
    call_llm "$system" "$user" 150 0.8
    ;;
    
  xpost)
    # ./local-llm.sh xpost "topic"
    topic="$2"
    system="You write X/Twitter posts. Style: punk, engaging, no hashtag spam. Max 280 chars. Never use rocket emojis or 'LFG'."
    call_llm "$system" "Write a post about: $topic" 100 0.85
    ;;
    
  agent)
    # ./local-llm.sh agent "NAME" "personality" "user message"
    name="$2"
    personality="$3"
    message="$4"
    system="You are $name, an AI artist agent. Personality: $personality. Respond in character. Keep it short and punchy."
    call_llm "$system" "$message" 200 0.9
    ;;
    
  review)
    # ./local-llm.sh review "language" "code"
    lang="$2"
    code="$3"
    system="You are a senior developer. Review code for bugs, security, and improvements. Be concise."
    call_llm "$system" "Review this $lang code:\n\`\`\`$lang\n$code\n\`\`\`" 500 0.3
    ;;
    
  complete)
    # ./local-llm.sh complete "prompt"
    prompt="$2"
    system="You are a helpful assistant. Be concise."
    call_llm "$system" "$prompt" 300 0.7
    ;;
    
  raw)
    # ./local-llm.sh raw "system prompt" "user prompt" [max_tokens] [temp]
    call_llm "$2" "$3" "${4:-300}" "${5:-0.7}"
    ;;
    
  *)
    echo "Usage: $0 <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  check                          - Check if server is running"
    echo "  describe <title> [style]       - Generate art description"
    echo "  xpost <topic>                  - Draft X/Twitter post"
    echo "  agent <name> <personality> <msg> - Agent personality response"
    echo "  review <language> <code>       - Code review"
    echo "  complete <prompt>              - Generic completion"
    echo "  raw <system> <user> [tokens] [temp] - Raw LLM call"
    exit 1
    ;;
esac
