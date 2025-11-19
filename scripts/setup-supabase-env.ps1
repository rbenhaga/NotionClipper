# Setup Supabase Environment Variables for Edge Functions (PowerShell)
# This script helps you configure all required secrets for your Edge Functions

Write-Host "🔧 Supabase Edge Functions - Environment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI is not installed." -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase." -ForegroundColor Red
    Write-Host "Run: supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Get current secrets
Write-Host "📋 Current secrets:" -ForegroundColor Cyan
supabase secrets list
Write-Host ""

# Prompt for required secrets
Write-Host "🔐 Let's set up your secrets..." -ForegroundColor Cyan
Write-Host ""

$SERVICE_ROLE_KEY = Read-Host "Enter your SUPABASE_SERVICE_ROLE_KEY (from Dashboard → Settings → API)"
if ($SERVICE_ROLE_KEY) {
    supabase secrets set "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
    Write-Host "✅ SUPABASE_SERVICE_ROLE_KEY set" -ForegroundColor Green
}

$SUPABASE_URL = Read-Host "Enter your SUPABASE_URL (e.g., https://xxx.supabase.co)"
if ($SUPABASE_URL) {
    supabase secrets set "SUPABASE_URL=$SUPABASE_URL"
    Write-Host "✅ SUPABASE_URL set" -ForegroundColor Green
}

$TOKEN_ENCRYPTION_KEY = Read-Host "Enter your TOKEN_ENCRYPTION_KEY (32-byte base64 string)"
if ($TOKEN_ENCRYPTION_KEY) {
    supabase secrets set "TOKEN_ENCRYPTION_KEY=$TOKEN_ENCRYPTION_KEY"
    Write-Host "✅ TOKEN_ENCRYPTION_KEY set" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Basic secrets configured!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Updated secrets list:" -ForegroundColor Cyan
supabase secrets list
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy your Edge Functions: supabase functions deploy" -ForegroundColor Yellow
Write-Host "2. Test your OAuth flow" -ForegroundColor Yellow
Write-Host "3. Check Edge Function logs if issues persist" -ForegroundColor Yellow
