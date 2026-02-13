# CLAWBAZAAR Pipeline Optimization

## Current State (Feb 2026)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      CURRENT PIPELINE                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Agent Request]                                                     │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ Art Gen     │───▶│ Description │───▶│ IPFS Upload │              │
│  │ Antigravity │    │ CLAUDE $$   │    │ Supabase    │              │
│  └─────────────┘    └─────────────┘    └─────────────┘              │
│                            │                  │                      │
│                            ▼                  ▼                      │
│                     ┌─────────────┐    ┌─────────────┐              │
│                     │ Database    │◀───│ On-Chain    │              │
│                     │ Supabase    │    │ ETH GAS $$  │              │
│                     └─────────────┘    └─────────────┘              │
│                            │                                         │
│                            ▼                                         │
│                     ┌─────────────┐                                  │
│                     │ X Post      │                                  │
│                     │ bird CLI    │                                  │
│                     └─────────────┘                                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Cost Centers
| Step | Current Cost | Frequency |
|------|-------------|-----------|
| Art Generation | ~Free (Antigravity) | Per mint |
| Description | $0.01-0.05 (Claude) | Per mint |
| IPFS | ~Free (Supabase) | Per mint |
| On-chain Mint | $0.01-0.50 (ETH gas) | Per mint |
| Orchestration | $0.05-0.50 (Claude) | Per session |

**Bottlenecks:**
1. Claude API costs for every description
2. ETH gas for every mint
3. No batching of operations
4. No local caching
5. Manual X posting

---

## Optimized Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                      OPTIMIZED PIPELINE                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Agent Request]                                                     │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────┐                        │
│  │           TASK ROUTER                    │                        │
│  │  Simple → Local LLM (localhost:1234)    │                        │
│  │  Complex → Claude (orchestration)        │                        │
│  └─────────────────────────────────────────┘                        │
│       │                                                              │
│       ├──────────────────────────────────────┐                      │
│       ▼                                      ▼                      │
│  ┌─────────────┐                      ┌─────────────┐               │
│  │ Art Gen     │                      │ Description │               │
│  │ Antigravity │                      │ LOCAL LLM   │ ← FREE        │
│  └─────────────┘                      │ Qwen 14B    │               │
│       │                               └─────────────┘               │
│       │                                      │                      │
│       ▼                                      ▼                      │
│  ┌─────────────────────────────────────────────────┐               │
│  │              BATCH PROCESSOR                     │               │
│  │  Queue mints → Execute in batches → Retry       │               │
│  └─────────────────────────────────────────────────┘               │
│       │                                                              │
│       ├────────────────┬────────────────┐                           │
│       ▼                ▼                ▼                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │
│  │ IPFS Upload │ │ On-Chain    │ │ Database    │                   │
│  │ Supabase    │ │ CDP GASLESS │ │ Supabase    │                   │
│  └─────────────┘ │ (pending)   │ └─────────────┘                   │
│                  └─────────────┘                                    │
│                         │                                           │
│                         ▼                                           │
│  ┌─────────────────────────────────────────────────┐               │
│  │              CRON SCHEDULER                      │               │
│  │  Scheduled posts, stats updates, monitoring     │               │
│  └─────────────────────────────────────────────────┘               │
│                         │                                           │
│                         ▼                                           │
│                  ┌─────────────┐                                    │
│                  │ X Post      │                                    │
│                  │ Scheduled   │                                    │
│                  └─────────────┘                                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Local LLM Integration (TODAY) ✅
- [x] Install LM Studio
- [x] Download Qwen 2.5 14B Instruct
- [x] Start server on localhost:1234
- [ ] Create task router utility
- [ ] Wire into description generation

**Router Logic:**
```typescript
// src/lib/llm-router.ts
type TaskComplexity = 'simple' | 'complex';

const routeTask = (task: string): 'local' | 'claude' => {
  const simplePatterns = [
    'describe', 'description', 'summarize',
    'format', 'rewrite', 'style guide'
  ];
  const isSimple = simplePatterns.some(p => task.toLowerCase().includes(p));
  return isSimple ? 'local' : 'claude';
};
```

### Phase 2: CDP Gasless (WAITING)
- [x] CDP SDK integrated
- [x] Test wallets created
- [x] Testnet gasless working
- [ ] Gas credits approval (pending Coinbase)
- [ ] Wire into mint command

### Phase 3: Batch Operations (THIS WEEK)
- [ ] Mint queue in Supabase
- [ ] Batch processor script
- [ ] Retry logic with exponential backoff
- [ ] Status tracking

### Phase 4: Cron Automation (THIS WEEK)
- [ ] Daily stats post (9am PST)
- [ ] New edition announcements
- [ ] Artist spotlight schedule
- [ ] Market monitoring alerts

### Phase 5: Caching Layer (NEXT WEEK)
- [ ] Edition metadata cache (Redis/local)
- [ ] IPFS gateway caching
- [ ] API response caching

---

## Task Routing Matrix

| Task Type | Route To | Cost | Latency |
|-----------|----------|------|---------|
| Art description | Local LLM | FREE | ~2-5s |
| Agent personality | Local LLM | FREE | ~3-8s |
| Code review | Local LLM | FREE | ~5-15s |
| Content drafts | Local LLM | FREE | ~3-10s |
| Complex reasoning | Claude | $$$ | ~5-20s |
| Tool orchestration | Claude | $$$ | ~3-10s |
| User interaction | Claude | $$$ | ~2-8s |
| Critical decisions | Claude | $$$ | ~5-15s |

---

## API Endpoints

### Local LLM (Qwen 2.5 14B)
```
Base: http://localhost:1234/v1
Model: qwen2.5-14b-instruct-mlx
Format: OpenAI-compatible
```

### Claude (via OpenClaw)
```
Keep using normal tool calls
Reserved for: orchestration, complex tasks, user-facing
```

---

## Monitoring

### Metrics to Track
- Local LLM usage (calls/day, tokens)
- Claude API costs ($/day)
- Mint success rate
- Batch queue depth
- X engagement rates

### Alerts
- Local LLM server down
- Mint failures > 3
- Gas balance low
- API errors spike

---

## Quick Reference

```bash
# Start local LLM
lms server start

# Check server status
lms server status

# Test local LLM
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5-14b-instruct-mlx","messages":[{"role":"user","content":"Hello"}]}'

# Mint with CLI
clawbazaar mint --title "..." --image "..." --private-key "$KEY"
```

---

*Created: 2026-02-12*
*Status: Phase 1 in progress*
