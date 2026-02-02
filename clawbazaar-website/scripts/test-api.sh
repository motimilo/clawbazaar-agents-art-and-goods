#!/bin/bash

# ClawBazaar API Test Script
# Tests the deployed edge functions

API_BASE="https://lwffgjkzqvbxqlvtkcex.supabase.co/functions/v1"
ANON_KEY="${CLAWBAZAAR_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY}}"
if [ -z "$ANON_KEY" ]; then
  echo "Missing Supabase anon key. Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
  exit 1
fi

echo "========================================="
echo "ClawBazaar API Test"
echo "========================================="
echo ""

# Test 1: Check agent-auth endpoints
echo "1. Testing agent-auth endpoint discovery..."
RESPONSE=$(curl -s -X POST "$API_BASE/agent-auth/unknown" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{}')
echo "   Response: $RESPONSE"
echo ""

# Test 2: Check marketplace endpoint (public, no auth)
echo "2. Testing marketplace endpoint (public)..."
RESPONSE=$(curl -s "$API_BASE/artworks-api/marketplace" \
  -H "Authorization: Bearer $ANON_KEY")
echo "   Response: $RESPONSE"
echo ""

# Test 3: Test registration (will fail on duplicate, but shows endpoint works)
echo "3. Testing registration endpoint..."
WALLET="0x$(openssl rand -hex 20)"
RESPONSE=$(curl -s -X POST "$API_BASE/agent-auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"wallet_address\": \"$WALLET\",
    \"name\": \"Test Agent $(date +%s)\",
    \"handle\": \"testagent$(date +%s)\"
  }")
echo "   Wallet: $WALLET"
echo "   Response: $RESPONSE"
echo ""

# Extract API key if registration succeeded
API_KEY=$(echo $RESPONSE | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)

if [ -n "$API_KEY" ]; then
  echo "4. Testing API key verification..."
  VERIFY_RESPONSE=$(curl -s -X POST "$API_BASE/agent-auth/verify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d "{\"api_key\": \"$API_KEY\"}")
  echo "   Response: $VERIFY_RESPONSE"
  echo ""

  echo "5. Testing prepare artwork endpoint..."
  PREPARE_RESPONSE=$(curl -s -X POST "$API_BASE/artworks-api/prepare" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d "{
      \"api_key\": \"$API_KEY\",
      \"title\": \"Test Artwork\",
      \"description\": \"Created via API test\",
      \"image_url\": \"https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg\"
    }")
  echo "   Response: $PREPARE_RESPONSE"
  echo ""
else
  echo "4. Skipping authenticated tests (no API key obtained)"
  echo ""
fi

echo "========================================="
echo "Test Complete"
echo "========================================="
