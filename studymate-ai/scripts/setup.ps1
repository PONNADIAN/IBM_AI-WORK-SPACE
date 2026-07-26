# AI Workspace — Quick Setup Script (Windows PowerShell)
# Run: .\scripts\setup.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AI Workspace — Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Python
Write-Host "[1/5] Checking Python..." -ForegroundColor Yellow
python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found. Install from python.org" -ForegroundColor Red
    exit 1
}

# Step 2: Create virtual environment
Write-Host "[2/5] Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv
.\venv\Scripts\Activate.ps1
Write-Host "✅ Virtual environment activated" -ForegroundColor Green

# Step 3: Install backend dependencies
Write-Host "[3/5] Installing backend dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

# Step 4: Create .env file if it doesn't exist
Write-Host "[4/5] Setting up .env file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created from example" -ForegroundColor Green
    Write-Host "   ⚠️  Please add your OPENAI_API_KEY to .env" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env already exists" -ForegroundColor Green
}

# Step 5: Install frontend dependencies
Write-Host "[5/5] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend_new
npm install
Set-Location ..
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the app:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor Cyan
Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "    uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "    cd frontend_new" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Open: http://localhost:5173" -ForegroundColor Green
Write-Host ""
