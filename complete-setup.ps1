# Complete Automated Setup Script
# Nainstaluje vse potrebne pro spusteni serveru

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KOMPLETNI INSTALACE SERVERU" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# KROK 1: Kontrola Node.js a npm
# ============================================
Write-Host "KROK 1/5: Kontrola Node.js a npm..." -ForegroundColor Yellow
Write-Host ""

$nodeInstalled = $false
$npmInstalled = $false

try {
    $nodeVersion = & node --version 2>&1
    if ($nodeVersion -match "v\d+\.\d+\.\d+") {
        Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
        $nodeInstalled = $true
    }
}
catch {
    Write-Host "  Node.js: NENI NAINSTALOVANO" -ForegroundColor Red
}

try {
    $npmVersion = & npm --version 2>&1
    if ($npmVersion -match "\d+\.\d+\.\d+") {
        Write-Host "  npm: v$npmVersion" -ForegroundColor Green
        $npmInstalled = $true
    }
}
catch {
    Write-Host "  npm: NENI NAINSTALOVANO" -ForegroundColor Red
}

if (-not $nodeInstalled -or -not $npmInstalled) {
    Write-Host ""
    Write-Host "CHYBA: Node.js nebo npm nejsou nainstalovany!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Stahuji a instaluji Node.js LTS..." -ForegroundColor Yellow

    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $installerPath = "$env:TEMP\nodejs-installer.msi"

    try {
        Write-Host "  Stahuji z: $nodeUrl" -ForegroundColor Gray
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing

        Write-Host "  Spoustim instalator (toto muze trvat 1-2 minuty)..." -ForegroundColor Gray
        Start-Process msiexec.exe -ArgumentList "/i", $installerPath, "/quiet", "/norestart" -Wait

        # Obnovit PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        Write-Host "  Node.js byl nainstalovany!" -ForegroundColor Green

        # Overit instalaci
        Start-Sleep -Seconds 2
        $nodeVersion = & node --version 2>&1
        $npmVersion = & npm --version 2>&1
        Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "  npm: v$npmVersion" -ForegroundColor Green

        Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host ""
        Write-Host "KRITICKA CHYBA: Nepodarilo se nainstalovat Node.js!" -ForegroundColor Red
        Write-Host "Chyba: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Prosim nainstalujte Node.js rucne z: https://nodejs.org/" -ForegroundColor Yellow
        Read-Host "Stisknete Enter pro ukonceni"
        exit 1
    }
}

Write-Host ""

# ============================================
# KROK 2: Kontrola projektove struktury
# ============================================
Write-Host "KROK 2/5: Kontrola projektove struktury..." -ForegroundColor Yellow
Write-Host ""

Set-Location $ProjectRoot

if (-not (Test-Path "package.json")) {
    Write-Host "  CHYBA: package.json nebyl nalezen!" -ForegroundColor Red
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}
Write-Host "  package.json: OK" -ForegroundColor Green

# Kontrola adresarove struktury
$requiredDirs = @("src", "public")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "  $dir/: OK" -ForegroundColor Green
    }
    else {
        Write-Host "  $dir/: CHYBI (bude vytvoren pri buildu)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================
# KROK 3: Cisteni a priprava node_modules
# ============================================
Write-Host "KROK 3/5: Priprava node_modules..." -ForegroundColor Yellow
Write-Host ""

$nodeModulesExists = Test-Path "node_modules"
$nextExists = Test-Path "node_modules\.bin\next.cmd"

if ($nodeModulesExists) {
    if ($nextExists) {
        Write-Host "  node_modules existuje a obsahuje Next.js" -ForegroundColor Green
        Write-Host "  Chcete preinstalovat zavislosti? (a/n): " -NoNewline
        $reinstall = Read-Host

        if ($reinstall -eq "a") {
            Write-Host "  Mazu node_modules..." -ForegroundColor Yellow
            Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
            Write-Host "  node_modules vymazan" -ForegroundColor Green
        }
        else {
            Write-Host "  Ponechavam existujici node_modules" -ForegroundColor Green
            $skipInstall = $true
        }
    }
    else {
        Write-Host "  node_modules je poskozeny (chybi Next.js)" -ForegroundColor Yellow
        Write-Host "  Mazu node_modules..." -ForegroundColor Yellow
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
        Write-Host "  node_modules vymazan" -ForegroundColor Green
    }
}
else {
    Write-Host "  node_modules neexistuje" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# KROK 4: Instalace zavislosti
# ============================================
if (-not $skipInstall) {
    Write-Host "KROK 4/5: Instalace zavislosti..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Spoustim: npm install" -ForegroundColor Gray
    Write-Host "  POZOR: Toto muze trvat 3-10 minut!" -ForegroundColor Yellow
    Write-Host "  VAROVANI: Google Drive synchronizace muze instalaci zpomalit!" -ForegroundColor Yellow
    Write-Host ""

    # Nastavit npm registry pro jistotu
    & npm config set registry https://registry.npmjs.org/

    # Spustit instalaci
    $installStart = Get-Date
    & npm install --loglevel=error
    $installEnd = Get-Date
    $duration = ($installEnd - $installStart).TotalSeconds

    Write-Host ""

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Instalace dokoncena za $([math]::Round($duration, 1)) sekund" -ForegroundColor Green

        # Overit instalaci Next.js
        if (Test-Path "node_modules\.bin\next.cmd") {
            Write-Host "  Next.js: NAINSTALOVANO" -ForegroundColor Green
        }
        else {
            Write-Host "  VAROVANI: Next.js nebyl nalezen!" -ForegroundColor Red
        }
    }
    else {
        Write-Host "  CHYBA: Instalace selhala!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Mozne priciny:" -ForegroundColor Yellow
        Write-Host "  - Nedostatecne pripojeni k internetu" -ForegroundColor Gray
        Write-Host "  - Google Drive synchronizace blokuje soubory" -ForegroundColor Gray
        Write-Host "  - Nedostatecna prava" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Zkuste:" -ForegroundColor Cyan
        Write-Host "  1. Presunout projekt na lokalni disk (C:\Projects\)" -ForegroundColor White
        Write-Host "  2. Spustit: npm cache clean --force" -ForegroundColor White
        Write-Host "  3. Spustit tento script znovu" -ForegroundColor White
        Write-Host ""
        Read-Host "Stisknete Enter pro ukonceni"
        exit 1
    }
}
else {
    Write-Host "KROK 4/5: Instalace zavislosti (PRESKOCENO)" -ForegroundColor Yellow
    Write-Host "  Pouzivaji se existujici zavislosti" -ForegroundColor Green
}

Write-Host ""

# ============================================
# KROK 5: Kontrola .env.local
# ============================================
Write-Host "KROK 5/5: Kontrola konfigurace..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".env.local") {
    Write-Host "  .env.local: EXISTUJE" -ForegroundColor Green

    # Zkontrolovat obsah
    $envContent = Get-Content ".env.local" -Raw
    $requiredVars = @("FLEXI_BASE_URL", "FLEXI_COMPANY", "FLEXI_USERNAME", "FLEXI_PASSWORD")
    $missingVars = @()

    foreach ($var in $requiredVars) {
        if ($envContent -notmatch $var) {
            $missingVars += $var
        }
    }

    if ($missingVars.Count -gt 0) {
        Write-Host "  VAROVANI: Chybi promenne: $($missingVars -join ', ')" -ForegroundColor Yellow
    }
    else {
        Write-Host "  Vsechny potrebne promenne jsou nastaveny" -ForegroundColor Green
    }
}
else {
    Write-Host "  .env.local: NEEXISTUJE" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Vytvarim sablonu .env.local..." -ForegroundColor Yellow

    $envTemplate = @"
# ABRA Flexi API Configuration
# Vyplnte pristupove udaje k vasemu ABRA Flexi serveru

FLEXI_BASE_URL=https://server.com:5434
FLEXI_COMPANY=vase-spolecnost
FLEXI_USERNAME=uzivatelske-jmeno
FLEXI_PASSWORD=heslo
"@

    $envTemplate | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "  .env.local vytvoren" -ForegroundColor Green
    Write-Host ""
    Write-Host "  DULEZITE: Upravte .env.local a vyplnte spravne pristupove udaje!" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# HOTOVO
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "  INSTALACE DOKONCENA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Dalsi kroky:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Zkontrolujte .env.local a vyplnte pristupove udaje:" -ForegroundColor White
Write-Host "   notepad .env.local" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Spustte server manager:" -ForegroundColor White
Write-Host "   .\server-manager.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3. V server manageru vyberte volbu 1 (Spustit server)" -ForegroundColor White
Write-Host ""

# Test spusteni
Write-Host "Chcete zkusit spustit server ted? (a/n): " -NoNewline -ForegroundColor Yellow
$testRun = Read-Host

if ($testRun -eq "a") {
    Write-Host ""
    Write-Host "Spoustim test serveru..." -ForegroundColor Yellow
    Write-Host "Stisknete Ctrl+C pro zastaveni" -ForegroundColor Gray
    Write-Host ""

    Start-Sleep -Seconds 2

    try {
        & npm run dev
    }
    catch {
        Write-Host ""
        Write-Host "Server byl zastaven" -ForegroundColor Yellow
    }
}
else {
    Write-Host ""
    Write-Host "Pro spusteni serveru pouzijte: .\server-manager.ps1" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Stisknete Enter pro ukonceni"
}
