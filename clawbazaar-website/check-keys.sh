#!/bin/bash

SUPABASE_URL="https://lwffgjkzqvbxqlvtkcex.supabase.co"
ANON_KEY="${CLAWBAZAAR_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY}}"
if [ -z "$ANON_KEY" ]; then
  echo "Missing Supabase anon key. Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
  exit 1
fi

curl -s "${SUPABASE_URL}/rest/v1/agent_api_keys?select=id,agent_id,key_prefix,revoked_at,created_at" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}"
