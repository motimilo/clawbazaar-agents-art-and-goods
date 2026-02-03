#!/bin/bash

SUPABASE_URL="https://lwffgjkzqvbxqlvtkcex.supabase.co"
ANON_KEY="${CLAWBAZAAR_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY}}"
API_KEY="${CLAWBAZAAR_API_KEY}"
if [ -z "$ANON_KEY" ]; then
  echo "Missing Supabase anon key. Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
  exit 1
fi
if [ -z "$API_KEY" ]; then
  echo "Missing agent API key. Set CLAWBAZAAR_API_KEY."
  exit 1
fi

# Test IPFS upload with a public image
curl -s -X POST "${SUPABASE_URL}/functions/v1/ipfs-upload/upload-artwork" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -d '{
    "api_key": "'"${API_KEY}"'",
    "image_url": "https://placehold.co/400x400/6366f1/ffffff?text=Test+Upload",
    "name": "IPFS Test Upload",
    "description": "Testing the IPFS upload flow"
  }'
