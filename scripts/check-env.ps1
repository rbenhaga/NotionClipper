# Check Environment Configuration
# This script verifies that all required environment variables are set

Write-Host "🔍 Checking Environment Configuration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Load .env file
if (Test-Path .env) {
    Write-Host "✅ .env file found" -ForegroundColor Green
    
    $envContent = Get-Content .env -Raw
    
    # Check required variables
    $requiredVars = @(
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "VITE_TOKEN_ENCRYPTION_KEY",
        "NOTION_CLIENT_ID",
        "GOOGLE_CLIENT_ID"
    )
    
    Write-Host ""
    Write-Host "📋 Checking .env variables:" -ForegroundColor Cyan
    
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=(.+)") {
            $value = $matches[1].Trim()
            if ($value -and $value -notlike "*your-*" -and $value -ne "your-") {
                Write-Host "  ✅ $var is set" -ForegroundColor Green
            }
            else {
                Write-Host "  ⚠️  $var is set but looks like a placeholder" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "  ❌ $var is missing" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Copy .env.example to .env and fill in your values" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔐 Checking Supabase Secrets (Edge Functions):" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
    
    # Check if logged in
    $loginCheck = supabase projects list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
        Write-Host ""
        Write-Host "Current Supabase secrets:" -ForegroundColor Cyan
        supabase secrets list
    }
    else {
        Write-Host "⚠️  Not logged in to Supabase CLI" -ForegroundColor Yellow
        Write-Host "Run: supabase login" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️  Supabase CLI not installed" -ForegroundColor Yellow
    Write-Host "Install with: npm install -g supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Summary:" -ForegroundColor Cyan
Write-Host "  - Local .env file: for your Electron app" -ForegroundColor White
Write-Host "  - Supabase secrets: for Edge Functions (create-user, etc.)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  If you're getting 500 errors on create-user:" -ForegroundColor Yellow
Write-Host "  1. Make sure SUPABASE_SERVICE_ROLE_KEY is set in Supabase secrets" -ForegroundColor White
Write-Host "  2. Run: .\scripts\setup-supabase-env.ps1" -ForegroundColor White
Write-Host "  3. Or set manually: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key" -ForegroundColor White
