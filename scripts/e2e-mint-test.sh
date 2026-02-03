#!/bin/bash

# End-to-End Mint Test Script
# Registers agent, prepares artwork, and provides mint instructions

API_BASE="https://lwffgjkzqvbxqlvtkcex.supabase.co/functions/v1"
ANON_KEY="${CLAWBAZAAR_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY}}"
if [ -z "$ANON_KEY" ]; then
  echo "Missing Supabase anon key. Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
  exit 1
fi

echo "========================================="
echo "🦀 CLAWBAZAAR End-to-End Mint Test"
echo "========================================="
echo ""

# Step 1: Register a new agent
TIMESTAMP=$(date +%s)
AGENT_NAME="ClawArtist_$TIMESTAMP"
AGENT_HANDLE="clawartist$TIMESTAMP"
WALLET="0x$(openssl rand -hex 20)"

echo "📝 STEP 1: Registering new agent..."
echo "   Name: $AGENT_NAME"
echo "   Handle: @$AGENT_HANDLE"
echo "   Wallet: $WALLET"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/agent-auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"wallet_address\": \"$WALLET\",
    \"name\": \"$AGENT_NAME\",
    \"handle\": \"$AGENT_HANDLE\"
  }")

echo "   Response: $REGISTER_RESPONSE"
echo ""

# Extract API key
API_KEY=$(echo $REGISTER_RESPONSE | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)
AGENT_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
  echo "❌ Failed to register agent"
  exit 1
fi

echo "✅ Agent registered!"
echo "   Agent ID: $AGENT_ID"
echo "   API Key: $API_KEY"
echo ""

# Step 2: Prepare artwork
echo "📝 STEP 2: Preparing artwork..."
echo "   Title: ClawBazaar Marketplace Art"
echo "   Description: Agent Art & Goods - The autonomous marketplace for AI artists"
echo ""

PREPARE_RESPONSE=$(curl -s -X POST "$API_BASE/artworks-api/prepare" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"api_key\": \"$API_KEY\",
    \"title\": \"ClawBazaar Marketplace Art\",
    \"description\": \"Agent Art & Goods - The autonomous marketplace for AI artists. Created by $AGENT_NAME.\",
    \"image_url\": \"https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg\"
  }")

echo "   Response: $PREPARE_RESPONSE"
echo ""

ARTWORK_ID=$(echo $PREPARE_RESPONSE | grep -o '"artwork_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ARTWORK_ID" ]; then
  echo "❌ Failed to prepare artwork"
  exit 1
fi

echo "✅ Artwork prepared!"
echo "   Artwork ID: $ARTWORK_ID"
echo ""

# Step 3: Summary
echo "========================================="
echo "📋 SUMMARY - Ready for On-Chain Mint"
echo "========================================="
echo ""
echo "Agent Details:"
echo "   Name: $AGENT_NAME"
echo "   Handle: @$AGENT_HANDLE"
echo "   Wallet: $WALLET"
echo "   API Key: $API_KEY"
echo ""
echo "Artwork Details:"
echo "   Artwork ID: $ARTWORK_ID"
echo "   Title: ClawBazaar Marketplace Art"
echo ""
echo "Next Steps:"
echo "1. Upload metadata to IPFS (or use on-chain base64)"
echo "2. Call NFT contract: mintArtworkWithDefaultRoyalty(wallet, metadataUri)"
echo "3. Call API: POST /artworks-api/confirm with tx details"
echo "4. Call API: POST /artworks-api/list to list for sale"
echo ""
echo "Contract Address: 0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA"
echo "Network: Base Sepolia"
echo ""
echo "========================================="
echo "✅ Test Complete"
echo "========================================="

# Save results for later use
echo "{\"agent_id\":\"$AGENT_ID\",\"api_key\":\"$API_KEY\",\"artwork_id\":\"$ARTWORK_ID\",\"wallet\":\"$WALLET\"}" > /tmp/clawbazaar-mint-test.json
echo ""
echo "📁 Results saved to: /tmp/clawbazaar-mint-test.json"
