# Setup Virtual Environment and Install Dependencies
# Run this script from the project root: .\scripts\setup_venv.ps1

Write-Host "🔧 Setting up Python Virtual Environment..." -ForegroundColor Cyan
Write-Host ""

# Change to server directory
$serverDir = Join-Path $PSScriptRoot ".." "apps" "server"
Push-Location $serverDir

try {
    # Check if .venv exists and remove if incomplete
    if (Test-Path ".venv") {
        if (-not (Test-Path ".venv\Scripts\python.exe")) {
            Write-Host "⚠️  Incomplete virtual environment detected. Removing..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force ".venv"
            Write-Host "Creating fresh virtual environment..." -ForegroundColor Yellow
            python -m venv .venv
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
                exit 1
            }
            Write-Host "✓ Virtual environment created" -ForegroundColor Green
        } else {
            Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
        }
    } else {
        Write-Host "Creating virtual environment..." -ForegroundColor Yellow
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
            exit 1
        }
        Write-Host "✓ Virtual environment created" -ForegroundColor Green
    }

    # Activate virtual environment
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .\.venv\Scripts\Activate.ps1

    # Upgrade pip
    Write-Host "Upgrading pip..." -ForegroundColor Yellow
    python -m pip install --upgrade pip --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to upgrade pip" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ pip upgraded" -ForegroundColor Green
    Write-Host ""

    # Install dependencies from requirements.txt
    Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
    pip install -r requirements.txt 2>&1 | Out-String | ForEach-Object {
        if ($_ -match "psycopg2|Failed building wheel|error: Microsoft Visual C\+\+") {
            Write-Host $_ -NoNewline -ForegroundColor Yellow
        } elseif ($_ -match "Successfully installed|Requirement already satisfied") {
            Write-Host $_ -NoNewline -ForegroundColor Green
        } else {
            Write-Host $_ -NoNewline
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "⚠️  Some packages failed to install." -ForegroundColor Yellow
        Write-Host "Checking if psycopg2-binary was the issue..." -ForegroundColor Yellow
        
        # Try to install core packages manually if psycopg2 failed
        $testImports = python -c "import fastapi; import pytest; print('OK')" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Core packages are missing. Please install manually:" -ForegroundColor Red
            Write-Host "   pip install fastapi pytest" -ForegroundColor Cyan
            exit 1
        } else {
            Write-Host "✓ Core packages are installed correctly" -ForegroundColor Green
            Write-Host ""
            Write-Host "Note: psycopg2-binary (PostgreSQL driver) requires C++ Build Tools." -ForegroundColor Yellow
            Write-Host "This is OK if you're using SQLite (default database)." -ForegroundColor Cyan
            Write-Host ""
            Write-Host "To install psycopg2-binary later (if needed for PostgreSQL):" -ForegroundColor Yellow
            Write-Host "  1. Install C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Cyan
            Write-Host "  2. Run: pip install psycopg2-binary" -ForegroundColor Cyan
        }
    } else {
        Write-Host ""
        Write-Host "✓ All dependencies installed successfully" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Verifying installation..." -ForegroundColor Yellow
    python -c "import fastapi; import pytest; print('✅ Core packages installed successfully')" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Core packages verified" -ForegroundColor Green
    } else {
        Write-Host "❌ Verification failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "✅ Setup complete! Virtual environment is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "To activate manually, run:" -ForegroundColor Cyan
    Write-Host "  cd apps\server" -ForegroundColor White
    Write-Host "  .\.venv\Scripts\Activate.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: If you need PostgreSQL support, install C++ Build Tools:" -ForegroundColor Yellow
    Write-Host "  https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Cyan
} finally {
    Pop-Location
}

