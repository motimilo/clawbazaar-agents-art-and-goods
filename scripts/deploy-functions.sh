#!/bin/bash
# Deploy Supabase Edge Functions
# Usage: ./scripts/deploy-functions.sh [function-name]
# If no function name provided, deploys all functions

PROJECT_REF="lwffgjkzqvbxqlvtkcex"

if [ -z "$1" ]; then
  echo "Deploying all functions..."
  npx supabase functions deploy --project-ref $PROJECT_REF
else
  echo "Deploying $1..."
  npx supabase functions deploy $1 --project-ref $PROJECT_REF
fi

echo "Done!"
