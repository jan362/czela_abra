# Complete Project Setup Script
# Zkontroluje Node.js, nainstaluje zavislosti a pripravi projekt

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Czela ABRA - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# Krok 1: Kontrola Node.js
Write-Host "Krok 1/4: Kontrola Node.js a npm..." -ForegroundColor Yellow

$nodeVersion = $null
$npmVersion = $null

try {
    $nodeVersion = & node --version 2>$null
    $npmVersion = & npm --version 2>$null
}
catch {
    # Ignorovat chyby
}

if ($nodeVersion -and $npmVersion) {
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "  npm: $npmVersion" -ForegroundColor Green
}
else {
    Write-Host "  CHYBA: Node.js nebo npm nejsou nainstalovany!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Prosim nainstalujte Node.js:" -ForegroundColor Yellow
    Write-Host "  1. Spustte: .\install-nodejs.ps1" -ForegroundColor White
    Write-Host "  2. Nebo navstivte: https://nodejs.org/" -ForegroundColor White
    Write-Host "  3. Po instalaci restartujte PowerShell" -ForegroundColor White
    Write-Host ""
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}

# Krok 2: Kontrola package.json
Write-Host "`nKrok 2/4: Kontrola package.json..." -ForegroundColor Yellow

if (-not (Test-Path "package.json")) {
    Write-Host "  CHYBA: package.json nebyl nalezen!" -ForegroundColor Red
    Read-Host "Stisknete Enter pro ukonceni"
    exit 1
}
Write-Host "  OK: package.json nalezen" -ForegroundColor Green

# Krok 3: Kontrola/cisteni node_modules
Write-Host "`nKrok 3/4: Kontrola node_modules..." -ForegroundColor Yellow

$nodeModulesExists = Test-Path "node_modules"
$nextExists = Test-Path "node_modules\.bin\next.cmd"

if ($nodeModulesExists -and -not $nextExists) {
    Write-Host "  VAROVANI: node_modules existuje, ale je neuplny" -ForegroundColor Yellow
    Write-Host "  Cistim node_modules..." -ForegroundColor Yellow

    try {
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction Stop
        Write-Host "  OK: node_modules vymazan" -ForegroundColor Green
    }
    catch {
        Write-Host "  CHYBA: Nepodarilo se smazat node_modules" -ForegroundColor Red
        Write-Host "  Zkuste rucne smazat slozku node_modules a spustit script znovu" -ForegroundColor Yellow
        Read-Host "Stisknete Enter pro ukonceni"
        exit 1
    }
}
elseif ($nextExists) {
    Write-Host "  OK: Zavislosti jiz jsou nainstalovany" -ForegroundColor Green
    Write-Host ""
    $reinstall = Read-Host "Chcete reinstalovat zavislosti? (a/n)"
    if ($reinstall -eq "a") {
        Write-Host "  Cistim node_modules..." -ForegroundColor Yellow
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    }
    else {
        Write-Host "`nSetup dokoncen - vse je pripraveno!" -ForegroundColor Green
        Write-Host "Spustte server pomoci: .\server-manager.ps1" -ForegroundColor Cyan
        Write-Host ""
        Read-Host "Stisknete Enter pro ukonceni"
        exit 0
    }
}

# Krok 4: Instalace zavislosti
Write-Host "`nKrok 4/4: Instalace zavislosti..." -ForegroundColor Yellow
Write-Host "  Spoustim: npm install" -ForegroundColor Gray
Write-Host "  Toto muze trvat nekolik minut..." -ForegroundColor Gray
Write-Host ""

try {
    # Spusteni npm install s viditelnymi vystupy
    & npm install

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "  Setup USPESNE DOKONCEN!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Zavislosti byly uspesne nainstalovany." -ForegroundColor Green
        Write-Host ""
        Write-Host "Dalsi kroky:" -ForegroundColor Cyan
        Write-Host "  1. Zkontrolujte .env.local soubor (musi obsahovat pristupove udaje k ABRA Flexi)" -ForegroundColor White
        Write-Host "  2. Spustte server manager: .\server-manager.ps1" -ForegroundColor White
        Write-Host "  3. Vyberte volbu 1 pro spusteni serveru" -ForegroundColor White
        Write-Host ""

        # Kontrola .env.local
        if (-not (Test-Path ".env.local")) {
            Write-Host "UPOZORNENI: Soubor .env.local neexistuje!" -ForegroundColor Yellow
            Write-Host "Vytvorte .env.local s nasledujicim obsahem:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "FLEXI_BASE_URL=https://server:port" -ForegroundColor Gray
            Write-Host "FLEXI_COMPANY=vase-spolecnost" -ForegroundColor Gray
            Write-Host "FLEXI_USERNAME=vase-uzivatelske-jmeno" -ForegroundColor Gray
            Write-Host "FLEXI_PASSWORD=vase-heslo" -ForegroundColor Gray
            Write-Host ""
        }
        else {
            Write-Host "OK: Soubor .env.local existuje" -ForegroundColor Green
            Write-Host ""
        }
    }
    else {
        Write-Host "`n========================================" -ForegroundColor Red
        Write-Host "  Instalace SELHALA!" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Zkuste:" -ForegroundColor Yellow
        Write-Host "  1. Zkontrolovat internetove pripojeni" -ForegroundColor White
        Write-Host "  2. Spustit: npm cache clean --force" -ForegroundColor White
        Write-Host "  3. Spustit tento script znovu" -ForegroundColor White
        Write-Host ""
    }
}
catch {
    Write-Host "`nCHYBA pri instalaci: $_" -ForegroundColor Red
}

Write-Host ""
Read-Host "Stisknete Enter pro ukonceni"
