# Node.js Installer Script for Windows
# Automaticky stahne a nainstaluje Node.js LTS verzi

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Node.js Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kontrola, zda uz neni nainstalovan
$nodeVersion = & node --version 2>$null
if ($nodeVersion) {
    Write-Host "Node.js je jiz nainstalovany: $nodeVersion" -ForegroundColor Green
    $npmVersion = & npm --version 2>$null
    Write-Host "npm verze: $npmVersion" -ForegroundColor Green
    Write-Host ""
    $reinstall = Read-Host "Chcete reinstalovat? (a/n)"
    if ($reinstall -ne "a") {
        Write-Host "Instalace zrusena." -ForegroundColor Yellow
        exit
    }
}

Write-Host "Stahuji informace o nejnovejsi LTS verzi..." -ForegroundColor Yellow

# URL pro stahnuti Node.js LTS (Long Term Support)
$nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
$installerPath = "$env:TEMP\nodejs-installer.msi"

Write-Host "Stahuji Node.js v20.11.0 LTS..." -ForegroundColor Yellow
Write-Host "URL: $nodeUrl" -ForegroundColor Gray
Write-Host "Cilova cesta: $installerPath" -ForegroundColor Gray
Write-Host ""

try {
    # Stazeni instalatoru
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "Stazeni dokonceno." -ForegroundColor Green
    Write-Host ""

    # Spusteni instalatoru
    Write-Host "Spoustim instalator Node.js..." -ForegroundColor Yellow
    Write-Host "POZOR: Instalator se otevre v novem okne." -ForegroundColor Cyan
    Write-Host "Prosim dokoncete instalaci v instalatoru." -ForegroundColor Cyan
    Write-Host ""

    # Spusteni MSI instalatoru
    Start-Process msiexec.exe -ArgumentList "/i", $installerPath, "/passive", "/norestart" -Wait

    Write-Host ""
    Write-Host "Instalace dokoncena!" -ForegroundColor Green
    Write-Host ""
    Write-Host "DULEZITE: Restartujte PowerShell (nebo PC), aby se aktualizoval PATH." -ForegroundColor Yellow
    Write-Host ""

    # Cleanup
    if (Test-Path $installerPath) {
        Remove-Item $installerPath -Force
        Write-Host "Instalator byl odstranen." -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Po restartu PowerShellu overte instalaci:" -ForegroundColor Cyan
    Write-Host "  node --version" -ForegroundColor White
    Write-Host "  npm --version" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "Chyba pri instalaci: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Zkuste rucni instalaci z https://nodejs.org/" -ForegroundColor Yellow
}

Write-Host "Stisknete Enter pro ukonceni..." -ForegroundColor Gray
Read-Host
