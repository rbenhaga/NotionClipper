#!/bin/bash

# Setup Supabase Environment Variables for Edge Functions
# This script helps you configure all required secrets for your Edge Functions

echo "🔧 Supabase Edge Functions - Environment Setup"
echo "================================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase."
    echo "Run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Get current secrets
echo "📋 Current secrets:"
supabase secrets list
echo ""

# Prompt for required secrets
echo "🔐 Let's set up your secrets..."
echo ""

read -p "Enter your SUPABASE_SERVICE_ROLE_KEY (from Dashboard → Settings → API): " SERVICE_ROLE_KEY
if [ -n "$SERVICE_ROLE_KEY" ]; then
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
    echo "✅ SUPABASE_SERVICE_ROLE_KEY set"
fi

read -p "Enter your SUPABASE_URL (e.g., https://xxx.supabase.co): " SUPABASE_URL
if [ -n "$SUPABASE_URL" ]; then
    supabase secrets set SUPABASE_URL="$SUPABASE_URL"
    echo "✅ SUPABASE_URL set"
fi

read -p "Enter your TOKEN_ENCRYPTION_KEY (32-byte base64 string): " TOKEN_ENCRYPTION_KEY
if [ -n "$TOKEN_ENCRYPTION_KEY" ]; then
    supabase secrets set TOKEN_ENCRYPTION_KEY="$TOKEN_ENCRYPTION_KEY"
    echo "✅ TOKEN_ENCRYPTION_KEY set"
fi

echo ""
echo "🎉 Basic secrets configured!"
echo ""
echo "📋 Updated secrets list:"
supabase secrets list
echo ""
echo "🚀 Next steps:"
echo "1. Deploy your Edge Functions: supabase functions deploy"
echo "2. Test your OAuth flow"
echo "3. Check Edge Function logs if issues persist"
