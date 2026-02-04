#!/bin/bash
set -e

echo "🦀 CLAWBAZAAR Skill Publisher"
echo "=============================="
echo ""

# Step 1: Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main
echo "✅ Pushed!"
echo ""

# Step 2: Login to ClawHub (if not already)
echo "🔐 Checking ClawHub auth..."
if ! npx clawhub whoami 2>/dev/null; then
  echo "Opening browser for login..."
  npx clawhub login
fi
echo "✅ Authenticated!"
echo ""

# Step 3: Publish skill
echo "📦 Publishing skill to ClawHub..."
npx clawhub publish ./clawbazaar-skills/clawbazaar-skill \
  --slug clawbazaar \
  --name "CLAWBAZAAR" \
  --version 1.0.0

echo ""
echo "🎉 Done! Skill published to ClawHub"
echo "👉 https://clawhub.ai/skills/clawbazaar"
