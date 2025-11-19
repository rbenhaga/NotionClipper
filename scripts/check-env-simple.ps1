# Simple Environment Check

Write-Host "`n🔍 Environment Check" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

# Check .env file
if (Test-Path .env) {
    Write-Host "`n✅ .env file exists" -ForegroundColor Green
    
    $env = Get-Content .env
    
    Write-Host "`n📋 Variables in .env:" -ForegroundColor Cyan
    $env | Where-Object { $_ -match "^[A-Z_]+=.+" } | ForEach-Object {
        $parts = $_ -split "=", 2
        $key = $parts[0]
        $hasValue = $parts[1] -and $parts[1] -notlike "*your-*"
        if ($hasValue) {
            Write-Host "  ✅ $key" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $key (placeholder)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "`n❌ .env file not found" -ForegroundColor Red
}

# Check Supabase CLI
Write-Host "`n🔐 Supabase CLI:" -ForegroundColor Cyan
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "  ✅ Installed" -ForegroundColor Green
    
    $projects = supabase projects list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Logged in" -ForegroundColor Green
        Write-Host "`n📋 Supabase Secrets:" -ForegroundColor Cyan
        supabase secrets list
    } else {
        Write-Host "  ⚠️  Not logged in (run: supabase login)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Not installed (run: npm install -g supabase)" -ForegroundColor Red
}

Write-Host "`n⚠️  To fix the 500 error:" -ForegroundColor Yellow
Write-Host "  1. Get your Service Role Key from Supabase Dashboard → Settings → API" -ForegroundColor White
Write-Host "  2. Run: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key-here" -ForegroundColor White
Write-Host "  3. Run: supabase functions deploy create-user" -ForegroundColor White
Write-Host ""
