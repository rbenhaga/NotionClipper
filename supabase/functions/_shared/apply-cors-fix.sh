#!/bin/bash
# Script to apply restrictive CORS to all Edge Functions
# Usage: ./apply-cors-fix.sh

set -e

FUNCTIONS_DIR="/home/user/NotionClipper/supabase/functions"
CORS_IMPORT="import { getCorsHeaders } from '../_shared/cors.ts';"

# List of functions to update (excluding get-subscription and create-checkout which are already done)
FUNCTIONS=(
  "create-portal-session"
  "get-notion-token"
  "create-user"
  "save-notion-connection"
  "webhook-stripe"
  "notion-oauth"
  "google-oauth"
)

echo "=== Applying CORS fix to Edge Functions ==="
echo ""

for func in "${FUNCTIONS[@]}"; do
  FILE="$FUNCTIONS_DIR/$func/index.ts"

  if [ ! -f "$FILE" ]; then
    echo "⚠️  Skipping $func (file not found)"
    continue
  fi

  echo "📝 Processing: $func"

  # Check if already has getCorsHeaders import
  if grep -q "getCorsHeaders" "$FILE"; then
    echo "   ✅ Already has getCorsHeaders import"
    continue
  fi

  # Step 1: Add import statement after other imports
  # Find the line with the last import statement
  LAST_IMPORT_LINE=$(grep -n "^import " "$FILE" | tail -1 | cut -d: -f1)

  if [ -z "$LAST_IMPORT_LINE" ]; then
    echo "   ⚠️  Could not find import statements, skipping"
    continue
  fi

  # Insert the getCorsHeaders import after the last import
  sed -i "${LAST_IMPORT_LINE}a\\$CORS_IMPORT" "$FILE"
  echo "   ✅ Added getCorsHeaders import"

  # Step 2: Remove old corsHeaders constant declaration
  sed -i '/^const corsHeaders = {$/,/^};$/d' "$FILE"
  echo "   ✅ Removed old corsHeaders constant"

  # Step 3: Add dynamic corsHeaders initialization in serve function
  # Find the line with "serve(async (req)" and add corsHeaders initialization after it
  sed -i '/serve(async (req)/a\  \/\/ Get CORS headers for this request\n  const corsHeaders = getCorsHeaders(req);\n' "$FILE"
  echo "   ✅ Added dynamic corsHeaders initialization"

  echo "   ✨ $func updated successfully"
  echo ""
done

echo "=== CORS fix applied to all functions ==="
echo ""
echo "Updated functions: ${FUNCTIONS[@]}"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff supabase/functions"
echo "2. Test locally if possible"
echo "3. Commit and deploy"
